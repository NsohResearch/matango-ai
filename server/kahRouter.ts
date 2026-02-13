/**
 * K'ah Router - API endpoints for K'ah demo influencer
 */

import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { seedKahData, KAH_PROFILE, KAH_QA_CORPUS, findKahResponse, getKahSystemPrompt } from "./seedKahQA";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";

export const kahRouter = router({
  /**
   * Get K'ah's profile information
   */
  getProfile: publicProcedure.query(async () => {
    return {
      ...KAH_PROFILE,
      qaCategories: Object.keys(KAH_QA_CORPUS),
      totalQA: Object.values(KAH_QA_CORPUS).flat().length,
    };
  }),

  /**
   * Get K'ah's Q&A corpus by category
   */
  getQAByCategory: publicProcedure
    .input(z.object({ 
      category: z.enum(["about", "platform", "marketing", "pricing", "howto", "motivation", "personality"]).optional() 
    }))
    .query(async ({ input }) => {
      if (input.category) {
        return {
          category: input.category,
          qa: KAH_QA_CORPUS[input.category] || [],
        };
      }
      return {
        categories: Object.keys(KAH_QA_CORPUS),
        qa: KAH_QA_CORPUS,
      };
    }),

  /**
   * Chat with K'ah (public - no auth required for demo)
   */
  chat: publicProcedure
    .input(z.object({
      message: z.string().min(1).max(2000),
      sessionId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // First check if we have a pre-defined response
      const corpusResponse = findKahResponse(input.message);
      if (corpusResponse) {
        return {
          response: corpusResponse,
          source: "corpus",
        };
      }

      // Fall back to LLM
      try {
        const result = await invokeLLM({
          messages: [
            { role: "system", content: getKahSystemPrompt() },
            { role: "user", content: input.message },
          ],
        });

        if (result.choices && result.choices[0]?.message?.content) {
          const content = result.choices[0].message.content;
          return {
            response: typeof content === "string" ? content : JSON.stringify(content),
            source: "llm",
          };
        }

        throw new Error("No response from LLM");
      } catch (error) {
        console.error("K'ah chat error:", error);
        return {
          response: "Hey there! I'm K'ah, your marketing guide. I'm here to help you understand marketing and get the most out of Matango.ai. What would you like to know?",
          source: "fallback",
        };
      }
    }),

  /**
   * Seed K'ah data (admin only)
   */
  seed: protectedProcedure.mutation(async ({ ctx }) => {
    // Only allow admin to seed
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    const result = await seedKahData();
    return result;
  }),

  /**
   * Get K'ah's influencer ID
   */
  getInfluencerId: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    }

    const result = await db.execute(
      sql`SELECT id FROM influencers WHERE name = "K'ah" LIMIT 1`
    );
    const rows = (result as any)[0];

    if (rows && rows.length > 0) {
      return { id: rows[0].id, exists: true };
    }

    return { id: null, exists: false };
  }),

  /**
   * Get suggested questions for K'ah
   */
  getSuggestedQuestions: publicProcedure.query(async () => {
    // Return a curated list of suggested questions
    return {
      suggestions: [
        "Who are you?",
        "What is Matango.ai?",
        "What is Brand Brain?",
        "How do I get started?",
        "How do I build a strong brand?",
        "How much does Matango cost?",
        "What makes good social media content?",
        "I'm new to marketing, is this for me?",
      ],
    };
  }),
});
