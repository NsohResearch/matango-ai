/**
 * Background Job Worker for Generation Tasks
 * 
 * This worker processes queued image and video generation jobs.
 * It implements exponential backoff, retry logic, and dead letter handling.
 */

import { getDb } from "../db";
import { workflowGenerationJobs, workflowMediaAssets } from "../../drizzle/schema";
import { eq, and, lte, or, isNull } from "drizzle-orm";
import { generateImage } from "../_core/imageGeneration";
import { storagePut } from "../storage";

// Simple logger for worker
const logger = {
  info: (data: unknown, msg?: string) => console.log(`[INFO] ${msg || ''}`, JSON.stringify(data)),
  debug: (data: unknown, msg?: string) => console.log(`[DEBUG] ${msg || ''}`, JSON.stringify(data)),
  warn: (data: unknown, msg?: string) => console.warn(`[WARN] ${msg || ''}`, JSON.stringify(data)),
  error: (data: unknown, msg?: string) => console.error(`[ERROR] ${msg || ''}`, JSON.stringify(data)),
};

const POLL_INTERVAL_MS = 5000; // 5 seconds
const MAX_CONCURRENT_JOBS = 3;
const JOB_TIMEOUT_MS = 300000; // 5 minutes

interface JobResult {
  success: boolean;
  outputAssetId?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

type GenerationJob = typeof workflowGenerationJobs.$inferSelect;

/**
 * Process a single image generation job
 */
async function processImageJob(job: GenerationJob): Promise<JobResult> {
  const params = job.inputJson as {
    prompt?: string;
    negativePrompt?: string;
    aspectRatio?: string;
    referenceStrength?: number;
    referenceAssetIds?: number[];
  };

  if (!params.prompt) {
    return { success: false, error: "No prompt provided" };
  }

  try {
    logger.info({ jobId: job.id, prompt: params.prompt?.substring(0, 50) }, "Starting image generation");

    // Call the image generation service
    const result = await generateImage({
      prompt: params.prompt,
    });

    if (!result.url) {
      throw new Error("No image URL returned from generation service");
    }

    // Download and re-upload to our S3 for persistence
    const response = await fetch(result.url);
    const buffer = Buffer.from(await response.arrayBuffer());
    const fileKey = `generated-images/${job.id}-${Date.now()}.png`;
    const { url: s3Url } = await storagePut(fileKey, buffer, "image/png");

    // Create media asset
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [asset] = await db.insert(workflowMediaAssets).values({
      userId: job.userId,
      sessionId: job.sessionId,
      assetType: "generated_image",
      s3Key: fileKey,
      url: s3Url,
      mimeType: "image/png",
      metadata: {
        prompt: params.prompt,
        negativePrompt: params.negativePrompt,
        aspectRatio: params.aspectRatio,
      },
    }).$returningId();

    logger.info({ jobId: job.id, assetId: asset.id }, "Image generation completed");

    return {
      success: true,
      outputAssetId: asset.id,
      metadata: {
        originalUrl: result.url,
        aspectRatio: params.aspectRatio,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ jobId: job.id, error: errorMessage }, "Image generation failed");
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Process a single video generation job
 */
async function processVideoJob(job: GenerationJob): Promise<JobResult> {
  const params = job.inputJson as {
    scriptId?: number;
    influencerProfileId?: number;
    referenceAssetIds?: number[];
  };

  try {
    logger.info({ jobId: job.id, scriptId: params.scriptId }, "Starting video generation");

    // Video generation is more complex - for now, we'll create a placeholder
    // In production, this would call a video generation API (e.g., Runway, Pika, etc.)
    
    // Simulate video generation delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // For now, return a placeholder result
    // TODO: Integrate with actual video generation service
    return {
      success: true,
      outputAssetId: undefined,
      metadata: {
        scriptId: params.scriptId,
        status: "placeholder",
        message: "Video generation service integration pending",
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ jobId: job.id, error: errorMessage }, "Video generation failed");
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Process a single job based on its type
 */
async function processJob(job: GenerationJob): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Mark job as running
  await db
    .update(workflowGenerationJobs)
    .set({
      status: "running",
      attemptCount: job.attemptCount + 1,
    })
    .where(eq(workflowGenerationJobs.id, job.id));

  let result: JobResult;

  try {
    switch (job.jobKind) {
      case "image":
        result = await processImageJob(job);
        break;
      case "video":
        result = await processVideoJob(job);
        break;
      default:
        result = { success: false, error: `Unknown job kind: ${job.jobKind}` };
    }
  } catch (error) {
    result = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  if (result.success) {
    // Job succeeded
    await db
      .update(workflowGenerationJobs)
      .set({
        status: "succeeded",
        outputAssetId: result.outputAssetId,
      })
      .where(eq(workflowGenerationJobs.id, job.id));

    logger.info({ jobId: job.id }, "Job completed successfully");
  } else {
    // Job failed
    const shouldRetry = job.attemptCount < job.maxAttempts;
    const newStatus = shouldRetry ? "queued" : "dead_letter";
    const nextRunAt = shouldRetry
      ? new Date(Date.now() + Math.pow(2, job.attemptCount) * 1000) // Exponential backoff
      : new Date();

    await db
      .update(workflowGenerationJobs)
      .set({
        status: newStatus,
        errorMessage: result.error,
        nextRunAt,
      })
      .where(eq(workflowGenerationJobs.id, job.id));

    logger.warn(
      { jobId: job.id, attemptCount: job.attemptCount, shouldRetry },
      "Job failed"
    );
  }
}

/**
 * Poll for and process queued jobs
 */
async function pollJobs(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // Find jobs that are ready to run
  const jobs = await db
    .select()
    .from(workflowGenerationJobs)
    .where(
      and(
        eq(workflowGenerationJobs.status, "queued"),
        lte(workflowGenerationJobs.nextRunAt, new Date())
      )
    )
    .limit(MAX_CONCURRENT_JOBS);

  if (jobs.length === 0) {
    return 0;
  }

  logger.debug({ count: jobs.length }, "Found jobs to process");

  // Process jobs concurrently
  await Promise.all(jobs.map(processJob));

  return jobs.length;
}

/**
 * Check for stalled jobs (running for too long)
 */
async function checkStalledJobs(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const stalledThreshold = new Date(Date.now() - JOB_TIMEOUT_MS);

  await db
    .update(workflowGenerationJobs)
    .set({
      status: "queued",
      errorMessage: "Job timed out",
    })
    .where(
      and(
        eq(workflowGenerationJobs.status, "running"),
        lte(workflowGenerationJobs.updatedAt, stalledThreshold)
      )
    );
}

/**
 * Main worker loop
 */
export async function startJobWorker(): Promise<void> {
  logger.info({}, "Starting job worker");

  let isRunning = true;

  // Handle graceful shutdown
  process.on("SIGTERM", () => {
    logger.info({}, "Received SIGTERM, shutting down worker");
    isRunning = false;
  });

  process.on("SIGINT", () => {
    logger.info({}, "Received SIGINT, shutting down worker");
    isRunning = false;
  });

  while (isRunning) {
    try {
      // Check for stalled jobs periodically
      await checkStalledJobs();

      // Poll and process jobs
      const processed = await pollJobs();

      // If no jobs were processed, wait before polling again
      if (processed === 0) {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    } catch (error) {
      logger.error({ error }, "Error in job worker loop");
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }

  logger.info({}, "Job worker stopped");
}

/**
 * Run a single poll cycle (useful for testing)
 */
export async function runOnce(): Promise<number> {
  await checkStalledJobs();
  return pollJobs();
}

// Export for use in main server or as standalone worker
export default { startJobWorker, runOnce };
