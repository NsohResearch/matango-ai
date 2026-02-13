/**
 * Asset Library Router — Phase B
 * 
 * Full CRUD for the unified asset library, image generation with style presets,
 * edit sessions (chat-to-edit), prompt history, and bulk operations.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  assetLibrary, assetVersions, editSessions, stylePresets,
  promptHistory, bulkJobs, modelRegistry
} from "../../drizzle/schema";
import { eq, and, desc, asc, like, inArray, sql, or } from "drizzle-orm";
import { storagePut } from "../storage";
import { generateImage } from "../_core/imageGeneration";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";

export const assetLibraryRouter = router({
  // ---- List Assets (with filters, pagination, search) ----
  list: protectedProcedure
    .input(z.object({
      type: z.enum(["image", "video", "audio", "document"]).optional(),
      folder: z.string().optional(),
      tags: z.array(z.string()).optional(),
      isFavorite: z.boolean().optional(),
      isArchived: z.boolean().optional(),
      influencerId: z.number().optional(),
      brandId: z.number().optional(),
      campaignId: z.number().optional(),
      source: z.enum(["generated", "uploaded", "edited", "imported"]).optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      sortBy: z.enum(["createdAt", "updatedAt", "fileSize"]).default("createdAt"),
      sortOrder: z.enum(["asc", "desc"]).default("desc"),
    }).partial().default({}))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [eq(assetLibrary.userId, ctx.user.id)];
      if (input.type) conditions.push(eq(assetLibrary.type, input.type));
      if (input.folder) conditions.push(eq(assetLibrary.folder, input.folder));
      if (input.isFavorite !== undefined) conditions.push(eq(assetLibrary.isFavorite, input.isFavorite));
      if (input.isArchived !== undefined) conditions.push(eq(assetLibrary.isArchived, input.isArchived));
      else conditions.push(eq(assetLibrary.isArchived, false));
      if (input.influencerId) conditions.push(eq(assetLibrary.influencerId, input.influencerId));
      if (input.brandId) conditions.push(eq(assetLibrary.brandId, input.brandId));
      if (input.campaignId) conditions.push(eq(assetLibrary.campaignId, input.campaignId));
      if (input.source) conditions.push(eq(assetLibrary.source, input.source));
      if (input.search) {
        conditions.push(or(
          like(assetLibrary.prompt, `%${input.search}%`),
          like(assetLibrary.folder, `%${input.search}%`)
        )!);
      }

      const orderFn = input.sortOrder === "asc" ? asc : desc;
      const orderCol = input.sortBy === "fileSize" ? assetLibrary.fileSize
        : input.sortBy === "updatedAt" ? assetLibrary.updatedAt
        : assetLibrary.createdAt;

      const [items, countResult] = await Promise.all([
        db.select().from(assetLibrary)
          .where(and(...conditions))
          .orderBy(orderFn(orderCol!))
          .limit(input.limit ?? 50)
          .offset(input.offset ?? 0),
        db.select({ count: sql<number>`count(*)` }).from(assetLibrary)
          .where(and(...conditions)),
      ]);

      return { items, total: Number(countResult[0]?.count ?? 0) };
    }),

  // ---- Get Single Asset ----
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [asset] = await db.select().from(assetLibrary)
        .where(and(eq(assetLibrary.id, input.id), eq(assetLibrary.userId, ctx.user.id)))
        .limit(1);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found" });
      return asset;
    }),

  // ---- Generate Image → Asset ----
  generate: protectedProcedure
    .input(z.object({
      prompt: z.string().min(1).max(2000),
      negativePrompt: z.string().optional(),
      stylePreset: z.string().optional(),
      aspectRatio: z.string().default("1:1"),
      influencerId: z.number().optional(),
      brandId: z.number().optional(),
      campaignId: z.number().optional(),
      folder: z.string().optional(),
      tags: z.array(z.string()).optional(),
      count: z.number().min(1).max(4).default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Enhance prompt with style preset if provided
      let finalPrompt = input.prompt;
      if (input.stylePreset) {
        const [preset] = await db.select().from(stylePresets)
          .where(and(
            eq(stylePresets.name, input.stylePreset),
            or(eq(stylePresets.isSystem, true), eq(stylePresets.userId, ctx.user.id))
          )).limit(1);
        if (preset) {
          finalPrompt = `${preset.promptPrefix || ""} ${input.prompt} ${preset.promptSuffix || ""}`.trim();
        }
      }

      const results: number[] = [];
      for (let i = 0; i < input.count; i++) {
        try {
          const { url } = await generateImage({ prompt: finalPrompt });
          if (!url) continue;

          const [inserted] = await db.insert(assetLibrary).values({
            userId: ctx.user.id,
            type: "image" as const,
            url,
            prompt: input.prompt,
            negativePrompt: input.negativePrompt ?? null,
            stylePreset: input.stylePreset ?? null,
            aspectRatio: input.aspectRatio,
            influencerId: input.influencerId ?? null,
            brandId: input.brandId ?? null,
            campaignId: input.campaignId ?? null,
            folder: input.folder ?? null,
            tags: input.tags ?? null,
            source: "generated" as const,
          }).$returningId();
          results.push(inserted.id);
        } catch (e) {
          console.error("[AssetLibrary] Generation failed:", e);
        }
      }

      // Save to prompt history
      await db.insert(promptHistory).values({
        userId: ctx.user.id,
        prompt: input.prompt,
        negativePrompt: input.negativePrompt ?? null,
        stylePreset: input.stylePreset ?? null,
        resultCount: results.length,
      });

      return { assetIds: results, count: results.length };
    }),

  // ---- Upload Asset ----
  upload: protectedProcedure
    .input(z.object({
      base64Data: z.string(),
      contentType: z.string().default("image/png"),
      originalName: z.string().optional(),
      type: z.enum(["image", "video", "audio", "document"]).default("image"),
      influencerId: z.number().optional(),
      brandId: z.number().optional(),
      campaignId: z.number().optional(),
      folder: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const buffer = Buffer.from(input.base64Data, "base64");
      const suffix = crypto.randomBytes(4).toString("hex");
      const ext = input.contentType.split("/")[1] || "bin";
      const objectKey = `assets/${ctx.user.id}/${Date.now()}-${suffix}.${ext}`;

      const { url } = await storagePut(objectKey, buffer, input.contentType);

      const [inserted] = await db.insert(assetLibrary).values({
        userId: ctx.user.id,
        type: input.type,
        url,
        mimeType: input.contentType,
        fileSize: buffer.length,
        objectKey,
        influencerId: input.influencerId ?? null,
        brandId: input.brandId ?? null,
        campaignId: input.campaignId ?? null,
        folder: input.folder ?? null,
        tags: input.tags ?? null,
        source: "uploaded" as const,
      }).$returningId();

      return { id: inserted.id, url };
    }),

  // ---- Update Asset (tags, folder, favorite, archive) ----
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      tags: z.array(z.string()).optional(),
      folder: z.string().optional(),
      isFavorite: z.boolean().optional(),
      isArchived: z.boolean().optional(),
      influencerId: z.number().nullable().optional(),
      brandId: z.number().nullable().optional(),
      campaignId: z.number().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { id, ...updates } = input;
      const cleanUpdates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(updates)) {
        if (v !== undefined) cleanUpdates[k] = v;
      }

      await db.update(assetLibrary)
        .set(cleanUpdates)
        .where(and(eq(assetLibrary.id, id), eq(assetLibrary.userId, ctx.user.id)));

      return { success: true };
    }),

  // ---- Delete Asset ----
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db.delete(assetLibrary)
        .where(and(eq(assetLibrary.id, input.id), eq(assetLibrary.userId, ctx.user.id)));
      return { success: true };
    }),

  // ---- Bulk Delete ----
  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.number()).min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db.delete(assetLibrary)
        .where(and(inArray(assetLibrary.id, input.ids), eq(assetLibrary.userId, ctx.user.id)));
      return { success: true, deleted: input.ids.length };
    }),

  // ---- Edit Image (Chat-to-Edit) ----
  editImage: protectedProcedure
    .input(z.object({
      assetId: z.number(),
      instruction: z.string().min(1),
      sessionId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get the asset
      const [asset] = await db.select().from(assetLibrary)
        .where(and(eq(assetLibrary.id, input.assetId), eq(assetLibrary.userId, ctx.user.id)))
        .limit(1);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found" });

      // Generate edited image
      const { url: editedUrl } = await generateImage({
        prompt: input.instruction,
        originalImages: [{ url: asset.url, mimeType: asset.mimeType || "image/png" }],
      });
      if (!editedUrl) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Image edit failed" });

      // Get current version count
      const versions = await db.select({ count: sql<number>`count(*)` })
        .from(assetVersions)
        .where(eq(assetVersions.assetId, input.assetId));
      const versionNumber = Number(versions[0]?.count ?? 0) + 1;

      // Create version record
      const [version] = await db.insert(assetVersions).values({
        assetId: input.assetId,
        versionNumber,
        operation: "chat_edit",
        prompt: input.instruction,
        url: editedUrl,
      }).$returningId();

      // Update the main asset URL
      await db.update(assetLibrary)
        .set({ url: editedUrl, source: "edited" as const })
        .where(eq(assetLibrary.id, input.assetId));

      // Update or create edit session
      if (input.sessionId) {
        const [session] = await db.select().from(editSessions)
          .where(eq(editSessions.id, input.sessionId)).limit(1);
        if (session) {
          const history = (session.chatHistory || []) as Array<{ role: string; content: string; timestamp: number }>;
          history.push(
            { role: "user", content: input.instruction, timestamp: Date.now() },
            { role: "assistant", content: `Applied edit. New version: ${versionNumber}`, timestamp: Date.now() }
          );
          await db.update(editSessions)
            .set({ chatHistory: history, currentVersionId: version.id, lastAction: "chat_edit" })
            .where(eq(editSessions.id, input.sessionId));
        }
      } else {
        await db.insert(editSessions).values({
          userId: ctx.user.id,
          assetId: input.assetId,
          chatHistory: [
            { role: "user", content: input.instruction, timestamp: Date.now() },
            { role: "assistant", content: `Applied edit. Version: ${versionNumber}`, timestamp: Date.now() }
          ],
          currentVersionId: version.id,
          lastAction: "chat_edit",
        });
      }

      return { versionId: version.id, url: editedUrl, versionNumber };
    }),

  // ---- Get Asset Versions ----
  getVersions: protectedProcedure
    .input(z.object({ assetId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verify ownership
      const [asset] = await db.select().from(assetLibrary)
        .where(and(eq(assetLibrary.id, input.assetId), eq(assetLibrary.userId, ctx.user.id)))
        .limit(1);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found" });

      return db.select().from(assetVersions)
        .where(eq(assetVersions.assetId, input.assetId))
        .orderBy(asc(assetVersions.versionNumber));
    }),

  // ---- Revert to Version ----
  revertToVersion: protectedProcedure
    .input(z.object({ assetId: z.number(), versionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [version] = await db.select().from(assetVersions)
        .where(and(eq(assetVersions.id, input.versionId), eq(assetVersions.assetId, input.assetId)))
        .limit(1);
      if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" });

      await db.update(assetLibrary)
        .set({ url: version.url, thumbUrl: version.thumbUrl })
        .where(and(eq(assetLibrary.id, input.assetId), eq(assetLibrary.userId, ctx.user.id)));

      return { success: true, url: version.url };
    }),

  // ---- Style Presets ----
  listPresets: protectedProcedure
    .input(z.object({ category: z.string().optional() }).default({}))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [
        or(eq(stylePresets.isSystem, true), eq(stylePresets.userId, ctx.user.id))!
      ];
      if (input.category) conditions.push(eq(stylePresets.category, input.category));

      return db.select().from(stylePresets)
        .where(and(...conditions))
        .orderBy(asc(stylePresets.sortOrder));
    }),

  createPreset: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      category: z.string(),
      description: z.string().optional(),
      promptPrefix: z.string().optional(),
      promptSuffix: z.string().optional(),
      negativePrompt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [inserted] = await db.insert(stylePresets).values({
        userId: ctx.user.id,
        name: input.name,
        category: input.category,
        description: input.description ?? null,
        promptPrefix: input.promptPrefix ?? null,
        promptSuffix: input.promptSuffix ?? null,
        negativePrompt: input.negativePrompt ?? null,
      }).$returningId();

      return { id: inserted.id };
    }),

  // ---- Prompt History ----
  getPromptHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      return db.select().from(promptHistory)
        .where(eq(promptHistory.userId, ctx.user.id))
        .orderBy(desc(promptHistory.createdAt))
        .limit(input.limit);
    }),

  // ---- AI Prompt Enhancement ----
  enhancePrompt: protectedProcedure
    .input(z.object({
      prompt: z.string().min(1),
      style: z.string().optional(),
      targetPlatform: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an expert AI image prompt engineer. Enhance the user's prompt to produce better, more detailed image generation results. Keep the core intent but add professional details about lighting, composition, style, and quality. Return ONLY the enhanced prompt text, nothing else.${input.style ? ` Style: ${input.style}.` : ""}${input.targetPlatform ? ` Optimized for: ${input.targetPlatform}.` : ""}`
          },
          { role: "user", content: input.prompt }
        ],
      });

      const content = response.choices[0]?.message?.content;
      const enhanced = typeof content === "string" ? content.trim() : input.prompt;
      return { enhanced };
    }),

  // ---- Get Edit Session ----
  getEditSession: protectedProcedure
    .input(z.object({ assetId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [session] = await db.select().from(editSessions)
        .where(and(
          eq(editSessions.assetId, input.assetId),
          eq(editSessions.userId, ctx.user.id),
          eq(editSessions.status, "active")
        ))
        .orderBy(desc(editSessions.updatedAt))
        .limit(1);

      return session || null;
    }),

  // ---- Stats ----
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const [total] = await db.select({ count: sql<number>`count(*)` })
      .from(assetLibrary).where(eq(assetLibrary.userId, ctx.user.id));
    const [images] = await db.select({ count: sql<number>`count(*)` })
      .from(assetLibrary).where(and(eq(assetLibrary.userId, ctx.user.id), eq(assetLibrary.type, "image")));
    const [videos] = await db.select({ count: sql<number>`count(*)` })
      .from(assetLibrary).where(and(eq(assetLibrary.userId, ctx.user.id), eq(assetLibrary.type, "video")));
    const [favorites] = await db.select({ count: sql<number>`count(*)` })
      .from(assetLibrary).where(and(eq(assetLibrary.userId, ctx.user.id), eq(assetLibrary.isFavorite, true)));

    return {
      total: Number(total?.count ?? 0),
      images: Number(images?.count ?? 0),
      videos: Number(videos?.count ?? 0),
      favorites: Number(favorites?.count ?? 0),
    };
  }),

  // ---- Model Registry (list available models) ----
  listModels: protectedProcedure
    .input(z.object({
      type: z.enum(["image_gen", "video_gen", "face", "character", "style", "object", "voice"]).optional(),
    }).default({}))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [eq(modelRegistry.status, "active")];
      if (input.type) conditions.push(eq(modelRegistry.type, input.type));

      return db.select().from(modelRegistry)
        .where(and(...conditions))
        .orderBy(asc(modelRegistry.name));
    }),
});
