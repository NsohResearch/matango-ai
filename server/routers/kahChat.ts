import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { invokeLLM } from "../_core/llm";
import { findKahResponse, getKahSystemPrompt } from "../seedKahQA";
import { 
  kahChatMessages, 
  workflowSessions,
  type InsertKahChatMessage 
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * K'ah Chat Router - AI assistant for marketing guidance and platform help
 */
export const kahChatRouter = router({
  /**
   * Send a message to K'ah and get a response
   */
  chat: protectedProcedure
    .input(z.object({
      message: z.string().min(1).max(4000),
      sessionId: z.number().optional(),
      contextType: z.enum([
        "general",
        "script_help",
        "video_help",
        "marketing_advice",
        "platform_guidance",
        "troubleshooting"
      ]).default("general"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      // If session provided, verify ownership
      if (input.sessionId) {
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
      }

      // Save user message
      const userMessageData: InsertKahChatMessage = {
        userId: ctx.user.id,
        sessionId: input.sessionId,
        role: "user",
        content: input.message,
        contextType: input.contextType,
      };

      await db.insert(kahChatMessages).values(userMessageData);

      // Get chat history for context
      const history = await db
        .select()
        .from(kahChatMessages)
        .where(eq(kahChatMessages.userId, ctx.user.id))
        .orderBy(desc(kahChatMessages.createdAt))
        .limit(20);

      // Reverse to get chronological order
      const chatHistory = history.reverse().map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // Check for pre-defined K'ah responses first
      const predefinedResponse = findKahResponse(input.message);
      
      let responseContent: string;
      let metadata: Record<string, any> = {};

      if (predefinedResponse) {
        responseContent = predefinedResponse;
        metadata.source = "predefined";
      } else {
        // Use K'ah's system prompt for LLM
        const kahSystemPrompt = getKahSystemPrompt();
        
        // Add context-specific instructions
        let contextPrompt = "";
        switch (input.contextType) {
          case "script_help":
            contextPrompt = "\n\nThe user is asking for help with video scripts. Focus on script writing best practices, hooks, CTAs, and platform-specific advice.";
            break;
          case "video_help":
            contextPrompt = "\n\nThe user is asking for help with video generation. Focus on visual storytelling, reference images, and video production tips.";
            break;
          case "marketing_advice":
            contextPrompt = "\n\nThe user is asking for marketing advice. Focus on strategy, audience targeting, and campaign optimization.";
            break;
          case "platform_guidance":
            contextPrompt = "\n\nThe user is asking about how to use the Matango.ai platform. Focus on features, workflows, and best practices.";
            break;
          case "troubleshooting":
            contextPrompt = "\n\nThe user is experiencing issues. Focus on diagnosing problems and providing solutions.";
            break;
        }

        const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
          { role: "system", content: kahSystemPrompt + contextPrompt },
        ];

        // Add recent chat history
        for (const msg of chatHistory.slice(-10)) {
          messages.push({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content,
          });
        }

        // Add current message
        messages.push({ role: "user", content: input.message });

        try {
          const result = await invokeLLM({ messages });
          
          if (result.choices && result.choices[0]?.message?.content) {
            const content = result.choices[0].message.content;
            responseContent = typeof content === "string" ? content : JSON.stringify(content);
            metadata.source = "llm";
          } else {
            throw new Error("No response from LLM");
          }
        } catch (error) {
          console.error("K'ah LLM error:", error);
          responseContent = "Hey there! I'm K'ah, your marketing guide. I'm here to help you understand marketing and get the most out of Matango.ai. Could you rephrase your question? I want to make sure I give you the best answer!";
          metadata.source = "fallback";
          metadata.error = String(error);
        }
      }

      // Save assistant response
      const assistantMessageData: InsertKahChatMessage = {
        userId: ctx.user.id,
        sessionId: input.sessionId,
        role: "assistant",
        content: responseContent,
        contextType: input.contextType,
        metadata,
      };

      const [result] = await db.insert(kahChatMessages).values(assistantMessageData);

      return {
        id: result.insertId,
        content: responseContent,
        metadata,
      };
    }),

  /**
   * Get chat history
   */
  getHistory: protectedProcedure
    .input(z.object({
      sessionId: z.number().optional(),
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const { sessionId, limit = 50 } = input || {};

      if (sessionId) {
        // Verify session ownership
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

        const messages = await db
          .select()
          .from(kahChatMessages)
          .where(
            and(
              eq(kahChatMessages.userId, ctx.user.id),
              eq(kahChatMessages.sessionId, sessionId)
            )
          )
          .orderBy(desc(kahChatMessages.createdAt))
          .limit(limit);

        return messages.reverse();
      }

      // Get all messages for user
      const messages = await db
        .select()
        .from(kahChatMessages)
        .where(eq(kahChatMessages.userId, ctx.user.id))
        .orderBy(desc(kahChatMessages.createdAt))
        .limit(limit);

      return messages.reverse();
    }),

  /**
   * Save a message (for manual message insertion)
   */
  saveMessage: protectedProcedure
    .input(z.object({
      sessionId: z.number().optional(),
      role: z.enum(["user", "assistant", "tool", "system"]),
      content: z.string().min(1).max(10000),
      metadata: z.record(z.string(), z.any()).optional(),
      contextType: z.enum([
        "general",
        "script_help",
        "video_help",
        "marketing_advice",
        "platform_guidance",
        "troubleshooting"
      ]).default("general"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      // If session provided, verify ownership
      if (input.sessionId) {
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
      }

      const messageData: InsertKahChatMessage = {
        userId: ctx.user.id,
        sessionId: input.sessionId,
        role: input.role,
        content: input.content,
        metadata: input.metadata,
        contextType: input.contextType,
      };

      const [result] = await db.insert(kahChatMessages).values(messageData);

      return { id: result.insertId };
    }),

  /**
   * Clear chat history
   */
  clearHistory: protectedProcedure
    .input(z.object({
      sessionId: z.number().optional(),
    }).optional())
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const sessionId = input?.sessionId;

      if (sessionId) {
        // Verify session ownership
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

        await db
          .delete(kahChatMessages)
          .where(
            and(
              eq(kahChatMessages.userId, ctx.user.id),
              eq(kahChatMessages.sessionId, sessionId)
            )
          );
      } else {
        // Clear all messages for user
        await db
          .delete(kahChatMessages)
          .where(eq(kahChatMessages.userId, ctx.user.id));
      }

      return { success: true };
    }),
});
