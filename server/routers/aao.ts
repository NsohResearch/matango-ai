import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { 
  aaoDeployments, 
  workflowSessions,
  workflowMediaAssets,
  workflowScripts,
  workflowAuditLogs,
  type InsertAaoDeployment 
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * AAO Router - Deploy campaign assets from workflow sessions
 */
export const aaoRouter = router({
  /**
   * Deploy a campaign asset
   */
  deployCampaignAsset: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      videoAssetId: z.number().optional(),
      scriptId: z.number().optional(),
      destination: z.enum(["publish_track", "download_only", "draft", "schedule"]),
      scheduledFor: z.string().datetime().optional(),
      targetPlatforms: z.array(z.object({
        platform: z.string(),
        accountId: z.number().optional(),
      })).optional(),
      notes: z.string().max(2000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      // Verify session ownership
      const sessions = await db
        .select()
        .from(workflowSessions)
        .where(
          and(
            eq(workflowSessions.id, input.sessionId),
            eq(workflowSessions.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!sessions.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      // Verify video asset if provided
      if (input.videoAssetId) {
        const assets = await db
          .select()
          .from(workflowMediaAssets)
          .where(
            and(
              eq(workflowMediaAssets.id, input.videoAssetId),
              eq(workflowMediaAssets.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (!assets.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Video asset not found" });
        }
      }

      // Verify script if provided
      if (input.scriptId) {
        const scripts = await db
          .select()
          .from(workflowScripts)
          .where(
            and(
              eq(workflowScripts.id, input.scriptId),
              eq(workflowScripts.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (!scripts.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Script not found" });
        }
      }

      // Prepare target platforms with initial status
      const targetPlatforms = input.targetPlatforms?.map(p => ({
        ...p,
        status: "pending",
      }));

      const deploymentData: InsertAaoDeployment = {
        userId: ctx.user.id,
        sessionId: input.sessionId,
        videoAssetId: input.videoAssetId,
        scriptId: input.scriptId,
        destination: input.destination,
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : undefined,
        targetPlatforms,
        status: input.destination === "schedule" ? "queued" : "processing",
        notes: input.notes,
      };

      const [result] = await db.insert(aaoDeployments).values(deploymentData);
      const deploymentId = result.insertId;

      // Audit log
      await db.insert(workflowAuditLogs).values({
        userId: ctx.user.id,
        action: "aao.deploy",
        entityType: "aao_deployment",
        entityId: deploymentId,
        sessionId: input.sessionId,
        details: { 
          destination: input.destination, 
          videoAssetId: input.videoAssetId,
          scriptId: input.scriptId,
          platformCount: targetPlatforms?.length || 0,
        },
      });

      return { 
        deploymentId, 
        status: deploymentData.status as string,
      };
    }),

  /**
   * Get deployment status
   */
  getDeploymentStatus: protectedProcedure
    .input(z.object({ deploymentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const deployments = await db
        .select()
        .from(aaoDeployments)
        .where(
          and(
            eq(aaoDeployments.id, input.deploymentId),
            eq(aaoDeployments.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!deployments.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deployment not found" });
      }

      return deployments[0];
    }),

  /**
   * List deployments by session
   */
  listBySession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      // Verify session ownership
      const sessions = await db
        .select()
        .from(workflowSessions)
        .where(
          and(
            eq(workflowSessions.id, input.sessionId),
            eq(workflowSessions.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!sessions.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      return db
        .select()
        .from(aaoDeployments)
        .where(eq(aaoDeployments.sessionId, input.sessionId))
        .orderBy(desc(aaoDeployments.createdAt));
    }),

  /**
   * Cancel a deployment
   */
  cancelDeployment: protectedProcedure
    .input(z.object({ deploymentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const deployments = await db
        .select()
        .from(aaoDeployments)
        .where(
          and(
            eq(aaoDeployments.id, input.deploymentId),
            eq(aaoDeployments.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!deployments.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deployment not found" });
      }

      const deployment = deployments[0];

      // Can only cancel queued or processing deployments
      if (!["queued", "processing"].includes(deployment.status)) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: `Cannot cancel deployment with status: ${deployment.status}` 
        });
      }

      await db
        .update(aaoDeployments)
        .set({ status: "cancelled" })
        .where(eq(aaoDeployments.id, input.deploymentId));

      // Audit log
      await db.insert(workflowAuditLogs).values({
        userId: ctx.user.id,
        action: "aao.cancel",
        entityType: "aao_deployment",
        entityId: input.deploymentId,
        sessionId: deployment.sessionId,
        details: { previousStatus: deployment.status },
      });

      return { success: true };
    }),

  /**
   * List all deployments for the current user
   */
  listAll: protectedProcedure
    .input(z.object({
      status: z.enum(["queued", "processing", "published", "failed", "cancelled"]).optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const { status, limit = 20, offset = 0 } = input || {};

      if (status) {
        return db
          .select()
          .from(aaoDeployments)
          .where(
            and(
              eq(aaoDeployments.userId, ctx.user.id),
              eq(aaoDeployments.status, status)
            )
          )
          .orderBy(desc(aaoDeployments.createdAt))
          .limit(limit)
          .offset(offset);
      }

      return db
        .select()
        .from(aaoDeployments)
        .where(eq(aaoDeployments.userId, ctx.user.id))
        .orderBy(desc(aaoDeployments.createdAt))
        .limit(limit)
        .offset(offset);
    }),
});
