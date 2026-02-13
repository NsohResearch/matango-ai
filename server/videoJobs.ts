/**
 * Video Jobs Queue System
 * Handles async video generation tasks with retry logic, progress tracking, and credits management
 */

import { getDb } from "./db";
import { videoJobs, videoScenes, videoAssets, videoCreditsUsage, users } from "../drizzle/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { logger } from "./_core/logger";

// Video job types
export type VideoJobType = 
  | "imageToVideo"
  | "textToVideo"
  | "videoRestyle"
  | "lipSync"
  | "motionSync"
  | "characterSwap"
  | "storyPreview"
  | "finalRender";

// Job status types
export type VideoJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

// Credits cost per job type (in credits)
export const VIDEO_CREDITS_COST: Record<VideoJobType, { base: number; perSecond: number }> = {
  imageToVideo: { base: 5, perSecond: 1 },
  textToVideo: { base: 10, perSecond: 2 },
  videoRestyle: { base: 8, perSecond: 1.5 },
  lipSync: { base: 15, perSecond: 3 },
  motionSync: { base: 20, perSecond: 4 },
  characterSwap: { base: 25, perSecond: 5 },
  storyPreview: { base: 2, perSecond: 0.5 },
  finalRender: { base: 5, perSecond: 1 },
};

// Plan limits for video generation
export const VIDEO_PLAN_LIMITS = {
  free: {
    monthlyMinutes: 1,
    maxResolution: "720p",
    maxCharacters: 0,
    hasWatermark: true,
    canBulkGenerate: false,
    maxScenesPerVideo: 3,
  },
  basic: {
    monthlyMinutes: 10,
    maxResolution: "1080p",
    maxCharacters: 1,
    hasWatermark: false,
    canBulkGenerate: false,
    maxScenesPerVideo: 10,
  },
  agency: {
    monthlyMinutes: 100,
    maxResolution: "4k",
    maxCharacters: -1, // unlimited
    hasWatermark: false,
    canBulkGenerate: true,
    maxScenesPerVideo: -1, // unlimited
  },
  agency_plus: {
    monthlyMinutes: -1, // unlimited
    maxResolution: "4k",
    maxCharacters: -1,
    hasWatermark: false,
    canBulkGenerate: true,
    maxScenesPerVideo: -1,
  },
};

// Estimate credits for a video job
export function estimateVideoCredits(
  type: VideoJobType,
  durationSeconds: number,
  resolution: string = "1080p"
): number {
  const cost = VIDEO_CREDITS_COST[type];
  let credits = cost.base + (cost.perSecond * durationSeconds);
  
  // Resolution multiplier
  if (resolution === "4k") credits *= 2;
  else if (resolution === "720p") credits *= 0.5;
  
  return Math.ceil(credits);
}

// Check if user has enough credits
export async function checkVideoCredits(
  userId: number,
  estimatedCredits: number
): Promise<{ hasCredits: boolean; currentCredits: number; needed: number }> {
  const db = await getDb();
  if (!db) {
    return { hasCredits: false, currentCredits: 0, needed: estimatedCredits };
  }
  
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  
  if (!user) {
    return { hasCredits: false, currentCredits: 0, needed: estimatedCredits };
  }
  
  return {
    hasCredits: user.credits >= estimatedCredits,
    currentCredits: user.credits,
    needed: estimatedCredits,
  };
}

// Deduct credits from user
export async function deductVideoCredits(
  userId: number,
  videoJobId: number,
  credits: number,
  action: string,
  durationSeconds?: number,
  resolution?: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    // Deduct from user
    await db
      .update(users)
      .set({ credits: sql`credits - ${credits}` })
      .where(eq(users.id, userId));
    
    // Log usage
    await db.insert(videoCreditsUsage).values({
      userId,
      videoJobId,
      action: action as any,
      creditsUsed: credits,
      durationSeconds,
      resolution,
      description: `Video job ${videoJobId}: ${action}`,
    });
    
    return true;
  } catch (error) {
    logger.error("Failed to deduct video credits", { userId, credits, error });
    return false;
  }
}

// Create a new video job
export async function createVideoJob(params: {
  userId: number;
  orgId?: number;
  brandId?: number;
  influencerId?: number;
  campaignId?: number;
  type: VideoJobType;
  title?: string;
  prompt?: string;
  jobParams?: Record<string, any>;
  estimatedDuration?: number;
}): Promise<{ success: boolean; jobId?: number; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }
  
  try {
    const estimatedCredits = estimateVideoCredits(
      params.type,
      params.estimatedDuration || 30,
      params.jobParams?.resolution || "1080p"
    );
    
    // Check credits (only for final render, not preview)
    if (params.type !== "storyPreview") {
      const creditCheck = await checkVideoCredits(params.userId, estimatedCredits);
      if (!creditCheck.hasCredits) {
        return {
          success: false,
          error: `Insufficient credits. Need ${creditCheck.needed}, have ${creditCheck.currentCredits}`,
        };
      }
    }
    
    const [result] = await db.insert(videoJobs).values({
      userId: params.userId,
      orgId: params.orgId,
      brandId: params.brandId,
      influencerId: params.influencerId,
      campaignId: params.campaignId,
      type: params.type,
      title: params.title,
      prompt: params.prompt,
      params: params.jobParams,
      status: "queued",
      creditsEstimated: estimatedCredits,
    });
    
    logger.info("Video job created", { jobId: result.insertId, type: params.type });
    
    return { success: true, jobId: result.insertId };
  } catch (error) {
    logger.error("Failed to create video job", { error, params });
    return { success: false, error: "Failed to create video job" };
  }
}

// Update job status
export async function updateVideoJobStatus(
  jobId: number,
  status: VideoJobStatus,
  updates?: {
    progress?: number;
    outputUrl?: string;
    previewUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
    errorMessage?: string;
    creditsConsumed?: number;
  }
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    const updateData: Record<string, any> = { status };
    
    if (updates?.progress !== undefined) updateData.progress = updates.progress;
    if (updates?.outputUrl) updateData.outputUrl = updates.outputUrl;
    if (updates?.previewUrl) updateData.previewUrl = updates.previewUrl;
    if (updates?.thumbnailUrl) updateData.thumbnailUrl = updates.thumbnailUrl;
    if (updates?.duration) updateData.duration = updates.duration;
    if (updates?.errorMessage) updateData.errorMessage = updates.errorMessage;
    if (updates?.creditsConsumed) updateData.creditsConsumed = updates.creditsConsumed;
    
    if (status === "running") {
      updateData.startedAt = new Date();
    } else if (status === "completed" || status === "failed") {
      updateData.completedAt = new Date();
    }
    
    await db.update(videoJobs).set(updateData).where(eq(videoJobs.id, jobId));
    
    logger.info("Video job status updated", { jobId, status });
    return true;
  } catch (error) {
    logger.error("Failed to update video job status", { jobId, status, error });
    return false;
  }
}

// Get job by ID
export async function getVideoJob(jobId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [job] = await db.select().from(videoJobs).where(eq(videoJobs.id, jobId)).limit(1);
  return job || null;
}

// Get jobs for user
export async function getUserVideoJobs(
  userId: number,
  options?: {
    status?: VideoJobStatus[];
    type?: VideoJobType[];
    limit?: number;
    offset?: number;
  }
) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(videoJobs.userId, userId)];
  
  if (options?.status?.length) {
    conditions.push(inArray(videoJobs.status, options.status));
  }
  if (options?.type?.length) {
    conditions.push(inArray(videoJobs.type, options.type));
  }
  
  return db
    .select()
    .from(videoJobs)
    .where(and(...conditions))
    .orderBy(desc(videoJobs.createdAt))
    .limit(options?.limit || 50)
    .offset(options?.offset || 0);
}

// Get queued jobs for processing
export async function getQueuedVideoJobs(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(videoJobs)
    .where(eq(videoJobs.status, "queued"))
    .orderBy(videoJobs.createdAt)
    .limit(limit);
}

// Retry failed job
export async function retryVideoJob(jobId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    const job = await getVideoJob(jobId);
    if (!job) return false;
    
    if (job.retryCount >= job.maxRetries) {
      logger.warn("Video job exceeded max retries", { jobId, retryCount: job.retryCount });
      return false;
    }
    
    await db.update(videoJobs).set({
      status: "queued",
      retryCount: sql`retryCount + 1`,
      errorMessage: null,
      startedAt: null,
      completedAt: null,
    }).where(eq(videoJobs.id, jobId));
    
    logger.info("Video job queued for retry", { jobId, retryCount: job.retryCount + 1 });
    return true;
  } catch (error) {
    logger.error("Failed to retry video job", { jobId, error });
    return false;
  }
}

// Cancel job
export async function cancelVideoJob(jobId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    const job = await getVideoJob(jobId);
    if (!job || job.userId !== userId) return false;
    
    if (job.status === "completed" || job.status === "cancelled") {
      return false;
    }
    
    await db.update(videoJobs).set({
      status: "cancelled",
      completedAt: new Date(),
    }).where(eq(videoJobs.id, jobId));
    
    logger.info("Video job cancelled", { jobId, userId });
    return true;
  } catch (error) {
    logger.error("Failed to cancel video job", { jobId, error });
    return false;
  }
}

// Scene management
export async function createVideoScenes(
  videoJobId: number,
  scenes: Array<{
    order: number;
    title?: string;
    prompt?: string;
    duration?: number;
    aspectRatio?: string;
    voiceoverText?: string;
    voiceId?: string;
    musicTrackId?: string;
    inputImageUrl?: string;
  }>
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    await db.insert(videoScenes).values(
      scenes.map((scene) => ({
        videoJobId,
        order: scene.order,
        title: scene.title,
        prompt: scene.prompt,
        duration: scene.duration || 5,
        aspectRatio: (scene.aspectRatio as any) || "16:9",
        voiceoverText: scene.voiceoverText,
        voiceId: scene.voiceId,
        musicTrackId: scene.musicTrackId,
        inputImageUrl: scene.inputImageUrl,
      }))
    );
    
    return true;
  } catch (error) {
    logger.error("Failed to create video scenes", { videoJobId, error });
    return false;
  }
}

export async function getVideoScenes(videoJobId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(videoScenes)
    .where(eq(videoScenes.videoJobId, videoJobId))
    .orderBy(videoScenes.order);
}

export async function updateVideoScene(
  sceneId: number,
  updates: Partial<{
    order: number;
    title: string;
    prompt: string;
    duration: number;
    voiceoverText: string;
    voiceId: string;
    musicTrackId: string;
    musicVolume: number;
    inputImageUrl: string;
    outputUrl: string;
    thumbnailUrl: string;
    status: string;
  }>
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    await db.update(videoScenes).set(updates as any).where(eq(videoScenes.id, sceneId));
    return true;
  } catch (error) {
    logger.error("Failed to update video scene", { sceneId, error });
    return false;
  }
}

export async function deleteVideoScene(sceneId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    await db.delete(videoScenes).where(eq(videoScenes.id, sceneId));
    return true;
  } catch (error) {
    logger.error("Failed to delete video scene", { sceneId, error });
    return false;
  }
}

// Save completed video to library
export async function saveVideoToLibrary(params: {
  userId: number;
  orgId?: number;
  brandId?: number;
  influencerId?: number;
  campaignId?: number;
  videoJobId: number;
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  duration: number;
  resolution?: string;
  aspectRatio?: string;
  hasWatermark?: boolean;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; assetId?: number }> {
  const db = await getDb();
  if (!db) return { success: false };
  
  try {
    const [result] = await db.insert(videoAssets).values({
      userId: params.userId,
      orgId: params.orgId,
      brandId: params.brandId,
      influencerId: params.influencerId,
      campaignId: params.campaignId,
      videoJobId: params.videoJobId,
      title: params.title,
      description: params.description,
      url: params.url,
      thumbnailUrl: params.thumbnailUrl,
      duration: params.duration,
      resolution: params.resolution,
      aspectRatio: (params.aspectRatio as any) || "16:9",
      hasWatermark: params.hasWatermark || false,
      metadata: params.metadata,
    });
    
    return { success: true, assetId: result.insertId };
  } catch (error) {
    logger.error("Failed to save video to library", { error, params });
    return { success: false };
  }
}

// Get user's video library
export async function getUserVideoLibrary(
  userId: number,
  options?: {
    brandId?: number;
    campaignId?: number;
    limit?: number;
    offset?: number;
  }
) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(videoAssets.userId, userId)];
  
  if (options?.brandId) {
    conditions.push(eq(videoAssets.brandId, options.brandId));
  }
  if (options?.campaignId) {
    conditions.push(eq(videoAssets.campaignId, options.campaignId));
  }
  
  return db
    .select()
    .from(videoAssets)
    .where(and(...conditions))
    .orderBy(desc(videoAssets.createdAt))
    .limit(options?.limit || 50)
    .offset(options?.offset || 0);
}

// Get monthly video usage for a user
export async function getMonthlyVideoUsage(userId: number): Promise<{
  minutesUsed: number;
  creditsUsed: number;
  jobsCompleted: number;
}> {
  const db = await getDb();
  if (!db) return { minutesUsed: 0, creditsUsed: 0, jobsCompleted: 0 };
  
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const jobs = await db
    .select()
    .from(videoJobs)
    .where(
      and(
        eq(videoJobs.userId, userId),
        eq(videoJobs.status, "completed"),
        sql`${videoJobs.completedAt} >= ${startOfMonth}`
      )
    );
  
  const totalSeconds = jobs.reduce((sum: number, job) => sum + (job.duration || 0), 0);
  const totalCredits = jobs.reduce((sum: number, job) => sum + (job.creditsConsumed || 0), 0);
  
  return {
    minutesUsed: Math.ceil(totalSeconds / 60),
    creditsUsed: totalCredits,
    jobsCompleted: jobs.length,
  };
}

// Check plan limits
export async function checkVideoPlanLimits(
  userId: number,
  requestedMinutes: number
): Promise<{
  allowed: boolean;
  reason?: string;
  planLimits: typeof VIDEO_PLAN_LIMITS[keyof typeof VIDEO_PLAN_LIMITS];
  currentUsage: { minutesUsed: number };
}> {
  const db = await getDb();
  if (!db) {
    return {
      allowed: false,
      reason: "Database not available",
      planLimits: VIDEO_PLAN_LIMITS.free,
      currentUsage: { minutesUsed: 0 },
    };
  }
  
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  
  if (!user) {
    return {
      allowed: false,
      reason: "User not found",
      planLimits: VIDEO_PLAN_LIMITS.free,
      currentUsage: { minutesUsed: 0 },
    };
  }
  
  const plan = user.plan as keyof typeof VIDEO_PLAN_LIMITS;
  const limits = VIDEO_PLAN_LIMITS[plan] || VIDEO_PLAN_LIMITS.free;
  const usage = await getMonthlyVideoUsage(userId);
  
  // Check if unlimited
  if (limits.monthlyMinutes === -1) {
    return {
      allowed: true,
      planLimits: limits,
      currentUsage: usage,
    };
  }
  
  // Check if within limits
  if (usage.minutesUsed + requestedMinutes > limits.monthlyMinutes) {
    return {
      allowed: false,
      reason: `Monthly limit exceeded. Used ${usage.minutesUsed}/${limits.monthlyMinutes} minutes.`,
      planLimits: limits,
      currentUsage: usage,
    };
  }
  
  return {
    allowed: true,
    planLimits: limits,
    currentUsage: usage,
  };
}

// Export all functions
export const videoJobsService = {
  estimateVideoCredits,
  checkVideoCredits,
  deductVideoCredits,
  createVideoJob,
  updateVideoJobStatus,
  getVideoJob,
  getUserVideoJobs,
  getQueuedVideoJobs,
  retryVideoJob,
  cancelVideoJob,
  createVideoScenes,
  getVideoScenes,
  updateVideoScene,
  deleteVideoScene,
  saveVideoToLibrary,
  getUserVideoLibrary,
  getMonthlyVideoUsage,
  checkVideoPlanLimits,
  VIDEO_CREDITS_COST,
  VIDEO_PLAN_LIMITS,
};
