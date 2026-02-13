import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { 
  workflowSessions, 
  workflowAuditLogs,
  type InsertWorkflowSession 
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Workflow Router - Manages workflow sessions for the Video Scripts → Video Studio → AAO pipeline
 */
export const workflowRouter = router({
  /**
   * Create a new workflow session
   */
  createSession: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      brandId: z.number().optional(),
      organizationId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sessionData: InsertWorkflowSession = {
        userId: ctx.user.id,
        title: input.title,
        description: input.description,
        brandId: input.brandId,
        organizationId: input.organizationId,
        status: "draft",
        currentStep: "script_generation",
      };

      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const [result] = await db.insert(workflowSessions).values(sessionData);
      const sessionId = result.insertId;

      // Audit log
      await db.insert(workflowAuditLogs).values({
        userId: ctx.user.id,
        action: "workflow.session.create",
        entityType: "workflow_session",
        entityId: sessionId,
        sessionId,
        details: { title: input.title },
      });

      return { id: sessionId };
    }),

  /**
   * Get a specific workflow session
   */
  getSession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

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

      return sessions[0];
    }),

  /**
   * List all workflow sessions for the current user
   */
  listSessions: protectedProcedure
    .input(z.object({
      status: z.enum(["draft", "active", "completed", "archived"]).optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { status, limit = 20, offset = 0 } = input || {};

      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      let query = db
        .select()
        .from(workflowSessions)
        .where(eq(workflowSessions.userId, ctx.user.id))
        .orderBy(desc(workflowSessions.createdAt))
        .limit(limit)
        .offset(offset);

      if (status) {
        query = db
          .select()
          .from(workflowSessions)
          .where(
            and(
              eq(workflowSessions.userId, ctx.user.id),
              eq(workflowSessions.status, status)
            )
          )
          .orderBy(desc(workflowSessions.createdAt))
          .limit(limit)
          .offset(offset);
      }

      return query;
    }),

  /**
   * Update workflow session status or step
   */
  updateSession: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).optional(),
      status: z.enum(["draft", "active", "completed", "archived"]).optional(),
      currentStep: z.enum([
        "script_generation",
        "image_generation",
        "video_generation",
        "review",
        "deployment"
      ]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { sessionId, ...updates } = input;

      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      // Verify ownership
      const sessions = await db
        .select()
        .from(workflowSessions)
        .where(
          and(
            eq(workflowSessions.id, sessionId),
            eq(workflowSessions.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!sessions.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      // Update
      await db
        .update(workflowSessions)
        .set(updates)
        .where(eq(workflowSessions.id, sessionId));

      // Audit log
      await db.insert(workflowAuditLogs).values({
        userId: ctx.user.id,
        action: "workflow.session.update",
        entityType: "workflow_session",
        entityId: sessionId,
        sessionId,
        details: updates,
      });

      return { success: true };
    }),

  /**
   * Archive a workflow session
   */
  archiveSession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      // Verify ownership
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

      await db
        .update(workflowSessions)
        .set({ status: "archived" })
        .where(eq(workflowSessions.id, input.sessionId));

      // Audit log
      await db.insert(workflowAuditLogs).values({
        userId: ctx.user.id,
        action: "workflow.session.archive",
        entityType: "workflow_session",
        entityId: input.sessionId,
        sessionId: input.sessionId,
        details: { previousStatus: sessions[0].status },
      });

      return { success: true };
    }),
});
