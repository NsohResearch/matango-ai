import { z } from "zod";
import { sql } from "drizzle-orm";
import { adminProcedure, superAdminProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { logAuditEvent } from "./_core/auditLog";

export const adminRouter = router({
  // ============================================================================
  // Tenant Management
  // ============================================================================

  /**
   * List all tenants with pagination and filters
   */
  listTenants: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: z.enum(["active", "suspended", "read_only"]).optional(),
        plan: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return await db.listTenants(input);
    }),

  /**
   * Get detailed tenant information
   */
  getTenantDetails: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return await db.getTenantDetails(input.userId);
    }),

  /**
   * Suspend a tenant
   */
  suspendTenant: superAdminProcedure
    .input(
      z.object({
        userId: z.number(),
        reason: z.string().min(1, "Reason is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await db.suspendTenant(input.userId, ctx.user.id, input.reason);

      // Log audit event
      await logAuditEvent({
        userId: ctx.user.id,
        action: "tenant_suspended",
        resourceType: "user",
        resourceId: input.userId,
        metadata: {
          reason: input.reason,
          previousStatus: result.previousStatus,
        },
      });

      return result;
    }),

  /**
   * Unsuspend a tenant
   */
  unsuspendTenant: superAdminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const result = await db.unsuspendTenant(input.userId, ctx.user.id);

      // Log audit event
      await logAuditEvent({
        userId: ctx.user.id,
        action: "tenant_unsuspended",
        resourceType: "user",
        resourceId: input.userId,
        metadata: {
          previousStatus: result.previousStatus,
        },
      });

      return result;
    }),

  /**
   * Set tenant to read-only mode
   */
  setTenantReadOnly: superAdminProcedure
    .input(
      z.object({
        userId: z.number(),
        reason: z.string().min(1, "Reason is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await db.setTenantReadOnly(input.userId, ctx.user.id, input.reason);

      // Log audit event
      await logAuditEvent({
        userId: ctx.user.id,
        action: "tenant_set_read_only",
        resourceType: "user",
        resourceId: input.userId,
        metadata: {
          reason: input.reason,
          previousStatus: result.previousStatus,
        },
      });

      return result;
    }),

  /**
   * Reset tenant limits to plan defaults
   */
  resetTenantLimits: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const result = await db.resetTenantLimits(input.userId);

      // Log audit event
      await logAuditEvent({
        userId: ctx.user.id,
        action: "tenant_limits_reset",
        resourceType: "user",
        resourceId: input.userId,
        metadata: {},
      });

      return { success: result };
    }),

  /**
   * Update specific tenant limits
   */
  updateTenantLimits: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        limits: z.object({
          influencersLimit: z.number().optional(),
          imagesPerMonth: z.number().optional(),
          videosPerMonth: z.number().optional(),
          brandsLimit: z.number().optional(),
          customDomainsLimit: z.number().optional(),
          teamMembersLimit: z.number().optional(),
          storageGb: z.number().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await db.updateTenantLimits(input.userId, input.limits);

      // Log audit event
      await logAuditEvent({
        userId: ctx.user.id,
        action: "tenant_limits_updated",
        resourceType: "user",
        resourceId: input.userId,
        metadata: { limits: input.limits },
      });

      return { success: result };
    }),

  /**
   * Get tenant limits
   */
  getTenantLimits: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return await db.getTenantLimits(input.userId);
    }),

  /**
   * Get current usage counters for a tenant
   */
  getTenantUsage: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return await db.getCurrentUsageCounters(input.userId);
    }),

  /**
   * Reset usage counters for a tenant
   */
  resetTenantUsage: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const result = await db.resetUsageCounters(input.userId);

      // Log audit event
      await logAuditEvent({
        userId: ctx.user.id,
        action: "tenant_usage_reset",
        resourceType: "user",
        resourceId: input.userId,
        metadata: {},
      });

      return { success: result };
    }),

  /**
   * Change tenant plan
   */
  changeTenantPlan: superAdminProcedure
    .input(
      z.object({
        userId: z.number(),
        plan: z.enum(["free", "basic", "agency", "agency_plus"]),
        resetLimits: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("Database not available");

      // Get current plan
      const userResult = await dbInstance.execute(
        sql`SELECT plan FROM users WHERE id = ${input.userId}`
      );
      const rows = (userResult as any)[0];
      const previousPlan = rows?.[0]?.plan || "free";

      // Update plan
      await dbInstance.execute(
        sql`UPDATE users SET plan = ${input.plan}, updatedAt = NOW() WHERE id = ${input.userId}`
      );

      // Reset limits if requested
      if (input.resetLimits) {
        await db.resetTenantLimits(input.userId);
      }

      // Log audit event
      await logAuditEvent({
        userId: ctx.user.id,
        action: "tenant_plan_changed",
        resourceType: "user",
        resourceId: input.userId,
        metadata: {
          previousPlan,
          newPlan: input.plan,
          limitsReset: input.resetLimits,
        },
      });

      return { success: true, previousPlan, newPlan: input.plan };
    }),
});
