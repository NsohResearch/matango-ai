/**
 * Transaction Utilities
 * 
 * Provides transaction boundaries for critical operations to ensure
 * data consistency and atomicity.
 */

import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { logger } from "./_core/logger";

export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Execute a function within a database transaction
 * 
 * Uses MySQL's START TRANSACTION / COMMIT / ROLLBACK
 */
export async function withTransaction<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<TransactionResult<T>> {
  const db = await getDb();
  if (!db) {
    return {
      success: false,
      error: "Database not available",
    };
  }

  try {
    // Start transaction
    await db.execute(sql`START TRANSACTION`);

    logger.debug(`Transaction started: ${operationName}`);

    // Execute the operation
    const result = await operation();

    // Commit transaction
    await db.execute(sql`COMMIT`);

    logger.debug(`Transaction committed: ${operationName}`);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    // Rollback transaction on error
    try {
      await db.execute(sql`ROLLBACK`);
      logger.warn(`Transaction rolled back: ${operationName}`, {
        errorMsg: (error as Error).message,
      });
    } catch (rollbackError) {
      logger.error(`Transaction rollback failed: ${operationName}`, {
        errorMsg: (rollbackError as Error).message,
      });
    }

    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Execute multiple operations in a single transaction
 */
export async function withBatchTransaction<T>(
  operations: (() => Promise<any>)[],
  operationName: string
): Promise<TransactionResult<T[]>> {
  const db = await getDb();
  if (!db) {
    return {
      success: false,
      error: "Database not available",
    };
  }

  const results: T[] = [];

  try {
    // Start transaction
    await db.execute(sql`START TRANSACTION`);

    logger.debug(`Batch transaction started: ${operationName} (${operations.length} operations)`);

    // Execute all operations
    for (let i = 0; i < operations.length; i++) {
      const result = await operations[i]();
      results.push(result);
    }

    // Commit transaction
    await db.execute(sql`COMMIT`);

    logger.debug(`Batch transaction committed: ${operationName}`);

    return {
      success: true,
      data: results,
    };
  } catch (error) {
    // Rollback transaction on error
    try {
      await db.execute(sql`ROLLBACK`);
      logger.warn(`Batch transaction rolled back: ${operationName}`, {
        errorMsg: (error as Error).message,
        completedOperations: results.length,
      });
    } catch (rollbackError) {
      logger.error(`Batch transaction rollback failed: ${operationName}`, {
        errorMsg: (rollbackError as Error).message,
      });
    }

    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Retry an operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    operationName?: string;
  } = {}
): Promise<TransactionResult<T>> {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelayMs = options.initialDelayMs ?? 100;
  const maxDelayMs = options.maxDelayMs ?? 5000;
  const operationName = options.operationName ?? "unknown";

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs);
        logger.warn(`Operation failed, retrying: ${operationName}`, {
          attempt: attempt + 1,
          maxRetries,
          delayMs: delay,
          errorMsg: lastError.message,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  logger.error(`Operation failed after ${maxRetries} retries: ${operationName}`, {
    errorMsg: lastError?.message,
  });

  return {
    success: false,
    error: lastError?.message ?? "Unknown error",
  };
}

/**
 * Idempotency key storage for preventing duplicate operations
 */
const idempotencyCache = new Map<string, { result: any; expiresAt: number }>();

/**
 * Execute an operation with idempotency protection
 */
export async function withIdempotency<T>(
  idempotencyKey: string,
  operation: () => Promise<T>,
  ttlMs: number = 3600000 // 1 hour default
): Promise<TransactionResult<T>> {
  // Check cache
  const cached = idempotencyCache.get(idempotencyKey);
  if (cached && cached.expiresAt > Date.now()) {
    logger.debug(`Idempotency cache hit: ${idempotencyKey}`);
    return {
      success: true,
      data: cached.result,
    };
  }

  try {
    const result = await operation();

    // Store in cache
    idempotencyCache.set(idempotencyKey, {
      result,
      expiresAt: Date.now() + ttlMs,
    });

    // Cleanup expired entries periodically
    if (idempotencyCache.size > 1000) {
      const now = Date.now();
      const keysToDelete: string[] = [];
      idempotencyCache.forEach((value, key) => {
        if (value.expiresAt < now) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach((key) => idempotencyCache.delete(key));
    }

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

// ============================================================================
// Critical Operation Wrappers
// ============================================================================

/**
 * Campaign generation with transaction boundary
 */
export async function transactionalCampaignGeneration(
  campaignId: number,
  generateAssets: () => Promise<{ assetIds: number[] }>
): Promise<TransactionResult<{ assetIds: number[] }>> {
  return withTransaction(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Lock the campaign row
    await db.execute(
      sql`SELECT id FROM unified_campaigns WHERE id = ${campaignId} FOR UPDATE`
    );

    // Generate assets
    const result = await generateAssets();

    // Update campaign status
    await db.execute(
      sql`UPDATE unified_campaigns SET 
          status = 'completed',
          updatedAt = NOW()
          WHERE id = ${campaignId}`
    );

    return result;
  }, `campaign_generation_${campaignId}`);
}

/**
 * A/B test winner declaration with transaction boundary
 */
export async function transactionalDeclareWinner(
  testId: number,
  winningVariantId: number,
  updateVariants: () => Promise<void>
): Promise<TransactionResult<void>> {
  return withTransaction(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Lock the test row
    await db.execute(
      sql`SELECT id FROM ab_tests WHERE id = ${testId} FOR UPDATE`
    );

    // Update variants
    await updateVariants();

    // Update test status
    await db.execute(
      sql`UPDATE ab_tests SET 
          status = 'completed',
          winningVariantId = ${winningVariantId},
          completedAt = NOW(),
          updatedAt = NOW()
          WHERE id = ${testId}`
    );
  }, `ab_test_winner_${testId}`);
}

/**
 * Stripe webhook processing with idempotency
 */
export async function transactionalStripeWebhook(
  eventId: string,
  processEvent: () => Promise<void>
): Promise<TransactionResult<void>> {
  return withIdempotency(
    `stripe_webhook_${eventId}`,
    async () => {
      return withTransaction(async () => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Check if event already processed
        const existingResult = await db.execute(
          sql`SELECT id FROM stripe_webhook_logs WHERE eventId = ${eventId}`
        );
        const existing = (existingResult as any)[0]?.[0];

        if (existing) {
          logger.debug(`Stripe webhook already processed: ${eventId}`);
          return;
        }

        // Process the event
        await processEvent();

        // Mark as processed
        await db.execute(
          sql`UPDATE stripe_webhook_logs SET 
              status = 'processed',
              processedAt = NOW()
              WHERE eventId = ${eventId}`
        );
      }, `stripe_webhook_${eventId}`);
    }
  ).then((result) => ({
    success: result.success,
    error: result.error,
  }));
}

/**
 * User deletion with transaction boundary
 */
export async function transactionalUserDeletion(
  userId: number,
  deleteUserData: () => Promise<{ deletedRecords: { table: string; count: number }[] }>
): Promise<TransactionResult<{ deletedRecords: { table: string; count: number }[] }>> {
  return withTransaction(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Lock the user row
    await db.execute(
      sql`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`
    );

    // Delete user data
    const result = await deleteUserData();

    return result;
  }, `user_deletion_${userId}`);
}

/**
 * Bulk operation with transaction boundary
 */
export async function transactionalBulkOperation<T>(
  operationName: string,
  items: T[],
  processItem: (item: T) => Promise<void>
): Promise<TransactionResult<{ processed: number; failed: number }>> {
  return withTransaction(async () => {
    let processed = 0;
    let failed = 0;

    for (const item of items) {
      try {
        await processItem(item);
        processed++;
      } catch (error) {
        failed++;
        logger.warn(`Bulk operation item failed: ${operationName}`, {
          errorMsg: (error as Error).message,
        });
      }
    }

    return { processed, failed };
  }, operationName);
}

/**
 * Credit deduction with transaction boundary
 */
export async function transactionalCreditDeduction(
  userId: number,
  amount: number,
  reason: string,
  performOperation: () => Promise<void>
): Promise<TransactionResult<{ newBalance: number }>> {
  return withTransaction(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Lock the user row and check balance
    const userResult = await db.execute(
      sql`SELECT id, credits FROM users WHERE id = ${userId} FOR UPDATE`
    );
    const user = (userResult as any)[0]?.[0];

    if (!user) {
      throw new Error("User not found");
    }

    if (user.credits < amount) {
      throw new Error("Insufficient credits");
    }

    // Deduct credits
    await db.execute(
      sql`UPDATE users SET credits = credits - ${amount}, updatedAt = NOW() WHERE id = ${userId}`
    );

    // Perform the operation
    await performOperation();

    // Log the credit transaction
    await db.execute(
      sql`INSERT INTO credit_transactions (userId, amount, type, reason, createdAt)
          VALUES (${userId}, ${-amount}, 'deduction', ${reason}, NOW())`
    );

    return { newBalance: user.credits - amount };
  }, `credit_deduction_${userId}_${Date.now()}`);
}
