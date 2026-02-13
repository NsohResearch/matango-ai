import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc } from "drizzle-orm";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  aiProviders,
  userAiCredentials,
  aiUsageLogs,
  providerRateLimits,
} from "../../drizzle/schema";
import crypto from "crypto";

// Simple encryption for API keys (in production, use a proper KMS)
const ENCRYPTION_KEY = process.env.JWT_SECRET?.slice(0, 32).padEnd(32, "0") || "default-key-for-development-only";
const IV_LENGTH = 16;

function encryptApiKey(apiKey: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(apiKey);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decryptApiKey(encryptedKey: string): string {
  const parts = encryptedKey.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const encryptedText = Buffer.from(parts[1], "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

function getKeyHint(apiKey: string): string {
  return "..." + apiKey.slice(-4);
}

export const aiProvidersRouter = router({
  // List all available providers
  listProviders: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return [];
    }
    const providers = await db
      .select()
      .from(aiProviders)
      .where(eq(aiProviders.isActive, true))
      .orderBy(aiProviders.isBuiltIn, aiProviders.name);
    
    return providers.map(p => ({
      ...p,
      capabilities: p.capabilities || {},
    }));
  }),

  // Get a single provider by slug
  getProvider: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }
      const [provider] = await db
        .select()
        .from(aiProviders)
        .where(eq(aiProviders.slug, input.slug))
        .limit(1);
      
      if (!provider) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" });
      }
      
      return {
        ...provider,
        capabilities: provider.capabilities || {},
      };
    }),

  // Get user's configured credentials
  listCredentials: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return [];
    }
    const credentials = await db
      .select({
        id: userAiCredentials.id,
        providerId: userAiCredentials.providerId,
        keyHint: userAiCredentials.keyHint,
        isValid: userAiCredentials.isValid,
        lastValidatedAt: userAiCredentials.lastValidatedAt,
        validationError: userAiCredentials.validationError,
        totalRequests: userAiCredentials.totalRequests,
        totalCreditsUsed: userAiCredentials.totalCreditsUsed,
        lastUsedAt: userAiCredentials.lastUsedAt,
        isActive: userAiCredentials.isActive,
        isPrimary: userAiCredentials.isPrimary,
        createdAt: userAiCredentials.createdAt,
        providerName: aiProviders.name,
        providerSlug: aiProviders.slug,
        providerLogo: aiProviders.logoUrl,
      })
      .from(userAiCredentials)
      .innerJoin(aiProviders, eq(userAiCredentials.providerId, aiProviders.id))
      .where(eq(userAiCredentials.userId, ctx.user.id))
      .orderBy(desc(userAiCredentials.isPrimary), userAiCredentials.createdAt);
    
    return credentials;
  }),

  // Add a new credential
  addCredential: protectedProcedure
    .input(z.object({
      providerId: z.number(),
      apiKey: z.string().min(10, "API key is too short"),
      setPrimary: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }
      
      // Check if provider exists
      const [provider] = await db
        .select()
        .from(aiProviders)
        .where(eq(aiProviders.id, input.providerId))
        .limit(1);
      
      if (!provider) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" });
      }
      
      if (provider.isBuiltIn) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Cannot add credentials for built-in provider" 
        });
      }
      
      // Check if user already has credentials for this provider
      const [existing] = await db
        .select()
        .from(userAiCredentials)
        .where(and(
          eq(userAiCredentials.userId, ctx.user.id),
          eq(userAiCredentials.providerId, input.providerId)
        ))
        .limit(1);
      
      if (existing) {
        throw new TRPCError({ 
          code: "CONFLICT", 
          message: "You already have credentials for this provider. Please update or delete the existing one." 
        });
      }
      
      // Encrypt the API key
      const encryptedApiKey = encryptApiKey(input.apiKey);
      const keyHint = getKeyHint(input.apiKey);
      
      // If setting as primary, unset other primaries for same provider type
      if (input.setPrimary) {
        await db
          .update(userAiCredentials)
          .set({ isPrimary: false })
          .where(eq(userAiCredentials.userId, ctx.user.id));
      }
      
      // Insert the credential
      const [result] = await db
        .insert(userAiCredentials)
        .values({
          userId: ctx.user.id,
          providerId: input.providerId,
          encryptedApiKey,
          keyHint,
          isValid: false, // Will be validated separately
          isPrimary: input.setPrimary,
        })
        .$returningId();
      
      return { 
        id: result.id, 
        message: "Credential added successfully. Please validate to confirm it works." 
      };
    }),

  // Update a credential
  updateCredential: protectedProcedure
    .input(z.object({
      id: z.number(),
      apiKey: z.string().min(10).optional(),
      isActive: z.boolean().optional(),
      setPrimary: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }
      
      // Check ownership
      const [credential] = await db
        .select()
        .from(userAiCredentials)
        .where(and(
          eq(userAiCredentials.id, input.id),
          eq(userAiCredentials.userId, ctx.user.id)
        ))
        .limit(1);
      
      if (!credential) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Credential not found" });
      }
      
      const updates: Partial<typeof userAiCredentials.$inferInsert> = {};
      
      if (input.apiKey) {
        updates.encryptedApiKey = encryptApiKey(input.apiKey);
        updates.keyHint = getKeyHint(input.apiKey);
        updates.isValid = false; // Reset validation
        updates.validationError = null;
      }
      
      if (input.isActive !== undefined) {
        updates.isActive = input.isActive;
      }
      
      if (input.setPrimary) {
        // Unset other primaries
        await db
          .update(userAiCredentials)
          .set({ isPrimary: false })
          .where(eq(userAiCredentials.userId, ctx.user.id));
        updates.isPrimary = true;
      }
      
      await db
        .update(userAiCredentials)
        .set(updates)
        .where(eq(userAiCredentials.id, input.id));
      
      return { message: "Credential updated successfully" };
    }),

  // Delete a credential
  deleteCredential: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }
      
      // Check ownership
      const [credential] = await db
        .select()
        .from(userAiCredentials)
        .where(and(
          eq(userAiCredentials.id, input.id),
          eq(userAiCredentials.userId, ctx.user.id)
        ))
        .limit(1);
      
      if (!credential) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Credential not found" });
      }
      
      // Soft delete by deactivating
      await db
        .update(userAiCredentials)
        .set({ isActive: false })
        .where(eq(userAiCredentials.id, input.id));
      
      return { message: "Credential deleted successfully" };
    }),

  // Validate a credential by making a test API call
  validateCredential: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }
      
      // Get the credential with provider info
      const [credential] = await db
        .select({
          id: userAiCredentials.id,
          encryptedApiKey: userAiCredentials.encryptedApiKey,
          providerSlug: aiProviders.slug,
          providerBaseUrl: aiProviders.baseApiUrl,
        })
        .from(userAiCredentials)
        .innerJoin(aiProviders, eq(userAiCredentials.providerId, aiProviders.id))
        .where(and(
          eq(userAiCredentials.id, input.id),
          eq(userAiCredentials.userId, ctx.user.id)
        ))
        .limit(1);
      
      if (!credential) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Credential not found" });
      }
      
      const apiKey = decryptApiKey(credential.encryptedApiKey);
      let isValid = false;
      let validationError: string | null = null;
      
      try {
        // Validate based on provider
        switch (credential.providerSlug) {
          case "openai-sora":
            // Test OpenAI API
            const openaiResponse = await fetch("https://api.openai.com/v1/models", {
              headers: { Authorization: `Bearer ${apiKey}` },
            });
            if (!openaiResponse.ok) {
              const error = await openaiResponse.json().catch(() => ({}));
              throw new Error(error.error?.message || `HTTP ${openaiResponse.status}`);
            }
            isValid = true;
            break;
            
          case "runway":
            // Test Runway API
            const runwayResponse = await fetch("https://api.runwayml.com/v1/account", {
              headers: { Authorization: `Bearer ${apiKey}` },
            });
            if (!runwayResponse.ok) {
              throw new Error(`HTTP ${runwayResponse.status}`);
            }
            isValid = true;
            break;
            
          case "replicate":
            // Test Replicate API
            const replicateResponse = await fetch("https://api.replicate.com/v1/account", {
              headers: { Authorization: `Token ${apiKey}` },
            });
            if (!replicateResponse.ok) {
              throw new Error(`HTTP ${replicateResponse.status}`);
            }
            isValid = true;
            break;
            
          case "stability":
            // Test Stability API
            const stabilityResponse = await fetch("https://api.stability.ai/v1/user/account", {
              headers: { Authorization: `Bearer ${apiKey}` },
            });
            if (!stabilityResponse.ok) {
              throw new Error(`HTTP ${stabilityResponse.status}`);
            }
            isValid = true;
            break;
            
          default:
            // For other providers, assume valid if key format looks correct
            if (apiKey.length >= 20) {
              isValid = true;
            } else {
              validationError = "API key format appears invalid";
            }
        }
      } catch (error) {
        validationError = error instanceof Error ? error.message : "Validation failed";
      }
      
      // Update validation status
      if (db) {
        await db
          .update(userAiCredentials)
          .set({
            isValid,
            lastValidatedAt: new Date(),
            validationError,
          })
          .where(eq(userAiCredentials.id, input.id));
      }
      
      return { 
        isValid, 
        error: validationError,
        message: isValid ? "API key validated successfully" : `Validation failed: ${validationError}` 
      };
    }),

  // Get usage statistics
  getUsageStats: protectedProcedure
    .input(z.object({
      providerId: z.number().optional(),
      days: z.number().min(1).max(90).default(30),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);
      
      // Build query conditions
      const conditions = [eq(aiUsageLogs.userId, ctx.user.id)];
      if (input.providerId) {
        conditions.push(eq(aiUsageLogs.providerId, input.providerId));
      }
      
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }
      
      const logs = await db
        .select({
          providerId: aiUsageLogs.providerId,
          providerName: aiProviders.name,
          jobKind: aiUsageLogs.jobKind,
          operation: aiUsageLogs.operation,
          status: aiUsageLogs.status,
          creditsUsed: aiUsageLogs.creditsUsed,
          estimatedCostCents: aiUsageLogs.estimatedCostCents,
          createdAt: aiUsageLogs.createdAt,
        })
        .from(aiUsageLogs)
        .innerJoin(aiProviders, eq(aiUsageLogs.providerId, aiProviders.id))
        .where(and(...conditions))
        .orderBy(desc(aiUsageLogs.createdAt))
        .limit(1000);
      
      // Aggregate stats
      const byProvider: Record<number, {
        name: string;
        totalRequests: number;
        successfulRequests: number;
        failedRequests: number;
        totalCredits: number;
        totalCostCents: number;
      }> = {};
      
      const byOperation: Record<string, number> = {};
      
      for (const log of logs) {
        if (!byProvider[log.providerId]) {
          byProvider[log.providerId] = {
            name: log.providerName,
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalCredits: 0,
            totalCostCents: 0,
          };
        }
        
        byProvider[log.providerId].totalRequests++;
        if (log.status === "success") {
          byProvider[log.providerId].successfulRequests++;
        } else if (log.status === "failed") {
          byProvider[log.providerId].failedRequests++;
        }
        byProvider[log.providerId].totalCredits += log.creditsUsed;
        byProvider[log.providerId].totalCostCents += log.estimatedCostCents;
        
        byOperation[log.operation] = (byOperation[log.operation] || 0) + 1;
      }
      
      return {
        period: { start: startDate, end: new Date() },
        byProvider: Object.values(byProvider),
        byOperation,
        totalRequests: logs.length,
        recentLogs: logs.slice(0, 50),
      };
    }),

  // Get available providers for a specific capability
  getProvidersForCapability: protectedProcedure
    .input(z.object({
      capability: z.enum(["textToVideo", "imageToVideo", "textToImage", "imageToImage", "lipSync"]),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }
      
      // Get all active providers
      const providers = await db
        .select()
        .from(aiProviders)
        .where(eq(aiProviders.isActive, true));
      
      // Get user's valid credentials
      const credentials = await db
        .select({
          providerId: userAiCredentials.providerId,
          isValid: userAiCredentials.isValid,
        })
        .from(userAiCredentials)
        .where(and(
          eq(userAiCredentials.userId, ctx.user.id),
          eq(userAiCredentials.isActive, true)
        ));
      
      const credentialMap = new Map(credentials.map(c => [c.providerId, c.isValid]));
      
      // Filter providers that have the capability
      const availableProviders = providers
        .filter(p => {
          const caps = p.capabilities as Record<string, boolean> || {};
          return caps[input.capability] === true;
        })
        .map(p => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          logoUrl: p.logoUrl,
          isBuiltIn: p.isBuiltIn,
          isPremium: p.isPremium,
          hasCredential: p.isBuiltIn || credentialMap.has(p.id),
          isCredentialValid: p.isBuiltIn || credentialMap.get(p.id) === true,
          estimatedCost: p.estimatedCostPerUnit,
          costUnit: p.costUnit,
          capabilities: p.capabilities,
        }));
      
      return availableProviders;
    }),

  // Get usage summary for analytics dashboard
  getUsageSummary: protectedProcedure
    .input(z.object({
      timeRange: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      // Calculate date range
      const now = new Date();
      let startDate: Date | null = null;
      let previousStartDate: Date | null = null;
      
      if (input.timeRange !== "all") {
        const days = input.timeRange === "7d" ? 7 : input.timeRange === "30d" ? 30 : 90;
        startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);
      }

      // Get current period logs
      const conditions = [eq(aiUsageLogs.userId, ctx.user.id)];
      if (startDate) {
        const { gte } = await import("drizzle-orm");
        conditions.push(gte(aiUsageLogs.createdAt, startDate));
      }

      const logs = await db
        .select()
        .from(aiUsageLogs)
        .where(and(...conditions));

      // Calculate totals
      let totalCostCents = 0;
      let totalCredits = 0;
      let totalGenerations = 0;
      let imageGenerations = 0;
      let imageCostCents = 0;
      let videoGenerations = 0;
      let videoCostCents = 0;
      let totalVideoDurationSeconds = 0;

      for (const log of logs) {
        totalCostCents += log.estimatedCostCents;
        totalCredits += log.creditsUsed;
        totalGenerations++;
        
        if (log.jobKind === "image") {
          imageGenerations++;
          imageCostCents += log.estimatedCostCents;
        } else if (log.jobKind === "video") {
          videoGenerations++;
          videoCostCents += log.estimatedCostCents;
          totalVideoDurationSeconds += log.durationSeconds || 0;
        }
      }

      // Calculate trend (compare to previous period)
      let costTrend = 0;
      if (previousStartDate && startDate) {
        const { gte, lt } = await import("drizzle-orm");
        const previousLogs = await db
          .select()
          .from(aiUsageLogs)
          .where(and(
            eq(aiUsageLogs.userId, ctx.user.id),
            gte(aiUsageLogs.createdAt, previousStartDate),
            lt(aiUsageLogs.createdAt, startDate)
          ));
        
        const previousCost = previousLogs.reduce((sum, l) => sum + l.estimatedCostCents, 0);
        if (previousCost > 0) {
          costTrend = Math.round(((totalCostCents - previousCost) / previousCost) * 100);
        }
      }

      return {
        totalCostCents,
        totalCredits,
        totalGenerations,
        imageGenerations,
        imageCostCents,
        videoGenerations,
        videoCostCents,
        totalVideoDurationSeconds,
        costTrend,
        creditsRemaining: 1000 - totalCredits, // Placeholder - should come from subscription
      };
    }),

  // Get usage breakdown by provider
  getUsageByProvider: protectedProcedure
    .input(z.object({
      timeRange: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      // Calculate date range
      const now = new Date();
      let startDate: Date | null = null;
      
      if (input.timeRange !== "all") {
        const days = input.timeRange === "7d" ? 7 : input.timeRange === "30d" ? 30 : 90;
        startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      }

      const conditions = [eq(aiUsageLogs.userId, ctx.user.id)];
      if (startDate) {
        const { gte } = await import("drizzle-orm");
        conditions.push(gte(aiUsageLogs.createdAt, startDate));
      }

      const logs = await db
        .select({
          providerId: aiUsageLogs.providerId,
          providerName: aiProviders.name,
          providerSlug: aiProviders.slug,
          creditsUsed: aiUsageLogs.creditsUsed,
          estimatedCostCents: aiUsageLogs.estimatedCostCents,
        })
        .from(aiUsageLogs)
        .innerJoin(aiProviders, eq(aiUsageLogs.providerId, aiProviders.id))
        .where(and(...conditions));

      // Aggregate by provider
      const byProvider: Record<number, {
        providerId: number;
        providerName: string;
        providerSlug: string;
        generations: number;
        credits: number;
        costCents: number;
      }> = {};

      for (const log of logs) {
        if (!byProvider[log.providerId]) {
          byProvider[log.providerId] = {
            providerId: log.providerId,
            providerName: log.providerName,
            providerSlug: log.providerSlug,
            generations: 0,
            credits: 0,
            costCents: 0,
          };
        }
        byProvider[log.providerId].generations++;
        byProvider[log.providerId].credits += log.creditsUsed;
        byProvider[log.providerId].costCents += log.estimatedCostCents;
      }

      return Object.values(byProvider).sort((a, b) => b.costCents - a.costCents);
    }),

  // Get daily usage for trend chart
  getDailyUsage: protectedProcedure
    .input(z.object({
      timeRange: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      // Calculate date range
      const now = new Date();
      let days = 30;
      
      if (input.timeRange === "7d") days = 7;
      else if (input.timeRange === "90d") days = 90;
      else if (input.timeRange === "all") days = 365;

      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const { gte } = await import("drizzle-orm");
      const logs = await db
        .select()
        .from(aiUsageLogs)
        .where(and(
          eq(aiUsageLogs.userId, ctx.user.id),
          gte(aiUsageLogs.createdAt, startDate)
        ));

      // Aggregate by day
      const byDay: Record<string, {
        date: string;
        generations: number;
        costCents: number;
        credits: number;
      }> = {};

      // Initialize all days in range
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split("T")[0];
        byDay[dateStr] = {
          date: dateStr,
          generations: 0,
          costCents: 0,
          credits: 0,
        };
      }

      // Fill in actual data
      for (const log of logs) {
        const dateStr = log.createdAt.toISOString().split("T")[0];
        if (byDay[dateStr]) {
          byDay[dateStr].generations++;
          byDay[dateStr].costCents += log.estimatedCostCents;
          byDay[dateStr].credits += log.creditsUsed;
        }
      }

      return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
    }),
});

export type AiProvidersRouter = typeof aiProvidersRouter;
