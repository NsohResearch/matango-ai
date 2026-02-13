import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { 
  workflowGenerationJobs, 
  workflowSessions,
  workflowAuditLogs,
  type InsertWorkflowGenerationJob 
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Jobs Router - Manage async generation jobs within workflow sessions
 */
export const jobsRouter = router({
  /**
   * Get job status
   */
  getStatus: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const jobs = await db
        .select()
        .from(workflowGenerationJobs)
        .where(
          and(
            eq(workflowGenerationJobs.id, input.jobId),
            eq(workflowGenerationJobs.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!jobs.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      const job = jobs[0];
      return {
        id: job.id,
        status: job.status,
        progress: job.progress,
        jobKind: job.jobKind,
        outputAssetId: job.outputAssetId,
        errorMessage: job.errorMessage,
        attemptCount: job.attemptCount,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      };
    }),

  /**
   * List jobs by session
   */
  listBySession: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      status: z.enum(["queued", "running", "succeeded", "failed", "canceled", "dead_letter"]).optional(),
    }))
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

      let query = db
        .select()
        .from(workflowGenerationJobs)
        .where(eq(workflowGenerationJobs.sessionId, input.sessionId))
        .orderBy(desc(workflowGenerationJobs.createdAt));

      if (input.status) {
        query = db
          .select()
          .from(workflowGenerationJobs)
          .where(
            and(
              eq(workflowGenerationJobs.sessionId, input.sessionId),
              eq(workflowGenerationJobs.status, input.status)
            )
          )
          .orderBy(desc(workflowGenerationJobs.createdAt));
      }

      return query;
    }),

  /**
   * Cancel a job
   */
  cancel: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const jobs = await db
        .select()
        .from(workflowGenerationJobs)
        .where(
          and(
            eq(workflowGenerationJobs.id, input.jobId),
            eq(workflowGenerationJobs.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!jobs.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      const job = jobs[0];

      // Can only cancel queued or running jobs
      if (!["queued", "running"].includes(job.status)) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: `Cannot cancel job with status: ${job.status}` 
        });
      }

      await db
        .update(workflowGenerationJobs)
        .set({ 
          status: "canceled",
          leaseToken: null,
          leaseExpiresAt: null,
        })
        .where(eq(workflowGenerationJobs.id, input.jobId));

      // Audit log
      await db.insert(workflowAuditLogs).values({
        userId: ctx.user.id,
        action: "workflow.job.cancel",
        entityType: "workflow_generation_job",
        entityId: input.jobId,
        sessionId: job.sessionId,
        details: { previousStatus: job.status, jobKind: job.jobKind },
      });

      return { success: true };
    }),

  /**
   * Retry a failed job
   */
  retry: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const jobs = await db
        .select()
        .from(workflowGenerationJobs)
        .where(
          and(
            eq(workflowGenerationJobs.id, input.jobId),
            eq(workflowGenerationJobs.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!jobs.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      const job = jobs[0];

      // Can only retry failed or dead_letter jobs
      if (!["failed", "dead_letter", "canceled"].includes(job.status)) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: `Cannot retry job with status: ${job.status}` 
        });
      }

      await db
        .update(workflowGenerationJobs)
        .set({ 
          status: "queued",
          progress: 0,
          errorMessage: null,
          attemptCount: 0,
          nextRunAt: new Date(),
          leaseToken: null,
          leaseExpiresAt: null,
        })
        .where(eq(workflowGenerationJobs.id, input.jobId));

      // Audit log
      await db.insert(workflowAuditLogs).values({
        userId: ctx.user.id,
        action: "workflow.job.retry",
        entityType: "workflow_generation_job",
        entityId: input.jobId,
        sessionId: job.sessionId,
        details: { previousStatus: job.status, jobKind: job.jobKind },
      });

      return { success: true };
    }),

  /**
   * Create a new image generation job
   */
  createImageJob: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      prompt: z.string().min(1).max(2000),
      negativePrompt: z.string().max(1000).optional(),
      modelId: z.string().optional(),
      referenceAssetIds: z.array(z.number()).optional(),
      aspectRatio: z.string().default("9:16"),
      seed: z.number().optional(),
      steps: z.number().min(1).max(100).optional(),
      guidance: z.number().min(1).max(20).optional(),
      referenceStrength: z.number().min(0).max(1).optional(),
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

      const { sessionId, ...inputJson } = input;

      const jobData: InsertWorkflowGenerationJob = {
        userId: ctx.user.id,
        sessionId,
        jobKind: "image",
        status: "queued",
        progress: 0,
        inputJson,
        attemptCount: 0,
        maxAttempts: 5,
        nextRunAt: new Date(),
      };

      const [result] = await db.insert(workflowGenerationJobs).values(jobData);
      const jobId = result.insertId;

      // Audit log
      await db.insert(workflowAuditLogs).values({
        userId: ctx.user.id,
        action: "workflow.job.create",
        entityType: "workflow_generation_job",
        entityId: jobId,
        sessionId,
        details: { jobKind: "image", prompt: input.prompt.substring(0, 200) },
      });

      return { jobId };
    }),

  /**
   * Create a new video generation job
   */
  createVideoJob: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      scriptId: z.number(),
      influencerProfileId: z.number().optional(),
      modelId: z.string().optional(),
      referenceAssetIds: z.array(z.number()).optional(),
      voice: z.record(z.string(), z.any()).optional(),
      style: z.string().optional(),
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

      const { sessionId, ...inputJson } = input;

      const jobData: InsertWorkflowGenerationJob = {
        userId: ctx.user.id,
        sessionId,
        jobKind: "video",
        status: "queued",
        progress: 0,
        inputJson,
        attemptCount: 0,
        maxAttempts: 5,
        nextRunAt: new Date(),
      };

      const [result] = await db.insert(workflowGenerationJobs).values(jobData);
      const jobId = result.insertId;

      // Audit log
      await db.insert(workflowAuditLogs).values({
        userId: ctx.user.id,
        action: "workflow.job.create",
        entityType: "workflow_generation_job",
        entityId: jobId,
        sessionId,
        details: { jobKind: "video", scriptId: input.scriptId },
      });

      return { jobId };
    }),
});
