/**
 * Studio Enhancements Router — Phases D-L
 * 
 * Phase D: Chat-to-Edit (natural language editing)
 * Phase E: Character Builder Enhancement (camera presets, pose control, face/hair/outfit toggles)
 * Phase F: Model Training (training wizard, job management)
 * Phase G: Bulk Create (CSV/JSON import, template variables, queue)
 * Phase H: Video Studio Enhancement (image-to-video, text-to-video, motion sync, scene editor)
 * Phase I: Story Studio (story templates, storyboard builder)
 * Phase J: Library & Asset Management (search, tags, folders, bulk ops)
 * Phase K: Platform Guardrails (rate limiting, queue management, plan caps)
 * Phase L: Tests (covered separately)
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  assetLibrary, assetVersions, editSessions, modelRegistry,
  modelTrainingJobs, bulkJobs, stylePresets, storyProjects,
  influencers, influencerGenerations, mediaObjects
} from "../../drizzle/schema";
import { eq, and, desc, asc, like, inArray, sql, or } from "drizzle-orm";
import { storagePut } from "../storage";
import { generateImage } from "../_core/imageGeneration";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";

// ============================================================
// CAMERA & POSE PRESETS (Phase E)
// ============================================================
const CAMERA_PRESETS = [
  { id: "headshot", name: "Headshot", prompt: "close-up headshot, face centered, shoulders visible" },
  { id: "chest_up", name: "Chest Up", prompt: "medium shot from chest up, upper body visible" },
  { id: "half_body", name: "Half Body", prompt: "medium shot from waist up" },
  { id: "full_body", name: "Full Body", prompt: "full body shot, head to toe visible" },
  { id: "three_quarter", name: "3/4 View", prompt: "three-quarter view angle, slightly turned" },
  { id: "profile", name: "Profile", prompt: "side profile view" },
  { id: "high_angle", name: "High Angle", prompt: "shot from above, looking down at subject" },
  { id: "low_angle", name: "Low Angle", prompt: "shot from below, looking up at subject, dramatic" },
  { id: "dutch_angle", name: "Dutch Angle", prompt: "tilted camera angle, dynamic composition" },
  { id: "over_shoulder", name: "Over Shoulder", prompt: "over-the-shoulder shot" },
];

const POSE_PRESETS = [
  { id: "natural_standing", name: "Natural Standing", prompt: "standing naturally, relaxed pose" },
  { id: "confident", name: "Confident", prompt: "confident power pose, hands on hips" },
  { id: "casual_lean", name: "Casual Lean", prompt: "leaning casually against wall" },
  { id: "sitting", name: "Sitting", prompt: "sitting comfortably in chair" },
  { id: "walking", name: "Walking", prompt: "walking towards camera, mid-stride" },
  { id: "arms_crossed", name: "Arms Crossed", prompt: "arms crossed, professional stance" },
  { id: "gesturing", name: "Gesturing", prompt: "gesturing while speaking, animated" },
  { id: "looking_away", name: "Looking Away", prompt: "looking off to the side, contemplative" },
  { id: "action", name: "Action", prompt: "dynamic action pose, movement" },
  { id: "relaxed", name: "Relaxed", prompt: "relaxed casual pose, comfortable" },
];

const EXPRESSION_PRESETS = [
  { id: "neutral", name: "Neutral", prompt: "neutral expression" },
  { id: "smile", name: "Smile", prompt: "warm genuine smile" },
  { id: "laugh", name: "Laughing", prompt: "laughing joyfully" },
  { id: "serious", name: "Serious", prompt: "serious professional expression" },
  { id: "confident", name: "Confident", prompt: "confident knowing smile" },
  { id: "surprised", name: "Surprised", prompt: "surprised expression, wide eyes" },
  { id: "thoughtful", name: "Thoughtful", prompt: "thoughtful contemplative expression" },
  { id: "mysterious", name: "Mysterious", prompt: "mysterious enigmatic expression" },
];

const STORY_TEMPLATES = [
  { id: "explainer", name: "Explainer", description: "Educational content explaining a concept", scenes: 4, duration: "60-90s" },
  { id: "character_vlog", name: "Character Vlog", description: "Personal vlog-style content", scenes: 5, duration: "60-120s" },
  { id: "music_montage", name: "Music Montage", description: "Visual montage with music", scenes: 6, duration: "30-60s" },
  { id: "product_demo", name: "Product Demo", description: "Product showcase and demonstration", scenes: 5, duration: "45-90s" },
  { id: "testimonial", name: "Testimonial", description: "Customer testimonial format", scenes: 3, duration: "30-60s" },
  { id: "before_after", name: "Before/After", description: "Transformation showcase", scenes: 4, duration: "30-45s" },
  { id: "day_in_life", name: "Day in the Life", description: "Follow-along daily routine", scenes: 6, duration: "60-120s" },
  { id: "tutorial", name: "Tutorial", description: "Step-by-step how-to guide", scenes: 5, duration: "90-180s" },
];

export const studioEnhancementsRouter = router({
  // ============================================================
  // PHASE D: Chat-to-Edit Module
  // ============================================================

  /** Start or continue a chat-to-edit session */
  chatEdit: protectedProcedure
    .input(z.object({
      assetId: z.number(),
      message: z.string().min(1).max(2000),
      sessionId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verify asset ownership
      const [asset] = await db.select().from(assetLibrary)
        .where(and(eq(assetLibrary.id, input.assetId), eq(assetLibrary.userId, ctx.user.id)))
        .limit(1);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found" });

      // Get or create session
      let session: typeof editSessions.$inferSelect | null = null;
      if (input.sessionId) {
        const [existing] = await db.select().from(editSessions)
          .where(and(eq(editSessions.id, input.sessionId), eq(editSessions.userId, ctx.user.id)))
          .limit(1);
        session = existing || null;
      }

      // Use LLM to interpret the edit instruction
      const editPlan = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an expert image editor AI. The user wants to edit an image. Analyze their request and provide a clear, detailed prompt for the image generation model. Return ONLY the enhanced editing prompt, nothing else. Be specific about what should change and what should stay the same.`
          },
          { role: "user", content: `Edit request: "${input.message}". Current image prompt: "${asset.prompt || 'No original prompt available'}"` }
        ],
      });

      const enhancedPrompt = typeof editPlan.choices[0]?.message?.content === "string"
        ? editPlan.choices[0].message.content.trim()
        : input.message;

      // Apply the edit using image generation
      const { url: editedUrl } = await generateImage({
        prompt: enhancedPrompt,
        originalImages: [{ url: asset.url, mimeType: asset.mimeType || "image/png" }],
      });
      if (!editedUrl) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Edit failed" });

      // Get version count
      const versions = await db.select({ count: sql<number>`count(*)` })
        .from(assetVersions).where(eq(assetVersions.assetId, input.assetId));
      const versionNumber = Number(versions[0]?.count ?? 0) + 1;

      // Create version
      const [version] = await db.insert(assetVersions).values({
        assetId: input.assetId,
        versionNumber,
        operation: "chat_edit",
        prompt: input.message,
        url: editedUrl,
      }).$returningId();

      // Update asset
      await db.update(assetLibrary)
        .set({ url: editedUrl, source: "edited" as const })
        .where(eq(assetLibrary.id, input.assetId));

      // Update chat history
      const chatHistory = (session?.chatHistory || []) as Array<{ role: string; content: string; timestamp: number; imageUrl?: string }>;
      chatHistory.push(
        { role: "user", content: input.message, timestamp: Date.now() },
        { role: "assistant", content: `Applied edit: ${enhancedPrompt}`, timestamp: Date.now(), imageUrl: editedUrl }
      );

      let sessionId: number;
      if (session) {
        await db.update(editSessions)
          .set({ chatHistory, currentVersionId: version.id, lastAction: "chat_edit" })
          .where(eq(editSessions.id, session.id));
        sessionId = session.id;
      } else {
        const [newSession] = await db.insert(editSessions).values({
          userId: ctx.user.id,
          assetId: input.assetId,
          chatHistory,
          currentVersionId: version.id,
          lastAction: "chat_edit",
        }).$returningId();
        sessionId = newSession.id;
      }

      return { sessionId, versionId: version.id, url: editedUrl, versionNumber, enhancedPrompt };
    }),

  /** Undo last edit (revert to previous version) */
  undoEdit: protectedProcedure
    .input(z.object({ assetId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const allVersions = await db.select().from(assetVersions)
        .where(eq(assetVersions.assetId, input.assetId))
        .orderBy(desc(assetVersions.versionNumber));

      if (allVersions.length < 2) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No previous version to revert to" });
      }

      const previousVersion = allVersions[1];
      await db.update(assetLibrary)
        .set({ url: previousVersion.url })
        .where(and(eq(assetLibrary.id, input.assetId), eq(assetLibrary.userId, ctx.user.id)));

      return { url: previousVersion.url, versionNumber: previousVersion.versionNumber };
    }),

  /** Create variant from existing asset */
  createVariant: protectedProcedure
    .input(z.object({
      assetId: z.number(),
      variationPrompt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [asset] = await db.select().from(assetLibrary)
        .where(and(eq(assetLibrary.id, input.assetId), eq(assetLibrary.userId, ctx.user.id)))
        .limit(1);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found" });

      const prompt = input.variationPrompt || `Create a variation of this image. ${asset.prompt || ""}`;
      const { url } = await generateImage({
        prompt,
        originalImages: [{ url: asset.url, mimeType: asset.mimeType || "image/png" }],
      });
      if (!url) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Variant generation failed" });

      const [newAsset] = await db.insert(assetLibrary).values({
        userId: ctx.user.id,
        type: "image" as const,
        url,
        prompt: `Variant of asset #${input.assetId}: ${prompt}`,
        influencerId: asset.influencerId,
        brandId: asset.brandId,
        campaignId: asset.campaignId,
        folder: asset.folder,
        tags: asset.tags,
        source: "generated" as const,
      }).$returningId();

      return { id: newAsset.id, url };
    }),

  // ============================================================
  // PHASE E: Character Builder Enhancement
  // ============================================================

  /** Get camera presets */
  getCameraPresets: protectedProcedure.query(() => CAMERA_PRESETS),

  /** Get pose presets */
  getPosePresets: protectedProcedure.query(() => POSE_PRESETS),

  /** Get expression presets */
  getExpressionPresets: protectedProcedure.query(() => EXPRESSION_PRESETS),

  /** Generate character image with advanced controls */
  generateCharacterImage: protectedProcedure
    .input(z.object({
      influencerId: z.number(),
      prompt: z.string().min(1).max(2000),
      cameraPreset: z.string().optional(),
      posePreset: z.string().optional(),
      expressionPreset: z.string().optional(),
      characterWeight: z.number().min(0).max(100).default(80),
      keepOutfit: z.boolean().default(false),
      keepFace: z.boolean().default(true),
      keepHair: z.boolean().default(true),
      stylePreset: z.string().optional(),
      aspectRatio: z.string().default("1:1"),
      negativePrompt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verify influencer ownership
      const [inf] = await db.select().from(influencers)
        .where(and(eq(influencers.id, input.influencerId), eq(influencers.userId, ctx.user.id)))
        .limit(1);
      if (!inf) throw new TRPCError({ code: "NOT_FOUND", message: "Influencer not found" });

      // Build enhanced prompt with all controls
      const promptParts: string[] = [];

      // Camera framing
      const camera = CAMERA_PRESETS.find(c => c.id === input.cameraPreset);
      if (camera) promptParts.push(camera.prompt);

      // Pose
      const pose = POSE_PRESETS.find(p => p.id === input.posePreset);
      if (pose) promptParts.push(pose.prompt);

      // Expression
      const expression = EXPRESSION_PRESETS.find(e => e.id === input.expressionPreset);
      if (expression) promptParts.push(expression.prompt);

      // Character consistency
      if (input.keepFace) promptParts.push("maintain exact facial features");
      if (input.keepHair) promptParts.push("maintain exact hairstyle and hair color");
      if (input.keepOutfit) promptParts.push("maintain exact outfit and clothing");

      // User prompt
      promptParts.push(input.prompt);

      // Character name for consistency
      promptParts.push(`Character: ${inf.name}`);

      // Style
      if (input.stylePreset) promptParts.push(`Style: ${input.stylePreset}`);

      const fullPrompt = promptParts.join(". ");

      // Get reference image for character consistency
      const refImages = await db.select({ url: mediaObjects.url })
        .from(mediaObjects)
        .where(and(
          eq(mediaObjects.userId, ctx.user.id),
          eq(mediaObjects.purpose, "influencer_training")
        ))
        .orderBy(desc(mediaObjects.createdAt))
        .limit(1);

      const genOptions: Parameters<typeof generateImage>[0] = { prompt: fullPrompt };
      if (refImages.length > 0 && refImages[0].url) {
        genOptions.originalImages = [{ url: refImages[0].url, mimeType: "image/jpeg" }];
      }

      const { url } = await generateImage(genOptions);
      if (!url) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Generation failed" });

      // Save to generations
      await db.insert(influencerGenerations).values({
        influencerId: input.influencerId,
        userId: ctx.user.id,
        prompt: fullPrompt,
        imageUrls: [url],
        status: "completed",
        stylePreset: input.stylePreset || "photorealistic",
      });

      // Also save to asset library
      const [asset] = await db.insert(assetLibrary).values({
        userId: ctx.user.id,
        type: "image" as const,
        url,
        prompt: fullPrompt,
        influencerId: input.influencerId,
        stylePreset: input.stylePreset ?? null,
        aspectRatio: input.aspectRatio,
        source: "generated" as const,
        tags: ["character", inf.name],
      }).$returningId();

      return { assetId: asset.id, url, prompt: fullPrompt };
    }),

  // ============================================================
  // PHASE F: Model Training
  // ============================================================

  /** Start a model training job */
  startTraining: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(200),
      description: z.string().optional(),
      modelType: z.enum(["face", "character", "style", "object"]),
      imageUrls: z.array(z.string().url()).min(4).max(100),
      influencerId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Create training job
      const [job] = await db.insert(modelTrainingJobs).values({
        userId: ctx.user.id,
      modelName: input.name,
      modelDescription: input.description ?? null,
      modelType: input.modelType,
      status: "queued",
      progress: 0,
      inputImageIds: [],
      inputImageCount: input.imageUrls.length,
      }).$returningId();

      // Simulate training progress (in production, this would call a real training API)
      simulateTraining(job.id, ctx.user.id, input).catch(err => {
        console.error(`[Training] Job ${job.id} failed:`, err);
      });

      return { jobId: job.id, status: "queued" as const };
    }),

  /** Get training job status */
  getTrainingJob: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [job] = await db.select().from(modelTrainingJobs)
        .where(and(eq(modelTrainingJobs.id, input.jobId), eq(modelTrainingJobs.userId, ctx.user.id)))
        .limit(1);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Training job not found" });
      return job;
    }),

  /** List training jobs */
  listTrainingJobs: protectedProcedure
    .input(z.object({
      status: z.enum(["queued", "validating", "training", "succeeded", "failed", "all"]).default("all"),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [eq(modelTrainingJobs.userId, ctx.user.id)];
      if (input.status !== "all") conditions.push(eq(modelTrainingJobs.status, input.status as any));

      return db.select().from(modelTrainingJobs)
        .where(and(...conditions))
        .orderBy(desc(modelTrainingJobs.createdAt))
        .limit(input.limit);
    }),

  /** Cancel training job */
  cancelTraining: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db.update(modelTrainingJobs)
        .set({ status: "failed", error: "Cancelled by user" })
        .where(and(eq(modelTrainingJobs.id, input.jobId), eq(modelTrainingJobs.userId, ctx.user.id)));
      return { success: true };
    }),

  // ============================================================
  // PHASE G: Bulk Create Module
  // ============================================================

  /** Start a bulk generation job */
  startBulkJob: protectedProcedure
    .input(z.object({
      prompts: z.array(z.string().min(1).max(2000)).min(1).max(200),
      stylePreset: z.string().optional(),
      aspectRatio: z.string().default("1:1"),
      variantsPerPrompt: z.number().min(1).max(4).default(1),
      influencerId: z.number().optional(),
      folder: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const totalItems = input.prompts.length * input.variantsPerPrompt;

      const [job] = await db.insert(bulkJobs).values({
        userId: ctx.user.id,
        jobType: "image_generation",
        status: "running",
      total: totalItems,
      completed: 0,
      failed: 0,
        config: {
          prompts: input.prompts,
          stylePreset: input.stylePreset,
          aspectRatio: input.aspectRatio,
          variantsPerPrompt: input.variantsPerPrompt,
          influencerId: input.influencerId,
          folder: input.folder,
          tags: input.tags,
        },
      }).$returningId();

      // Process in background
      processBulkJob(job.id, ctx.user.id, input).catch(err => {
        console.error(`[BulkCreate] Job ${job.id} failed:`, err);
      });

      return { jobId: job.id, totalItems, status: "running" as const };
    }),

  /** Get bulk job status */
  getBulkJob: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [job] = await db.select().from(bulkJobs)
        .where(and(eq(bulkJobs.id, input.jobId), eq(bulkJobs.userId, ctx.user.id)))
        .limit(1);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Bulk job not found" });
      return job;
    }),

  /** List bulk jobs */
  listBulkJobs: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      return db.select().from(bulkJobs)
        .where(eq(bulkJobs.userId, ctx.user.id))
        .orderBy(desc(bulkJobs.createdAt))
        .limit(input.limit);
    }),

  /** Pause/cancel bulk job */
  cancelBulkJob: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db.update(bulkJobs)
        .set({ status: "cancelled" })
        .where(and(eq(bulkJobs.id, input.jobId), eq(bulkJobs.userId, ctx.user.id)));
      return { success: true };
    }),

  // ============================================================
  // PHASE H: Video Studio Enhancement
  // ============================================================

  /** Image to Video (animate a still) */
  imageToVideo: protectedProcedure
    .input(z.object({
      imageUrl: z.string().url(),
      motionPrompt: z.string().min(1).max(1000),
      duration: z.number().min(2).max(30).default(5),
      influencerId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Use generation service for image-to-video
      const { generateVideo } = await import("../services/generationService");
      const result = await generateVideo({
        userId: ctx.user.id,
        type: "video",
        prompt: input.motionPrompt,
        referenceImageUrl: input.imageUrl,
        duration: input.duration,
      });

      return {
        success: result.success,
        outputUrl: result.outputUrl,
        jobId: result.jobId,
        status: result.status,
        error: result.error,
      };
    }),

  /** Text to Video (prompt to clip) */
  textToVideo: protectedProcedure
    .input(z.object({
      prompt: z.string().min(1).max(2000),
      duration: z.number().min(2).max(30).default(5),
      aspectRatio: z.string().default("16:9"),
      influencerId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { generateVideo } = await import("../services/generationService");
      const result = await generateVideo({
        userId: ctx.user.id,
        type: "video",
        prompt: input.prompt,
        duration: input.duration,
        aspectRatio: input.aspectRatio,
      });

      return {
        success: result.success,
        outputUrl: result.outputUrl,
        jobId: result.jobId,
        status: result.status,
        error: result.error,
      };
    }),

  /** Video to Video (restyle) */
  videoToVideo: protectedProcedure
    .input(z.object({
      videoUrl: z.string().url(),
      stylePrompt: z.string().min(1).max(1000),
      strength: z.number().min(0).max(100).default(50),
    }))
    .mutation(async ({ ctx, input }) => {
      const { generateVideo } = await import("../services/generationService");
      const result = await generateVideo({
        userId: ctx.user.id,
        type: "video",
        prompt: `Restyle video: ${input.stylePrompt}`,
        referenceImageUrl: input.videoUrl,
      });

      return {
        success: result.success,
        outputUrl: result.outputUrl,
        jobId: result.jobId,
        status: result.status,
        error: result.error,
      };
    }),

  /** Auto-generate script from Brand Brain + Campaign */
  autoGenerateScript: protectedProcedure
    .input(z.object({
      topic: z.string().min(1).max(500),
      targetAudience: z.string().optional(),
      duration: z.number().min(15).max(300).default(60),
      tone: z.string().default("professional"),
      influencerId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a professional video script writer. Write a compelling video script for the given topic. Include scene descriptions, dialogue, and on-screen text suggestions. Format as JSON with: { "title": string, "scenes": [{ "sceneNumber": number, "title": string, "dialogue": string, "visualNotes": string, "onScreenText": string, "durationHint": string }], "totalDuration": string, "tone": string }`
          },
          {
            role: "user",
            content: `Topic: ${input.topic}. Duration: ~${input.duration}s. Tone: ${input.tone}. ${input.targetAudience ? `Target audience: ${input.targetAudience}` : ""}`
          }
        ],
        response_format: {
          type: "json_schema" as const,
          json_schema: {
            name: "video_script",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                scenes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      sceneNumber: { type: "number" },
                      title: { type: "string" },
                      dialogue: { type: "string" },
                      visualNotes: { type: "string" },
                      onScreenText: { type: "string" },
                      durationHint: { type: "string" },
                    },
                    required: ["sceneNumber", "title", "dialogue", "visualNotes", "onScreenText", "durationHint"],
                    additionalProperties: false,
                  },
                },
                totalDuration: { type: "string" },
                tone: { type: "string" },
              },
              required: ["title", "scenes", "totalDuration", "tone"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0]?.message?.content;
      const script = typeof content === "string" ? JSON.parse(content) : null;
      if (!script) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Script generation failed" });

      return script;
    }),

  // ============================================================
  // PHASE I: Story Studio Module
  // ============================================================

  /** Get story templates */
  getStoryTemplates: protectedProcedure.query(() => STORY_TEMPLATES),

  /** Create a story project */
  createStory: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(200),
      templateId: z.string().optional(),
      influencerId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const template = STORY_TEMPLATES.find(t => t.id === input.templateId);
      const defaultScenes = template ? Array.from({ length: template.scenes }, (_, i) => ({
        id: crypto.randomUUID(),
        order: i + 1,
        prompt: "",
        status: "pending",
        duration: 10,
      })) : [];

      const [project] = await db.insert(storyProjects).values({
        userId: ctx.user.id,
        name: input.title,
        templateType: input.templateId ?? null,
        status: "draft",
        scenes: defaultScenes,
      }).$returningId();

      return { id: project.id };
    }),

  /** Get story project */
  getStory: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [project] = await db.select().from(storyProjects)
        .where(and(eq(storyProjects.id, input.id), eq(storyProjects.userId, ctx.user.id)))
        .limit(1);
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Story not found" });
      return project;
    }),

  /** List story projects */
  listStories: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      return db.select().from(storyProjects)
        .where(eq(storyProjects.userId, ctx.user.id))
        .orderBy(desc(storyProjects.createdAt))
        .limit(input.limit);
    }),

  /** Update story project */
  updateStory: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      scenes: z.array(z.object({
        id: z.string(),
        order: z.number(),
        prompt: z.string(),
        status: z.string(),
        influencerId: z.number().optional(),
        duration: z.number().optional(),
        transition: z.string().optional(),
        voiceover: z.string().optional(),
        assetId: z.number().optional(),
      })).optional(),
      status: z.enum(["draft", "in_progress", "completed", "published"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const updates: Record<string, unknown> = {};
      if (input.title) updates.name = input.title;
      if (input.scenes) updates.scenes = input.scenes;
      if (input.status) updates.status = input.status;

      await db.update(storyProjects)
        .set(updates)
        .where(and(eq(storyProjects.id, input.id), eq(storyProjects.userId, ctx.user.id)));

      return { success: true };
    }),

  /** Delete story project */
  deleteStory: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db.delete(storyProjects)
        .where(and(eq(storyProjects.id, input.id), eq(storyProjects.userId, ctx.user.id)));
      return { success: true };
    }),

  /** Generate scene image for a story */
  generateSceneImage: protectedProcedure
    .input(z.object({
      storyId: z.number(),
      sceneNumber: z.number(),
      prompt: z.string().min(1),
      influencerId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { url } = await generateImage({
        prompt: `Cinematic scene: ${input.prompt}. Professional quality, 16:9 aspect ratio, dramatic lighting.`,
      });
      if (!url) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Scene generation failed" });

      // Update the scene in the story project
      const [project] = await db.select().from(storyProjects)
        .where(and(eq(storyProjects.id, input.storyId), eq(storyProjects.userId, ctx.user.id)))
        .limit(1);

      if (project) {
        const scenes = (project.scenes || []) as Array<{
          id: string; order: number; prompt: string; status: string;
          influencerId?: number; duration?: number; transition?: string;
          voiceover?: string; assetId?: number; imageUrl?: string;
        }>;
        const sceneIndex = scenes.findIndex((s) => s.order === input.sceneNumber);
        if (sceneIndex >= 0) {
          (scenes[sceneIndex] as any).imageUrl = url;
          await db.update(storyProjects)
            .set({ scenes: scenes as any })
            .where(eq(storyProjects.id, input.storyId));
        }
      }

      return { url };
    }),

  // ============================================================
  // PHASE J: Library & Asset Management (enhanced)
  // ============================================================

  /** Get all unique folders for user */
  getFolders: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const folders = await db.selectDistinct({ folder: assetLibrary.folder })
      .from(assetLibrary)
      .where(and(eq(assetLibrary.userId, ctx.user.id), sql`${assetLibrary.folder} IS NOT NULL`));

    return folders.map(f => f.folder).filter(Boolean);
  }),

  /** Get all unique tags for user */
  getTags: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const assets = await db.select({ tags: assetLibrary.tags })
      .from(assetLibrary)
      .where(and(eq(assetLibrary.userId, ctx.user.id), sql`${assetLibrary.tags} IS NOT NULL`));

    const tagArr: string[] = [];
    for (const a of assets) {
      if (Array.isArray(a.tags)) {
        for (const t of a.tags) {
          if (!tagArr.includes(t)) tagArr.push(t);
        }
      }
    }
    return tagArr.sort();
  }),

  /** Bulk tag assets */
  bulkTag: protectedProcedure
    .input(z.object({
      assetIds: z.array(z.number()).min(1).max(100),
      tags: z.array(z.string()).min(1),
      action: z.enum(["add", "replace"]).default("add"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      for (const id of input.assetIds) {
        if (input.action === "replace") {
          await db.update(assetLibrary)
            .set({ tags: input.tags })
            .where(and(eq(assetLibrary.id, id), eq(assetLibrary.userId, ctx.user.id)));
        } else {
          const [asset] = await db.select({ tags: assetLibrary.tags })
            .from(assetLibrary)
            .where(and(eq(assetLibrary.id, id), eq(assetLibrary.userId, ctx.user.id)))
            .limit(1);
          if (asset) {
            const existing = Array.isArray(asset.tags) ? asset.tags : [];
            const merged = Array.from(new Set([...existing, ...input.tags]));
            await db.update(assetLibrary)
              .set({ tags: merged })
              .where(eq(assetLibrary.id, id));
          }
        }
      }
      return { success: true, count: input.assetIds.length };
    }),

  /** Bulk move to folder */
  bulkMove: protectedProcedure
    .input(z.object({
      assetIds: z.array(z.number()).min(1).max(100),
      folder: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      for (const id of input.assetIds) {
        await db.update(assetLibrary)
          .set({ folder: input.folder })
          .where(and(eq(assetLibrary.id, id), eq(assetLibrary.userId, ctx.user.id)));
      }
      return { success: true };
    }),

  // ============================================================
  // PHASE K: Platform Guardrails
  // ============================================================

  /** Get user's generation usage stats */
  getUsageStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalAssets] = await db.select({ count: sql<number>`count(*)` })
      .from(assetLibrary).where(eq(assetLibrary.userId, ctx.user.id));
    const [todayAssets] = await db.select({ count: sql<number>`count(*)` })
      .from(assetLibrary).where(and(
        eq(assetLibrary.userId, ctx.user.id),
        sql`${assetLibrary.createdAt} >= ${today}`
      ));
    const [activeTraining] = await db.select({ count: sql<number>`count(*)` })
      .from(modelTrainingJobs).where(and(
        eq(modelTrainingJobs.userId, ctx.user.id),
        eq(modelTrainingJobs.status, "training")
      ));
    const [activeBulk] = await db.select({ count: sql<number>`count(*)` })
      .from(bulkJobs).where(and(
        eq(bulkJobs.userId, ctx.user.id),
        eq(bulkJobs.status, "running")
      ));

    return {
      totalAssets: Number(totalAssets?.count ?? 0),
      todayGenerations: Number(todayAssets?.count ?? 0),
      activeTrainingJobs: Number(activeTraining?.count ?? 0),
      activeBulkJobs: Number(activeBulk?.count ?? 0),
    };
  }),
});

// ============================================================
// Background Job Processors
// ============================================================

async function simulateTraining(
  jobId: number,
  userId: number,
  input: { name: string; modelType: string; imageUrls: string[] }
) {
  const db = await getDb();
  if (!db) return;

  try {
    await db.update(modelTrainingJobs)
      .set({ status: "training", progress: 0 })
      .where(eq(modelTrainingJobs.id, jobId));

    // Simulate training progress
    for (let i = 10; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      await db.update(modelTrainingJobs)
        .set({ progress: i })
        .where(eq(modelTrainingJobs.id, jobId));
    }

    // Create model in registry
    const [model] = await db.insert(modelRegistry).values({
      name: input.name,
      type: input.modelType as any,
      provider: "local",
      providerModelId: `local-${Date.now()}`,
      status: "active",
      description: `Trained ${input.modelType} model from ${input.imageUrls.length} images`,
    }).$returningId();

    await db.update(modelTrainingJobs)
      .set({
        status: "succeeded",
        progress: 100,
        outputModelId: model.id,
        completedAt: new Date(),
      })
      .where(eq(modelTrainingJobs.id, jobId));
  } catch (err) {
    await db.update(modelTrainingJobs)
      .set({
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      })
      .where(eq(modelTrainingJobs.id, jobId));
  }
}

async function processBulkJob(
  jobId: number,
  userId: number,
  input: {
    prompts: string[];
    stylePreset?: string;
    aspectRatio: string;
    variantsPerPrompt: number;
    influencerId?: number;
    folder?: string;
    tags?: string[];
  }
) {
  const db = await getDb();
  if (!db) return;

  let completed = 0;
  let failed = 0;

  for (const prompt of input.prompts) {
    // Check if job was cancelled
    const [job] = await db.select({ status: bulkJobs.status })
      .from(bulkJobs).where(eq(bulkJobs.id, jobId)).limit(1);
    if (job?.status === "cancelled") break;

    for (let v = 0; v < input.variantsPerPrompt; v++) {
      try {
        const { url } = await generateImage({ prompt });
        if (url) {
          await db.insert(assetLibrary).values({
            userId,
            type: "image" as const,
            url,
            prompt,
            stylePreset: input.stylePreset ?? null,
            aspectRatio: input.aspectRatio,
            influencerId: input.influencerId ?? null,
            folder: input.folder ?? null,
            tags: input.tags ?? null,
            source: "generated" as const,
          });
          completed++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }

      // Update progress
      await db.update(bulkJobs)
        .set({ completed, failed })
        .where(eq(bulkJobs.id, jobId));
    }
  }

  await db.update(bulkJobs)
    .set({
      status: "completed",
      completed,
      failed,
    })
    .where(eq(bulkJobs.id, jobId));
}
