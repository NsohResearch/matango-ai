/**
 * Video Studio V2 Router
 * 
 * Canonical endpoints for:
 *  - Generate video from script + influencer
 *  - Batch video generation
 *  - Video library (list, filter, delete)
 *  - Video status polling
 *  - Provider selection (BYOK)
 *  - Script integration (link to workflow scripts)
 *  - Available providers listing
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  videoGenJobsV2,
  mediaObjects,
  influencers,
  workflowScripts,
  userAiCredentials,
  aiProviders,
} from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { storagePut } from "../storage";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";

export const videoStudioV2Router = router({
  // ---- Generate Video ----
  generate: protectedProcedure
    .input(z.object({
      influencerId: z.number(),
      scriptId: z.number().optional(),
      scriptText: z.string().min(1).max(5000),
      provider: z.string().default("local"),
      lipSync: z.boolean().default(true),
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

      // Validate script if scriptId provided
      if (input.scriptId) {
        const [script] = await db
          .select()
          .from(workflowScripts)
          .where(and(eq(workflowScripts.id, input.scriptId), eq(workflowScripts.userId, userId)))
          .limit(1);
        if (!script) throw new TRPCError({ code: "NOT_FOUND", message: "Script not found" });
      }

      // Create the generation job
      const [jobRow] = await db.insert(videoGenJobsV2).values({
        userId,
        influencerId: input.influencerId,
        scriptId: input.scriptId ?? null,
        scriptText: input.scriptText,
        provider: input.provider,
        lipSync: input.lipSync,
        status: "queued",
        progress: 0,
      });

      const jobId = Number(jobRow.insertId);

      // Fire and forget — async processing
      processVideoJob(jobId, userId, input, inf.name).catch((err) => {
        console.error(`[VideoStudioV2] Job ${jobId} failed:`, err);
      });

      return { jobId, status: "queued" as const };
    }),

  // ---- Get Job Status ----
  getJobStatus: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [job] = await db
        .select()
        .from(videoGenJobsV2)
        .where(and(eq(videoGenJobsV2.id, input.jobId), eq(videoGenJobsV2.userId, ctx.user.id)))
        .limit(1);

      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      return job;
    }),

  // ---- List Jobs ----
  listJobs: protectedProcedure
    .input(z.object({
      influencerId: z.number().optional(),
      status: z.enum(["queued", "running", "succeeded", "failed", "all"]).default("all"),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [eq(videoGenJobsV2.userId, ctx.user.id)];
      if (input.influencerId) {
        conditions.push(eq(videoGenJobsV2.influencerId, input.influencerId));
      }
      if (input.status !== "all") {
        conditions.push(eq(videoGenJobsV2.status, input.status));
      }

      const jobs = await db
        .select()
        .from(videoGenJobsV2)
        .where(and(...conditions))
        .orderBy(desc(videoGenJobsV2.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return jobs;
    }),

  // ---- Cancel Job ----
  cancelJob: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [job] = await db
        .select()
        .from(videoGenJobsV2)
        .where(and(eq(videoGenJobsV2.id, input.jobId), eq(videoGenJobsV2.userId, ctx.user.id)))
        .limit(1);

      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      if (job.status === "succeeded" || job.status === "failed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot cancel a finished job" });
      }

      await db
        .update(videoGenJobsV2)
        .set({ status: "failed", error: "Cancelled by user" })
        .where(eq(videoGenJobsV2.id, input.jobId));

      return { success: true };
    }),

  // ---- Video Library (completed videos only) ----
  library: protectedProcedure
    .input(z.object({
      influencerId: z.number().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [
        eq(videoGenJobsV2.userId, ctx.user.id),
        eq(videoGenJobsV2.status, "succeeded"),
      ];
      if (input.influencerId) {
        conditions.push(eq(videoGenJobsV2.influencerId, input.influencerId));
      }

      const videos = await db
        .select({
          id: videoGenJobsV2.id,
          influencerId: videoGenJobsV2.influencerId,
          scriptText: videoGenJobsV2.scriptText,
          provider: videoGenJobsV2.provider,
          outputMediaId: videoGenJobsV2.outputMediaId,
          lipSync: videoGenJobsV2.lipSync,
          createdAt: videoGenJobsV2.createdAt,
        })
        .from(videoGenJobsV2)
        .where(and(...conditions))
        .orderBy(desc(videoGenJobsV2.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return videos;
    }),

  // ---- Delete Video ----
  deleteVideo: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [job] = await db
        .select()
        .from(videoGenJobsV2)
        .where(and(eq(videoGenJobsV2.id, input.jobId), eq(videoGenJobsV2.userId, ctx.user.id)))
        .limit(1);

      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      await db
        .update(videoGenJobsV2)
        .set({ status: "failed", error: "Deleted by user" })
        .where(eq(videoGenJobsV2.id, input.jobId));

      return { success: true };
    }),

  // ---- Batch Generate ----
  batchGenerate: protectedProcedure
    .input(z.object({
      influencerId: z.number(),
      scripts: z.array(z.object({
        scriptId: z.number().optional(),
        scriptText: z.string().min(1).max(5000),
      })).min(1).max(10),
      provider: z.string().default("local"),
      lipSync: z.boolean().default(true),
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

      const batchGroupId = crypto.randomUUID();
      const jobIds: number[] = [];

      for (const script of input.scripts) {
        const [jobRow] = await db.insert(videoGenJobsV2).values({
          userId,
          influencerId: input.influencerId,
          scriptId: script.scriptId ?? null,
          scriptText: script.scriptText,
          provider: input.provider,
          lipSync: input.lipSync,
          batchGroupId,
          status: "queued",
          progress: 0,
        });

        const jobId = Number(jobRow.insertId);
        jobIds.push(jobId);

        processVideoJob(jobId, userId, {
          scriptText: script.scriptText,
          provider: input.provider,
          influencerId: input.influencerId,
          lipSync: input.lipSync,
        }, inf.name).catch((err) => {
          console.error(`[VideoStudioV2] Batch job ${jobId} failed:`, err);
        });
      }

      return { jobIds, batchGroupId, count: jobIds.length };
    }),

  // ---- Stats ----
  stats: protectedProcedure
    .input(z.object({ influencerId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [eq(videoGenJobsV2.userId, ctx.user.id)];
      if (input.influencerId) {
        conditions.push(eq(videoGenJobsV2.influencerId, input.influencerId));
      }

      const allJobs = await db
        .select({
          status: videoGenJobsV2.status,
          count: sql<number>`count(*)`,
        })
        .from(videoGenJobsV2)
        .where(and(...conditions))
        .groupBy(videoGenJobsV2.status);

      const statusMap: Record<string, number> = {};
      for (const row of allJobs) {
        statusMap[row.status] = Number(row.count);
      }

      return {
        total: Object.values(statusMap).reduce((a, b) => a + b, 0),
        queued: statusMap["queued"] ?? 0,
        running: statusMap["running"] ?? 0,
        succeeded: statusMap["succeeded"] ?? 0,
        failed: statusMap["failed"] ?? 0,
      };
    }),

  // ---- List Available Providers ----
  listProviders: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      // Get all active providers that support video
      const providers = await db
        .select()
        .from(aiProviders)
        .where(eq(aiProviders.isActive, true));

      const videoProviders = providers.filter(p => {
        const caps = (p.capabilities as Record<string, boolean>) || {};
        return caps.textToVideo === true || caps.imageToVideo === true;
      });

      // Check which providers the user has credentials for
      const credentials = await db
        .select({
          providerId: userAiCredentials.providerId,
          isValid: userAiCredentials.isValid,
        })
        .from(userAiCredentials)
        .where(and(
          eq(userAiCredentials.userId, ctx.user.id),
          eq(userAiCredentials.isActive, true),
        ));

      const credMap = new Map(credentials.map(c => [c.providerId, c.isValid]));

      return videoProviders.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        isBuiltIn: p.isBuiltIn,
        hasCredentials: p.isBuiltIn || credMap.has(p.id),
        credentialsValid: p.isBuiltIn || (credMap.get(p.id) ?? false),
      }));
    }),

  // ---- List User Scripts (for script picker) ----
  listScripts: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const scripts = await db
        .select({
          id: workflowScripts.id,
          platform: workflowScripts.platform,
          tone: workflowScripts.tone,
          contentJson: workflowScripts.contentJson,
          status: workflowScripts.status,
          createdAt: workflowScripts.createdAt,
        })
        .from(workflowScripts)
        .where(eq(workflowScripts.userId, ctx.user.id))
        .orderBy(desc(workflowScripts.createdAt))
        .limit(input.limit);

      return scripts;
    }),

  // ---- Get Video URL for playback ----
  getVideoUrl: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [job] = await db
        .select()
        .from(videoGenJobsV2)
        .where(and(eq(videoGenJobsV2.id, input.jobId), eq(videoGenJobsV2.userId, ctx.user.id)))
        .limit(1);

      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      if (job.status !== "succeeded") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Video is not ready yet" });
      }

      let videoUrl: string | null = null;
      let videoContentType: string | null = null;
      let thumbnailUrl: string | null = null;
      let isPlaceholder = false;

      // Get the output media object
      if (job.outputMediaId) {
        const [media] = await db
          .select()
          .from(mediaObjects)
          .where(eq(mediaObjects.id, job.outputMediaId))
          .limit(1);
        if (media?.url) {
          videoUrl = media.url;
          videoContentType = media.contentType;
          // If the file is very small (< 1KB), it's likely a placeholder
          isPlaceholder = (media.bytes ?? 0) < 1024;
        }
      }

      // Look for a thumbnail media object (generated_thumbnail purpose)
      const thumbnailMedia = await db
        .select()
        .from(mediaObjects)
        .where(
          and(
            eq(mediaObjects.userId, ctx.user.id),
            eq(mediaObjects.purpose, "video_thumbnail"),
          )
        )
        .orderBy(desc(mediaObjects.createdAt))
        .limit(10);

      // Try to find a thumbnail associated with this job's time range
      if (thumbnailMedia.length > 0) {
        // Find the thumbnail created closest to the job's creation time
        const jobTime = new Date(job.createdAt).getTime();
        let bestMatch = thumbnailMedia[0];
        let bestDelta = Math.abs(new Date(bestMatch.createdAt).getTime() - jobTime);
        for (const tm of thumbnailMedia) {
          const delta = Math.abs(new Date(tm.createdAt).getTime() - jobTime);
          if (delta < bestDelta) {
            bestDelta = delta;
            bestMatch = tm;
          }
        }
        // Only use if within 2 minutes of job creation
        if (bestDelta < 120_000) {
          thumbnailUrl = bestMatch.url;
        }
      }

      if (!videoUrl && !thumbnailUrl) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Video file not found" });
      }

      return {
        url: videoUrl,
        thumbnailUrl,
        contentType: videoContentType,
        isPlaceholder,
        scriptText: job.scriptText,
        provider: job.provider,
        lipSync: job.lipSync,
        createdAt: job.createdAt,
      };
    }),

  // ---- Retry Failed Job ----
  retryJob: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [job] = await db
        .select()
        .from(videoGenJobsV2)
        .where(and(eq(videoGenJobsV2.id, input.jobId), eq(videoGenJobsV2.userId, ctx.user.id)))
        .limit(1);

      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      if (job.status !== "failed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only failed jobs can be retried" });
      }

      // Get influencer name for processing
      const [inf] = await db
        .select()
        .from(influencers)
        .where(eq(influencers.id, job.influencerId ?? 0))
        .limit(1);

      // Reset job status
      await db
        .update(videoGenJobsV2)
        .set({ status: "queued", progress: 0, error: null })
        .where(eq(videoGenJobsV2.id, input.jobId));

      // Re-process
      processVideoJob(input.jobId, ctx.user.id, {
        scriptText: job.scriptText ?? "",
        provider: job.provider,
        influencerId: job.influencerId ?? 0,
        lipSync: job.lipSync,
      }, inf?.name ?? "Unknown").catch((err) => {
        console.error(`[VideoStudioV2] Retry job ${input.jobId} failed:`, err);
      });

      return { success: true, status: "queued" as const };
    }),

  // ---- Delete a Single Job ----
  deleteJob: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [job] = await db
        .select()
        .from(videoGenJobsV2)
        .where(and(eq(videoGenJobsV2.id, input.jobId), eq(videoGenJobsV2.userId, ctx.user.id)))
        .limit(1);

      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      // Delete associated media objects
      if (job.outputMediaId) {
        await db.delete(mediaObjects).where(eq(mediaObjects.id, job.outputMediaId));
      }

      // Delete the job
      await db.delete(videoGenJobsV2).where(eq(videoGenJobsV2.id, input.jobId));

      return { success: true };
    }),

  // ---- Delete All Jobs for User ----
  deleteAllJobs: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get all job IDs and their media IDs
      const jobs = await db
        .select({ id: videoGenJobsV2.id, outputMediaId: videoGenJobsV2.outputMediaId })
        .from(videoGenJobsV2)
        .where(eq(videoGenJobsV2.userId, ctx.user.id));

      // Delete associated media objects
      const mediaIds = jobs.map(j => j.outputMediaId).filter((id): id is number => id !== null);
      if (mediaIds.length > 0) {
        for (const mId of mediaIds) {
          await db.delete(mediaObjects).where(eq(mediaObjects.id, mId));
        }
      }

      // Also delete any video thumbnails
      await db.delete(mediaObjects).where(
        and(
          eq(mediaObjects.userId, ctx.user.id),
          eq(mediaObjects.purpose, "video_thumbnail")
        )
      );

      // Delete all jobs
      await db.delete(videoGenJobsV2).where(eq(videoGenJobsV2.userId, ctx.user.id));

      return { success: true, deletedCount: jobs.length };
    }),
});

// ---- Async Video Processing (fire-and-forget) ----
async function processVideoJob(
  jobId: number,
  userId: number,
  input: {
    scriptText: string;
    provider: string;
    influencerId: number;
    lipSync?: boolean;
  },
  influencerName: string
) {
  const db = await getDb();
  if (!db) return;

  try {
    // Mark as running
    await db
      .update(videoGenJobsV2)
      .set({ status: "running", progress: 10 })
      .where(eq(videoGenJobsV2.id, jobId));

    // Step 1: Call the generation service
    // - For Manus (built-in): generates a cinematic preview frame (image)
    // - For BYOK providers (Runway, Sora, Replicate): generates real video
    const { generateVideo } = await import("../services/generationService");
    const providerSlug = input.provider === "local" ? "manus" : input.provider;

    const genResult = await generateVideo({
      userId,
      type: "video",
      prompt: `${influencerName} presents: ${input.scriptText}`,
      preferredProvider: providerSlug,
      duration: 5,
    });

    await db
      .update(videoGenJobsV2)
      .set({ progress: 40 })
      .where(eq(videoGenJobsV2.id, jobId));

    let outputUrl = "";
    let outputBytes = 0;
    let isRealVideo = false;

    if (genResult.success && genResult.outputUrl) {
      // Provider returned a completed result immediately (Manus image, or fast provider)
      outputUrl = genResult.outputUrl;
      // Determine if it's real video based on provider
      isRealVideo = providerSlug !== "manus";

      try {
        const headResp = await fetch(outputUrl, { method: "HEAD" });
        outputBytes = parseInt(headResp.headers.get("content-length") || "0", 10);
      } catch { /* ignore */ }

    } else if (genResult.status === "processing" && genResult.jobId) {
      // For async providers (Runway, Replicate, Sora), poll for completion
      const { checkVideoJobStatus } = await import("../services/generationService");
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;

        const progressPct = Math.min(40 + Math.floor((attempts / maxAttempts) * 55), 95);
        await db
          .update(videoGenJobsV2)
          .set({ progress: progressPct })
          .where(eq(videoGenJobsV2.id, jobId));

        try {
          const pollResult = await checkVideoJobStatus(
            userId,
            genResult.jobId,
            providerSlug
          );

          if (pollResult.status === "completed" && pollResult.outputUrl) {
            outputUrl = pollResult.outputUrl;
            isRealVideo = true;
            break;
          } else if (pollResult.status === "failed") {
            throw new Error(`Provider generation failed: ${pollResult.error || "Unknown error"}`);
          }
        } catch (pollErr) {
          if (pollErr instanceof Error && pollErr.message.startsWith("Provider generation failed")) {
            throw pollErr;
          }
          console.warn(`[VideoStudioV2] Poll error (attempt ${attempts}):`, pollErr);
        }
      }

      if (!outputUrl) {
        throw new Error("Video generation timed out after 5 minutes. Please try again.");
      }
    } else if (!genResult.success) {
      throw new Error(genResult.error || "Generation failed");
    }

    if (!outputUrl) {
      throw new Error("No output was produced. Please try again or configure a video provider in AI Providers settings.");
    }

    await db
      .update(videoGenJobsV2)
      .set({ progress: 90 })
      .where(eq(videoGenJobsV2.id, jobId));

    // Step 2: Store the output in media_objects
    const suffix = crypto.randomBytes(4).toString("hex");
    const ext = isRealVideo ? "mp4" : "jpg";
    const contentType = isRealVideo ? "video/mp4" : "image/jpeg";
    const objectKey = `videos/${userId}/${input.influencerId}/${Date.now()}-${suffix}.${ext}`;

    const [mediaRow] = await db.insert(mediaObjects).values({
      userId,
      kind: isRealVideo ? "video" : "image",
      purpose: "generated_video",
      objectKey,
      contentType,
      bytes: outputBytes,
      sha256: "",
      url: outputUrl,
    });

    const mediaId = Number(mediaRow.insertId);

    // Mark as succeeded
    await db
      .update(videoGenJobsV2)
      .set({
        status: "succeeded",
        progress: 100,
        outputMediaId: mediaId,
      })
      .where(eq(videoGenJobsV2.id, jobId));

  } catch (err) {
    await db
      .update(videoGenJobsV2)
      .set({
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      })
      .where(eq(videoGenJobsV2.id, jobId));
  }
}
