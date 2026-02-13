import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { invokeLLM } from "../_core/llm";
import { 
  workflowScripts, 
  workflowSessions,
  workflowAuditLogs,
  type InsertWorkflowScript 
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const scriptContentSchema = z.object({
  hook: z.string(),
  body: z.string(),
  cta: z.string(),
  shotList: z.array(z.object({
    shot: z.number(),
    description: z.string(),
    duration: z.string().optional(),
  })).optional(),
  safetyNotes: z.array(z.string()).optional(),
  deliveryNotes: z.object({
    pacing: z.string().optional(),
    emphasis: z.array(z.string()).optional(),
    pauses: z.array(z.string()).optional(),
  }).optional(),
});

/**
 * Scripts Router - Generate and manage video scripts within workflow sessions
 */
export const scriptsRouter = router({
  /**
   * Generate a new script using AI
   */
  generate: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      platform: z.enum(["tiktok", "instagram", "youtube", "ads", "linkedin", "other"]),
      language: z.string().max(20).default("en"),
      tone: z.string().max(40).default("confident"),
      brief: z.string().min(10).max(2000),
      targetDurationSeconds: z.number().min(5).max(300).optional(),
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

      // Generate script using LLM
      const systemPrompt = `You are an expert video script writer for social media content.
Generate a ${input.platform} video script with the following structure:
- hook: An attention-grabbing opening (first 3 seconds)
- body: The main content
- cta: A clear call-to-action
- shotList: Array of shots with descriptions and durations
- safetyNotes: Any content warnings or safety considerations
- deliveryNotes: Pacing, emphasis points, and pause suggestions

Platform: ${input.platform}
Language: ${input.language}
Tone: ${input.tone}
${input.targetDurationSeconds ? `Target Duration: ${input.targetDurationSeconds} seconds` : ""}

Respond ONLY with valid JSON matching this schema:
{
  "hook": "string",
  "body": "string", 
  "cta": "string",
  "shotList": [{"shot": 1, "description": "string", "duration": "3s"}],
  "safetyNotes": ["string"],
  "deliveryNotes": {"pacing": "string", "emphasis": ["string"], "pauses": ["string"]}
}`;

      try {
        const result = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.brief },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "video_script",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  hook: { type: "string", description: "Attention-grabbing opening" },
                  body: { type: "string", description: "Main content" },
                  cta: { type: "string", description: "Call to action" },
                  shotList: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        shot: { type: "integer" },
                        description: { type: "string" },
                        duration: { type: "string" },
                      },
                      required: ["shot", "description"],
                      additionalProperties: false,
                    },
                  },
                  safetyNotes: { type: "array", items: { type: "string" } },
                  deliveryNotes: {
                    type: "object",
                    properties: {
                      pacing: { type: "string" },
                      emphasis: { type: "array", items: { type: "string" } },
                      pauses: { type: "array", items: { type: "string" } },
                    },
                    additionalProperties: false,
                  },
                },
                required: ["hook", "body", "cta"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = result.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error("No content in LLM response");
        }

        const contentJson = typeof content === "string" ? JSON.parse(content) : content;

        // Audit log
        await db.insert(workflowAuditLogs).values({
          userId: ctx.user.id,
          action: "workflow.script.generate",
          entityType: "workflow_script",
          sessionId: input.sessionId,
          details: { platform: input.platform, brief: input.brief.substring(0, 200) },
        });

        return { contentJson };
      } catch (error) {
        console.error("Script generation error:", error);
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: "Failed to generate script" 
        });
      }
    }),

  /**
   * Save a generated script
   */
  save: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      platform: z.enum(["tiktok", "instagram", "youtube", "ads", "linkedin", "other"]),
      language: z.string().max(20).default("en"),
      tone: z.string().max(40).default("confident"),
      contentJson: scriptContentSchema,
      estimatedDurationSeconds: z.number().optional(),
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

      // Concatenate full script
      const fullScript = `${input.contentJson.hook}\n\n${input.contentJson.body}\n\n${input.contentJson.cta}`;

      const scriptData: InsertWorkflowScript = {
        userId: ctx.user.id,
        sessionId: input.sessionId,
        platform: input.platform,
        language: input.language,
        tone: input.tone,
        contentJson: input.contentJson,
        fullScript,
        estimatedDurationSeconds: input.estimatedDurationSeconds,
        status: "draft",
      };

      const [result] = await db.insert(workflowScripts).values(scriptData);
      const scriptId = result.insertId;

      // Audit log
      await db.insert(workflowAuditLogs).values({
        userId: ctx.user.id,
        action: "workflow.script.save",
        entityType: "workflow_script",
        entityId: scriptId,
        sessionId: input.sessionId,
        details: { platform: input.platform },
      });

      return { id: scriptId };
    }),

  /**
   * List scripts by session
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
        .from(workflowScripts)
        .where(eq(workflowScripts.sessionId, input.sessionId))
        .orderBy(desc(workflowScripts.createdAt));
    }),

  /**
   * Get a specific script
   */
  get: protectedProcedure
    .input(z.object({ scriptId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

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

      return scripts[0];
    }),

  /**
   * Update script status
   */
  updateStatus: protectedProcedure
    .input(z.object({
      scriptId: z.number(),
      status: z.enum(["draft", "approved", "used"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      // Verify ownership
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

      await db
        .update(workflowScripts)
        .set({ status: input.status })
        .where(eq(workflowScripts.id, input.scriptId));

      // Audit log
      await db.insert(workflowAuditLogs).values({
        userId: ctx.user.id,
        action: "workflow.script.status_update",
        entityType: "workflow_script",
        entityId: input.scriptId,
        sessionId: scripts[0].sessionId,
        details: { newStatus: input.status, previousStatus: scripts[0].status },
      });

      return { success: true };
    }),

  /**
   * Delete a script
   */
  delete: protectedProcedure
    .input(z.object({ scriptId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      // Verify ownership
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

      await db
        .delete(workflowScripts)
        .where(eq(workflowScripts.id, input.scriptId));

      // Audit log
      await db.insert(workflowAuditLogs).values({
        userId: ctx.user.id,
        action: "workflow.script.delete",
        entityType: "workflow_script",
        entityId: input.scriptId,
        sessionId: scripts[0].sessionId,
        details: { platform: scripts[0].platform },
      });

      return { success: true };
    }),
});
