/**
 * Influencer Studio V2 Router
 * 
 * Canonical endpoints for:
 *  - Upload reference images → S3 + media_objects
 *  - Link images to influencer → influencer_images
 *  - Trigger training → influencer_training_jobs
 *  - Gallery: list all media for an influencer
 *  - Generate images from trained model
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { 
  mediaObjects, influencerImages, influencerTrainingJobs, 
  influencers, influencerGenerations 
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { storagePut, storageGet } from "../storage";
import { getTrainingProvider } from "../services/modelProviders";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";

export const influencerStudioV2Router = router({
  // ---- Upload Reference Image ----
  uploadImage: protectedProcedure
    .input(z.object({
      influencerId: z.number(),
      base64Data: z.string(),
      contentType: z.string().default("image/png"),
      originalName: z.string().optional(),
      role: z.enum(["training", "reference", "hero"]).default("training"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const userId = ctx.user.id;

      // Verify influencer ownership
      const [inf] = await db
        .select()
        .from(influencers)
        .where(and(eq(influencers.id, input.influencerId), eq(influencers.userId, userId)))
        .limit(1);
      if (!inf) throw new TRPCError({ code: "NOT_FOUND", message: "Influencer not found" });

      // Decode base64
      const buffer = Buffer.from(input.base64Data, "base64");
      const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
      const ext = input.contentType.split("/")[1] || "png";
      const suffix = crypto.randomBytes(4).toString("hex");
      const objectKey = `influencers/${userId}/${input.influencerId}/images/${Date.now()}-${suffix}.${ext}`;

      // Upload to S3
      const { url } = await storagePut(objectKey, buffer, input.contentType);

      // Insert media_objects row
      const [mediaRow] = await db.insert(mediaObjects).values({
        userId,
        kind: "image",
        purpose: `influencer_${input.role}`,
        objectKey,
        contentType: input.contentType,
        bytes: buffer.length,
        sha256,
        url,
        originalName: input.originalName ?? null,
      });

      const mediaId = mediaRow.insertId;

      // Link to influencer
      await db.insert(influencerImages).values({
        influencerId: input.influencerId,
        mediaId: Number(mediaId),
        role: input.role,
      });

      return { mediaId: Number(mediaId), url, objectKey };
    }),

  // ---- List Images for Influencer ----
  listImages: protectedProcedure
    .input(z.object({
      influencerId: z.number(),
      role: z.enum(["training", "reference", "hero", "all"]).default("all"),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const userId = ctx.user.id;

      // Verify ownership
      const [inf] = await db
        .select()
        .from(influencers)
        .where(and(eq(influencers.id, input.influencerId), eq(influencers.userId, userId)))
        .limit(1);
      if (!inf) throw new TRPCError({ code: "NOT_FOUND", message: "Influencer not found" });

      // Get linked images
      const links = await db
        .select({
          linkId: influencerImages.id,
          mediaId: influencerImages.mediaId,
          role: influencerImages.role,
          linkCreatedAt: influencerImages.createdAt,
          kind: mediaObjects.kind,
          url: mediaObjects.url,
          contentType: mediaObjects.contentType,
          bytes: mediaObjects.bytes,
          originalName: mediaObjects.originalName,
          mediaCreatedAt: mediaObjects.createdAt,
        })
        .from(influencerImages)
        .innerJoin(mediaObjects, eq(influencerImages.mediaId, mediaObjects.id))
        .where(
          input.role === "all"
            ? eq(influencerImages.influencerId, input.influencerId)
            : and(
                eq(influencerImages.influencerId, input.influencerId),
                eq(influencerImages.role, input.role)
              )
        )
        .orderBy(desc(influencerImages.createdAt));

      return links;
    }),

  // ---- Remove Image from Influencer ----
  removeImage: protectedProcedure
    .input(z.object({
      influencerId: z.number(),
      linkId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const userId = ctx.user.id;

      // Verify ownership
      const [inf] = await db
        .select()
        .from(influencers)
        .where(and(eq(influencers.id, input.influencerId), eq(influencers.userId, userId)))
        .limit(1);
      if (!inf) throw new TRPCError({ code: "NOT_FOUND", message: "Influencer not found" });

      await db.delete(influencerImages).where(
        and(
          eq(influencerImages.id, input.linkId),
          eq(influencerImages.influencerId, input.influencerId)
        )
      );

      return { success: true };
    }),

  // ---- Start Training ----
  startTraining: protectedProcedure
    .input(z.object({
      influencerId: z.number(),
      provider: z.string().default("local"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const userId = ctx.user.id;

      // Verify ownership
      const [inf] = await db
        .select()
        .from(influencers)
        .where(and(eq(influencers.id, input.influencerId), eq(influencers.userId, userId)))
        .limit(1);
      if (!inf) throw new TRPCError({ code: "NOT_FOUND", message: "Influencer not found" });

      // Check for existing active training
      const [activeJob] = await db
        .select()
        .from(influencerTrainingJobs)
        .where(
          and(
            eq(influencerTrainingJobs.influencerId, input.influencerId),
            eq(influencerTrainingJobs.status, "processing")
          )
        )
        .limit(1);
      if (activeJob) {
        throw new TRPCError({ code: "CONFLICT", message: "Training already in progress" });
      }

      // Get training images
      const images = await db
        .select({ url: mediaObjects.url })
        .from(influencerImages)
        .innerJoin(mediaObjects, eq(influencerImages.mediaId, mediaObjects.id))
        .where(
          and(
            eq(influencerImages.influencerId, input.influencerId),
            eq(influencerImages.role, "training")
          )
        );

      if (images.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Upload at least 1 training image first" });
      }

      const imageUrls = images.map((i) => i.url).filter((u): u is string => !!u);

      // Create training job
      const [jobRow] = await db.insert(influencerTrainingJobs).values({
        influencerId: input.influencerId,
        userId,
        name: `Training ${inf.name} - ${new Date().toISOString().slice(0, 10)}`,
        creationMethod: "image_upload",
        status: "processing",
        progress: 0,
        referenceImages: imageUrls,
      });

      const jobId = Number(jobRow.insertId);

      // Run training asynchronously
      const provider = getTrainingProvider(input.provider);

      // Fire and forget — progress updates go to DB
      provider
        .train(
          { imageUrls, influencerId: input.influencerId, userId },
          async (progress) => {
            await db
              .update(influencerTrainingJobs)
              .set({ progress })
              .where(eq(influencerTrainingJobs.id, jobId));
          }
        )
        .then(async (result) => {
          await db
            .update(influencerTrainingJobs)
            .set({
              status: "completed",
              progress: 100,
              modelId: result.modelRef,
              completedAt: new Date(),
            })
            .where(eq(influencerTrainingJobs.id, jobId));
        })
        .catch(async (err) => {
          await db
            .update(influencerTrainingJobs)
            .set({
              status: "failed",
              errorMessage: err instanceof Error ? err.message : String(err),
            })
            .where(eq(influencerTrainingJobs.id, jobId));
        });

      return { jobId, status: "processing" };
    }),

  // ---- Get Training Status ----
  getTrainingStatus: protectedProcedure
    .input(z.object({
      influencerId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const userId = ctx.user.id;

      const jobs = await db
        .select()
        .from(influencerTrainingJobs)
        .where(
          and(
            eq(influencerTrainingJobs.influencerId, input.influencerId),
            eq(influencerTrainingJobs.userId, userId)
          )
        )
        .orderBy(desc(influencerTrainingJobs.createdAt))
        .limit(5);

      return jobs;
    }),

  // ---- Generate Image from Trained Model ----
  generateImage: protectedProcedure
    .input(z.object({
      influencerId: z.number(),
      prompt: z.string().min(1).max(2000),
      style: z.string().default("realistic"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const userId = ctx.user.id;

      // Verify ownership
      const [inf] = await db
        .select()
        .from(influencers)
        .where(and(eq(influencers.id, input.influencerId), eq(influencers.userId, userId)))
        .limit(1);
      if (!inf) throw new TRPCError({ code: "NOT_FOUND", message: "Influencer not found" });

      // Generate image using Manus image generation
      const { generateImage } = await import("../_core/imageGeneration");
      const result = await generateImage({
        prompt: `${input.prompt}. Style: ${input.style}. Character: ${inf.name}.`,
      });

      if (!result.url) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Image generation failed" });
      }

      // Download the generated image and upload to our S3
      const response = await fetch(result.url);
      const buffer = Buffer.from(await response.arrayBuffer());
      const suffix = crypto.randomBytes(4).toString("hex");
      const objectKey = `influencers/${userId}/${input.influencerId}/generated/${Date.now()}-${suffix}.png`;
      const { url } = await storagePut(objectKey, buffer, "image/png");

      // Save to media_objects
      const [mediaRow] = await db.insert(mediaObjects).values({
        userId,
        kind: "image",
        purpose: "generated_image",
        objectKey,
        contentType: "image/png",
        bytes: buffer.length,
        sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
        url,
      });

      // Save to influencer_generations
      await db.insert(influencerGenerations).values({
        influencerId: input.influencerId,
        userId,
        prompt: input.prompt,
        imageUrls: [url],
        status: "completed",
        stylePreset: input.style,
      });

      return { mediaId: Number(mediaRow.insertId), url };
    }),

  // ---- Gallery: List All Media for Influencer ----
  gallery: protectedProcedure
    .input(z.object({
      influencerId: z.number(),
      kind: z.enum(["image", "video", "audio", "all"]).default("all"),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const userId = ctx.user.id;

      // Get all media linked to this influencer
      const linkedMedia = await db
        .select({
          id: mediaObjects.id,
          kind: mediaObjects.kind,
          purpose: mediaObjects.purpose,
          url: mediaObjects.url,
          contentType: mediaObjects.contentType,
          bytes: mediaObjects.bytes,
          originalName: mediaObjects.originalName,
          createdAt: mediaObjects.createdAt,
        })
        .from(influencerImages)
        .innerJoin(mediaObjects, eq(influencerImages.mediaId, mediaObjects.id))
        .where(eq(influencerImages.influencerId, input.influencerId))
        .orderBy(desc(mediaObjects.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Also get generated images from influencer_generations
      const generations = await db
        .select()
        .from(influencerGenerations)
        .where(
          and(
            eq(influencerGenerations.influencerId, input.influencerId),
            eq(influencerGenerations.userId, userId)
          )
        )
        .orderBy(desc(influencerGenerations.createdAt))
        .limit(input.limit);

      return { linkedMedia, generations };
    }),

  // ---- Delete Influencer ----
  deleteInfluencer: protectedProcedure
    .input(z.object({ influencerId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const userId = ctx.user.id;

      // Verify ownership
      const [inf] = await db
        .select()
        .from(influencers)
        .where(and(eq(influencers.id, input.influencerId), eq(influencers.userId, userId)))
        .limit(1);
      if (!inf) throw new TRPCError({ code: "NOT_FOUND", message: "Influencer not found" });

      // Delete related data first (images, training jobs, generations)
      await db.delete(influencerImages).where(eq(influencerImages.influencerId, input.influencerId));
      await db.delete(influencerTrainingJobs).where(eq(influencerTrainingJobs.influencerId, input.influencerId));
      await db.delete(influencerGenerations).where(eq(influencerGenerations.influencerId, input.influencerId));
      
      // Delete the influencer itself
      await db.delete(influencers).where(eq(influencers.id, input.influencerId));

      return { success: true };
    }),

  // ---- Delete Generation ----
  deleteGeneration: protectedProcedure
    .input(z.object({ generationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const userId = ctx.user.id;

      // Verify ownership
      const [gen] = await db
        .select()
        .from(influencerGenerations)
        .where(and(eq(influencerGenerations.id, input.generationId), eq(influencerGenerations.userId, userId)))
        .limit(1);
      if (!gen) throw new TRPCError({ code: "NOT_FOUND", message: "Generation not found" });

      await db.delete(influencerGenerations).where(eq(influencerGenerations.id, input.generationId));
      return { success: true };
    }),

  // ---- Get Signed URL for Download ----
  getSignedUrl: protectedProcedure
    .input(z.object({ mediaId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [media] = await db
        .select()
        .from(mediaObjects)
        .where(and(eq(mediaObjects.id, input.mediaId), eq(mediaObjects.userId, ctx.user.id)))
        .limit(1);

      if (!media) throw new TRPCError({ code: "NOT_FOUND", message: "Media not found" });

      // If we have a cached URL, return it
      if (media.url) return { url: media.url };

      // Otherwise generate a signed URL
      const { url } = await storageGet(media.objectKey);
      return { url };
    }),
});
