/**
 * Account Lifecycle Router
 * 
 * Implements production-grade account deletion guardrails with:
 * - 90-day soft delete with self-restore
 * - 12-month retention with support restore
 * - Alternatives-first approach (pause, downgrade, deactivate)
 * - Strong confirmation requirements
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, sql } from "drizzle-orm";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  users,
  accountLifecycleEvents,
  accountDeletionRequests,
  billingPauseRecords,
} from "../../drizzle/schema";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover" as any,
});

// Account status type
type AccountStatus = "ACTIVE" | "DEACTIVATED" | "SUSPENDED" | "SOFT_DELETED_90D" | "RETENTION_12M" | "HARD_DELETED";

// Helper to log lifecycle events
async function logLifecycleEvent(params: {
  userId: number;
  organizationId?: number;
  action: string;
  fromStatus?: AccountStatus;
  toStatus?: AccountStatus;
  triggeredBy: "user" | "admin" | "system" | "support";
  triggeredByUserId?: number;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

  await db.insert(accountLifecycleEvents).values({
    userId: params.userId,
    organizationId: params.organizationId,
    action: params.action as any,
    fromStatus: params.fromStatus as any,
    toStatus: params.toStatus as any,
    triggeredBy: params.triggeredBy,
    triggeredByUserId: params.triggeredByUserId,
    reason: params.reason,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    metadata: params.metadata,
  });
}

export const accountLifecycleRouter = router({
  /**
   * Get current account status and lifecycle info
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    // Check for active billing pause
    const [activePause] = await db.select().from(billingPauseRecords)
      .where(and(
        eq(billingPauseRecords.userId, ctx.user.id),
        eq(billingPauseRecords.status, "active")
      )).limit(1);

    // Check for pending deletion request
    const [pendingDeletion] = await db.select().from(accountDeletionRequests)
      .where(and(
        eq(accountDeletionRequests.userId, ctx.user.id),
        eq(accountDeletionRequests.status, "pending")
      )).limit(1);

    return {
      accountStatus: user.accountStatus,
      deletedAt: user.deletedAt,
      recoveryDeadline: user.recoveryDeadline,
      retentionUntil: user.retentionUntil,
      plan: user.plan,
      hasActiveSubscription: user.plan !== "free",
      activeBillingPause: activePause ? {
        pauseDuration: activePause.pauseDuration,
        pauseEndDate: activePause.pauseEndDate,
      } : null,
      pendingDeletionRequest: pendingDeletion ? {
        id: pendingDeletion.id,
        expiresAt: pendingDeletion.expiresAt,
        alternativeChosen: pendingDeletion.alternativeChosen,
      } : null,
    };
  }),

  /**
   * Get lifecycle event history
   */
  getHistory: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const events = await db.select().from(accountLifecycleEvents)
      .where(eq(accountLifecycleEvents.userId, ctx.user.id))
      .orderBy(desc(accountLifecycleEvents.createdAt))
      .limit(50);

    return events;
  }),

  /**
   * Pause billing for 30/60/90 days
   */
  pauseBilling: protectedProcedure
    .input(z.object({
      duration: z.enum(["30d", "60d", "90d"]),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    if (user.accountStatus !== "ACTIVE") {
      throw new TRPCError({ 
        code: "BAD_REQUEST", 
        message: "Can only pause billing for active accounts" 
      });
    }

    // Check for existing active pause
    const [existingPause] = await db.select().from(billingPauseRecords)
      .where(and(
        eq(billingPauseRecords.userId, ctx.user.id),
        eq(billingPauseRecords.status, "active")
      )).limit(1);

      if (existingPause) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Billing is already paused" 
        });
      }

      // Calculate pause dates
      const pauseStartDate = new Date();
      const durationDays = parseInt(input.duration);
      const pauseEndDate = new Date(pauseStartDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

      // Create billing pause record
      const [pauseRecord] = await db.insert(billingPauseRecords).values({
        userId: ctx.user.id,
        pauseDuration: input.duration,
        pauseStartDate,
        pauseEndDate,
        // Note: stripeSubscriptionId would be tracked if Stripe integration is enabled
        status: "active",
        reason: input.reason,
      });

      // Log lifecycle event
      await logLifecycleEvent({
        userId: ctx.user.id,
        action: "billing_paused",
        triggeredBy: "user",
        triggeredByUserId: ctx.user.id,
        reason: input.reason,
        metadata: { duration: input.duration, pauseEndDate: pauseEndDate.toISOString() },
      });

      // Wire Stripe pause_collection if user has active subscription
      if (user.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.update(user.stripeSubscriptionId, {
            pause_collection: {
              behavior: 'keep_as_draft',
              resumes_at: Math.floor(pauseEndDate.getTime() / 1000),
            },
          });
          console.log(`[Stripe] Paused subscription ${user.stripeSubscriptionId} until ${pauseEndDate.toISOString()}`);
        } catch (stripeErr) {
          console.error('[Stripe] Failed to pause subscription:', stripeErr);
          // Continue — local record is created; Stripe sync can be retried
        }
      }

      return {
        success: true,
        pauseEndDate,
        message: `Billing paused until ${pauseEndDate.toLocaleDateString()}`,
      };
    }),

  /**
   * Resume billing (cancel pause)
   */
  resumeBilling: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const [activePause] = await db.select().from(billingPauseRecords)
      .where(and(
        eq(billingPauseRecords.userId, ctx.user.id),
        eq(billingPauseRecords.status, "active")
      )).limit(1);

    if (!activePause) {
      throw new TRPCError({ 
        code: "BAD_REQUEST", 
        message: "No active billing pause to resume" 
      });
    }

    // Update pause record
    await db.update(billingPauseRecords)
      .set({ 
        status: "cancelled",
        resumedAt: new Date(),
      })
      .where(eq(billingPauseRecords.id, activePause.id));

    // Log lifecycle event
    await logLifecycleEvent({
      userId: ctx.user.id,
      action: "billing_resumed",
      triggeredBy: "user",
      triggeredByUserId: ctx.user.id,
    });

    // Wire Stripe resume — remove pause_collection
    const [currentUser] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
    if (currentUser?.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.update(currentUser.stripeSubscriptionId, {
          pause_collection: null as any,
        });
        console.log(`[Stripe] Resumed subscription ${currentUser.stripeSubscriptionId}`);
      } catch (stripeErr) {
        console.error('[Stripe] Failed to resume subscription:', stripeErr);
      }
    }

    return {
      success: true,
      message: "Billing resumed successfully",
    };
  }),

  /**
   * Downgrade to free plan
   */
  downgrade: protectedProcedure
    .input(z.object({
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (user.plan === "free") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Already on free plan" 
        });
      }

      const previousPlan = user.plan;

      // Update user to free plan
      await db.update(users)
        .set({ 
          plan: "free",
        })
        .where(eq(users.id, ctx.user.id));

      // Log lifecycle event
      await logLifecycleEvent({
        userId: ctx.user.id,
        action: "plan_downgraded",
        triggeredBy: "user",
        triggeredByUserId: ctx.user.id,
        reason: input.reason,
        metadata: { fromPlan: previousPlan, toPlan: "free" },
      });

      // Cancel Stripe subscription at period end (graceful)
      if (user.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.update(user.stripeSubscriptionId, {
            cancel_at_period_end: true,
          });
          console.log(`[Stripe] Scheduled cancellation for subscription ${user.stripeSubscriptionId}`);
        } catch (stripeErr) {
          console.error('[Stripe] Failed to cancel subscription:', stripeErr);
        }
      }

      return {
        success: true,
        message: "Downgraded to free plan. Your data is preserved.",
      };
    }),

  /**
   * Deactivate account (reversible, keeps data)
   */
  deactivate: protectedProcedure
    .input(z.object({
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (user.accountStatus !== "ACTIVE") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Account is not active" 
        });
      }

      // Update account status
      await db.update(users)
        .set({ 
          accountStatus: "DEACTIVATED",
        })
        .where(eq(users.id, ctx.user.id));

      // Log lifecycle event
      await logLifecycleEvent({
        userId: ctx.user.id,
        action: "account_deactivated",
        fromStatus: "ACTIVE",
        toStatus: "DEACTIVATED",
        triggeredBy: "user",
        triggeredByUserId: ctx.user.id,
        reason: input.reason,
      });

      return {
        success: true,
        message: "Account deactivated. You can reactivate anytime by logging in.",
      };
    }),

  /**
   * Reactivate a deactivated account
   */
  reactivate: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    if (user.accountStatus !== "DEACTIVATED") {
      throw new TRPCError({ 
        code: "BAD_REQUEST", 
        message: "Account is not deactivated" 
      });
    }

    // Update account status
    await db.update(users)
      .set({ 
        accountStatus: "ACTIVE",
      })
      .where(eq(users.id, ctx.user.id));

    // Log lifecycle event
    await logLifecycleEvent({
      userId: ctx.user.id,
      action: "account_activated",
      fromStatus: "DEACTIVATED",
      toStatus: "ACTIVE",
      triggeredBy: "user",
      triggeredByUserId: ctx.user.id,
    });

    return {
      success: true,
      message: "Account reactivated successfully!",
    };
  }),

  /**
   * Request account deletion (initiates confirmation flow)
   */
  requestDelete: protectedProcedure
    .input(z.object({
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (user.accountStatus !== "ACTIVE" && user.accountStatus !== "DEACTIVATED") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Cannot delete account in current state" 
        });
      }

      // Check for existing pending request
      const [existingRequest] = await db.select().from(accountDeletionRequests)
        .where(and(
          eq(accountDeletionRequests.userId, ctx.user.id),
          eq(accountDeletionRequests.status, "pending")
        ))
        .limit(1);

      if (existingRequest) {
        return {
          requestId: existingRequest.id,
          expiresAt: existingRequest.expiresAt,
          message: "Deletion request already pending",
        };
      }

      // Create deletion request (expires in 24 hours)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const [request] = await db.insert(accountDeletionRequests).values({
        userId: ctx.user.id,
        status: "pending",
        expiresAt,
      });

      // Log lifecycle event
      await logLifecycleEvent({
        userId: ctx.user.id,
        action: "deletion_requested",
        triggeredBy: "user",
        triggeredByUserId: ctx.user.id,
        reason: input.reason,
      });

      return {
        requestId: request.insertId,
        expiresAt,
        message: "Deletion request created. Please complete confirmation within 24 hours.",
      };
    }),

  /**
   * Confirm account deletion with strong verification
   */
  confirmDelete: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      typedPhrase: z.string(),
      emailConfirmation: z.string(),
      acknowledgedConsequences: z.boolean(),
      acknowledged90DayRecovery: z.boolean(),
      acknowledged12MonthRetention: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      // Verify deletion request
      const [request] = await db.select().from(accountDeletionRequests)
        .where(and(
          eq(accountDeletionRequests.id, input.requestId),
          eq(accountDeletionRequests.userId, ctx.user.id),
          eq(accountDeletionRequests.status, "pending")
        ))
        .limit(1);

      if (!request) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "Deletion request not found or expired" 
        });
      }

      // Check if request expired
      if (new Date() > request.expiresAt) {
        await db.update(accountDeletionRequests)
          .set({ status: "expired" })
          .where(eq(accountDeletionRequests.id, request.id));

        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Deletion request has expired. Please start again." 
        });
      }

      // Verify typed phrase
      const expectedPhrase = "DELETE MY ACCOUNT";
      if (input.typedPhrase.toUpperCase() !== expectedPhrase) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: `Please type "${expectedPhrase}" exactly to confirm` 
        });
      }

      // Verify email matches
      if (!user.email || input.emailConfirmation.toLowerCase() !== user.email.toLowerCase()) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Email does not match your account email" 
        });
      }

      // Verify all acknowledgements
      if (!input.acknowledgedConsequences || !input.acknowledged90DayRecovery || !input.acknowledged12MonthRetention) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Please acknowledge all consequences before proceeding" 
        });
      }

      // Calculate deadlines
      const now = new Date();
      const recoveryDeadline = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days
      const retentionUntil = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 12 months

      // Update deletion request
      await db.update(accountDeletionRequests)
        .set({
          status: "confirmed",
          typedPhraseOk: true,
          emailMatchOk: true,
          reauthOk: true, // Assumed since they're logged in
          mfaOk: true, // TODO: Add MFA check if enabled
          acknowledgedConsequences: true,
          acknowledged90DayRecovery: true,
          acknowledged12MonthRetention: true,
          confirmedAt: now,
        })
        .where(eq(accountDeletionRequests.id, request.id));

      // Update user account status to soft deleted
      await db.update(users)
        .set({
          accountStatus: "SOFT_DELETED_90D",
          deletedAt: now,
          deletedBy: ctx.user.id,
          recoveryDeadline,
          retentionUntil,
        })
        .where(eq(users.id, ctx.user.id));

      // Log lifecycle event
      await logLifecycleEvent({
        userId: ctx.user.id,
        action: "soft_deleted",
        fromStatus: user.accountStatus as AccountStatus,
        toStatus: "SOFT_DELETED_90D",
        triggeredBy: "user",
        triggeredByUserId: ctx.user.id,
        metadata: { recoveryDeadline: recoveryDeadline.toISOString(), retentionUntil: retentionUntil.toISOString() },
      });

      // TODO: Cancel Stripe subscription
      // TODO: Send confirmation email

      return {
        success: true,
        recoveryDeadline,
        retentionUntil,
        message: "Account scheduled for deletion. You have 90 days to restore it yourself, or contact support within 12 months.",
      };
    }),

  /**
   * Cancel pending deletion request
   */
  cancelDelete: protectedProcedure
    .input(z.object({
      requestId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [request] = await db.select().from(accountDeletionRequests)
        .where(and(
          eq(accountDeletionRequests.id, input.requestId),
          eq(accountDeletionRequests.userId, ctx.user.id),
          eq(accountDeletionRequests.status, "pending")
        ))
        .limit(1);

      if (!request) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "Deletion request not found" 
        });
      }

      // Update request status
      await db.update(accountDeletionRequests)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
        })
        .where(eq(accountDeletionRequests.id, request.id));

      // Log lifecycle event
      await logLifecycleEvent({
        userId: ctx.user.id,
        action: "deletion_cancelled",
        triggeredBy: "user",
        triggeredByUserId: ctx.user.id,
      });

      return {
        success: true,
        message: "Deletion request cancelled",
      };
    }),

  /**
   * Self-restore account within 90-day window
   */
  restore: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    if (user.accountStatus !== "SOFT_DELETED_90D") {
      throw new TRPCError({ 
        code: "BAD_REQUEST", 
        message: "Account is not in soft-deleted state" 
      });
    }

    // Check if still within recovery window
    if (user.recoveryDeadline && new Date() > user.recoveryDeadline) {
      throw new TRPCError({ 
        code: "BAD_REQUEST", 
        message: "Recovery window has expired. Please contact support for assistance." 
      });
    }

    // Restore account
    await db.update(users)
      .set({
        accountStatus: "ACTIVE",
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
        recoveryDeadline: null,
        retentionUntil: null,
      })
      .where(eq(users.id, ctx.user.id));

    // Log lifecycle event
    await logLifecycleEvent({
      userId: ctx.user.id,
      action: "restored_from_soft_delete",
      fromStatus: "SOFT_DELETED_90D",
      toStatus: "ACTIVE",
      triggeredBy: "user",
      triggeredByUserId: ctx.user.id,
    });

    return {
      success: true,
      message: "Account restored successfully! Welcome back.",
    };
  }),

  /**
   * Admin: Support restore within 12-month retention window
   */
  supportRestore: adminProcedure
    .input(z.object({
      userId: z.number(),
      ticketId: z.string().optional(),
      reason: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [targetUser] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);

      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (targetUser.accountStatus !== "SOFT_DELETED_90D" && targetUser.accountStatus !== "RETENTION_12M") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Account is not in a restorable state" 
        });
      }

      // Check if still within retention window
      if (targetUser.retentionUntil && new Date() > targetUser.retentionUntil) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Retention period has expired. Account cannot be restored." 
        });
      }

      const previousStatus = targetUser.accountStatus;

      // Restore account
      await db.update(users)
        .set({
          accountStatus: "ACTIVE",
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
          recoveryDeadline: null,
          retentionUntil: null,
        })
        .where(eq(users.id, input.userId));

      // Log lifecycle event
      await logLifecycleEvent({
        userId: input.userId,
        action: previousStatus === "RETENTION_12M" ? "restored_from_retention" : "restored_from_soft_delete",
        fromStatus: previousStatus as AccountStatus,
        toStatus: "ACTIVE",
        triggeredBy: "support",
        triggeredByUserId: ctx.user.id,
        reason: input.reason,
        metadata: { ticketId: input.ticketId },
      });

      return {
        success: true,
        message: `Account ${input.userId} restored by support`,
      };
    }),

  /**
   * Admin: Get all accounts in deletion/retention states
   */
  adminListPendingDeletions: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const deletedAccounts = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      accountStatus: users.accountStatus,
      deletedAt: users.deletedAt,
      recoveryDeadline: users.recoveryDeadline,
      retentionUntil: users.retentionUntil,
      deletionReason: users.deletionReason,
    }).from(users)
      .where(sql`${users.accountStatus} IN ('SOFT_DELETED_90D', 'RETENTION_12M')`)
      .orderBy(desc(users.deletedAt));

    return deletedAccounts;
  }),

  /**
   * Admin: Get lifecycle events for a user
   */
  adminGetUserHistory: adminProcedure
    .input(z.object({
      userId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const events = await db.select().from(accountLifecycleEvents)
        .where(eq(accountLifecycleEvents.userId, input.userId))
        .orderBy(desc(accountLifecycleEvents.createdAt))
        .limit(100);

      return events;
    }),

  /**
   * System: Move accounts from SOFT_DELETED_90D to RETENTION_12M
   * Called by daily cron job
   */
  systemMoveToRetention: adminProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const now = new Date();

    // Find accounts past recovery deadline
    const expiredAccounts = await db.select().from(users)
      .where(and(
        eq(users.accountStatus, "SOFT_DELETED_90D"),
        sql`${users.recoveryDeadline} < ${now}`
      ));

    let movedCount = 0;

    for (const account of expiredAccounts) {
      await db.update(users)
        .set({ accountStatus: "RETENTION_12M" })
        .where(eq(users.id, account.id));

      await logLifecycleEvent({
        userId: account.id,
        action: "moved_to_retention",
        fromStatus: "SOFT_DELETED_90D",
        toStatus: "RETENTION_12M",
        triggeredBy: "system",
      });

      movedCount++;
    }

    return {
      success: true,
      movedCount,
      message: `Moved ${movedCount} accounts to retention`,
    };
  }),

  /**
   * System: Hard delete accounts past retention period
   * Called by daily cron job
   */
  systemHardDelete: adminProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const now = new Date();

    // Find accounts past retention deadline
    const expiredAccounts = await db.select().from(users)
      .where(and(
        eq(users.accountStatus, "RETENTION_12M"),
        sql`${users.retentionUntil} < ${now}`
      ));

    let deletedCount = 0;

    for (const account of expiredAccounts) {
      // Log before hard delete
      await logLifecycleEvent({
        userId: account.id,
        action: "hard_deleted",
        fromStatus: "RETENTION_12M",
        toStatus: "HARD_DELETED",
        triggeredBy: "system",
        metadata: { email: account.email, name: account.name },
      });

      // Anonymize the account (keep ID for audit trail)
      await db.update(users)
        .set({
          accountStatus: "HARD_DELETED",
          email: `deleted_${account.id}@anonymized.local`,
          name: `Deleted User ${account.id}`,
          hardDeletedAt: now,
        })
        .where(eq(users.id, account.id));

      // TODO: Delete user data from related tables
      // - campaigns
      // - influencers
      // - leads
      // - etc.

      deletedCount++;
    }

    return {
      success: true,
      deletedCount,
      message: `Hard deleted ${deletedCount} accounts`,
    };
  }),

  /**
   * Extend trial period for a user (admin only)
   */
  extendTrial: adminProcedure
    .input(z.object({
      userId: z.number(),
      additionalDays: z.number().min(1).max(90),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      // Extend trial in Stripe if subscription exists
      if (user.stripeSubscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          const currentTrialEnd = sub.trial_end || Math.floor(Date.now() / 1000);
          const newTrialEnd = currentTrialEnd + (input.additionalDays * 24 * 60 * 60);

          await stripe.subscriptions.update(user.stripeSubscriptionId, {
            trial_end: newTrialEnd,
          });
          console.log(`[Stripe] Extended trial for subscription ${user.stripeSubscriptionId} by ${input.additionalDays} days`);
        } catch (stripeErr) {
          console.error('[Stripe] Failed to extend trial:', stripeErr);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to extend trial in Stripe" });
        }
      }

      // Update local planStatus to trial if not already
      await db.update(users)
        .set({ planStatus: "trial" })
        .where(eq(users.id, input.userId));

      await logLifecycleEvent({
        userId: input.userId,
        action: "trial_extended",
        triggeredBy: "admin",
        triggeredByUserId: ctx.user.id,
        reason: input.reason,
        metadata: { additionalDays: input.additionalDays },
      });

      return {
        success: true,
        message: `Trial extended by ${input.additionalDays} days`,
      };
    }),

  /**
   * Cancel subscription immediately (admin only)
   */
  cancelSubscription: adminProcedure
    .input(z.object({
      userId: z.number(),
      immediately: z.boolean().default(false),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      if (user.stripeSubscriptionId) {
        try {
          if (input.immediately) {
            await stripe.subscriptions.cancel(user.stripeSubscriptionId);
            console.log(`[Stripe] Immediately cancelled subscription ${user.stripeSubscriptionId}`);
          } else {
            await stripe.subscriptions.update(user.stripeSubscriptionId, {
              cancel_at_period_end: true,
            });
            console.log(`[Stripe] Scheduled cancellation for subscription ${user.stripeSubscriptionId}`);
          }
        } catch (stripeErr) {
          console.error('[Stripe] Failed to cancel subscription:', stripeErr);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to cancel subscription in Stripe" });
        }
      }

      // Update local state
      await db.update(users)
        .set({
          plan: "free",
          planStatus: "cancelled",
          stripeSubscriptionId: null,
        })
        .where(eq(users.id, input.userId));

      await logLifecycleEvent({
        userId: input.userId,
        action: "subscription_cancelled",
        triggeredBy: "admin",
        triggeredByUserId: ctx.user.id,
        reason: input.reason,
        metadata: { immediately: input.immediately },
      });

      return {
        success: true,
        message: input.immediately ? "Subscription cancelled immediately" : "Subscription will cancel at period end",
      };
    }),

  /**
   * Resume a cancelled subscription (admin only)
   */
  resumeSubscription: adminProcedure
    .input(z.object({
      userId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      if (user.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.update(user.stripeSubscriptionId, {
            cancel_at_period_end: false,
          });
          console.log(`[Stripe] Resumed subscription ${user.stripeSubscriptionId}`);
        } catch (stripeErr) {
          console.error('[Stripe] Failed to resume subscription:', stripeErr);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to resume subscription in Stripe" });
        }
      }

      await db.update(users)
        .set({ planStatus: "active" })
        .where(eq(users.id, input.userId));

      await logLifecycleEvent({
        userId: input.userId,
        action: "subscription_resumed",
        triggeredBy: "admin",
        triggeredByUserId: ctx.user.id,
        reason: input.reason,
      });

      return {
        success: true,
        message: "Subscription resumed",
      };
    }),

  /**
   * Get Stripe subscription details for a user
   */
  getSubscriptionDetails: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

    let stripeSubscription: any = null;
    if (user.stripeSubscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId) as any;
        stripeSubscription = {
          id: sub.id,
          status: sub.status,
          currentPeriodStart: sub.current_period_start,
          currentPeriodEnd: sub.current_period_end,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          cancelAt: sub.cancel_at,
          trialEnd: sub.trial_end,
          pauseCollection: sub.pause_collection,
        };
      } catch (stripeErr) {
        console.error('[Stripe] Failed to retrieve subscription:', stripeErr);
      }
    }

    return {
      plan: user.plan,
      planStatus: user.planStatus,
      billingCycle: user.billingCycle,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      credits: user.credits,
      stripeSubscription,
    };
  }),

  /**
   * Get user's own usage and limits
   */
  getMyUsageAndLimits: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

    // Import plan limits
    const { getPlanLimits } = await import("../planLimits");
    const planLimits = getPlanLimits(user.plan);

    // Get current usage
    const { getCurrentUsageCounters, getTenantLimits } = await import("../db");
    const usage = await getCurrentUsageCounters(ctx.user.id);
    const tenantLimits = await getTenantLimits(ctx.user.id);

    // Count influencers
    const influencerResult = await db.execute(
      sql`SELECT COUNT(*) as count FROM influencers WHERE userId = ${ctx.user.id}`
    );
    const influencerCount = ((influencerResult as any)[0])?.[0]?.count || 0;

    return {
      plan: user.plan,
      planStatus: user.planStatus,
      credits: user.credits,
      planLimits,
      tenantLimits,
      usage: usage || {
        imagesGenerated: 0,
        videosGenerated: 0,
        postsPublished: 0,
        storageUsedMb: 0,
        apiCalls: 0,
      },
      stats: {
        influencerCount,
      },
    };
  }),
});
