/**
 * Server-Sent Events (SSE) for Real-Time Job Status Updates
 * 
 * This module provides real-time streaming updates for generation jobs.
 * Clients can subscribe to job status changes without polling.
 */

import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { workflowGenerationJobs } from "../../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";

const router = Router();

// Store active SSE connections per user
const activeConnections = new Map<number, Set<Response>>();

// Store last known job states for change detection
const jobStates = new Map<number, string>();

/**
 * SSE endpoint for subscribing to job status updates
 * 
 * GET /api/sse/jobs?jobIds=1,2,3
 * 
 * Events sent:
 * - job:update - When a job status changes
 * - job:complete - When a job completes successfully
 * - job:failed - When a job fails
 * - heartbeat - Keep-alive every 30 seconds
 */
router.get("/jobs", async (req: Request, res: Response) => {
  // Validate user authentication
  const userId = (req as any).user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Parse job IDs from query
  const jobIdsParam = req.query.jobIds as string;
  const jobIds = jobIdsParam 
    ? jobIdsParam.split(",").map(id => parseInt(id, 10)).filter(id => !isNaN(id))
    : [];

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
  res.flushHeaders();

  // Add connection to active connections
  if (!activeConnections.has(userId)) {
    activeConnections.set(userId, new Set());
  }
  activeConnections.get(userId)!.add(res);

  // Send initial connection event
  sendEvent(res, "connected", { 
    message: "Connected to job status stream",
    subscribedJobs: jobIds,
  });

  // Heartbeat interval
  const heartbeatInterval = setInterval(() => {
    sendEvent(res, "heartbeat", { timestamp: new Date().toISOString() });
  }, 30000);

  // Job polling interval (check for updates every 2 seconds)
  const pollInterval = setInterval(async () => {
    if (jobIds.length === 0) return;

    try {
      const db = await getDb();
      if (!db) return;

      const jobs = await db
        .select()
        .from(workflowGenerationJobs)
        .where(and(
          eq(workflowGenerationJobs.userId, userId),
          inArray(workflowGenerationJobs.id, jobIds)
        ));

      for (const job of jobs) {
        const stateKey = job.id;
        const currentState = `${job.status}:${job.progress}`;
        const previousState = jobStates.get(stateKey);

        if (previousState !== currentState) {
          jobStates.set(stateKey, currentState);

          // Determine event type
          let eventType = "job:update";
          if (job.status === "succeeded") {
            eventType = "job:complete";
          } else if (job.status === "failed" || job.status === "dead_letter") {
            eventType = "job:failed";
          }

          sendEvent(res, eventType, {
            jobId: job.id,
            status: job.status,
            progress: job.progress,
            outputAssetId: job.outputAssetId,
            error: job.errorMessage,
            updatedAt: job.updatedAt,
          });
        }
      }
    } catch (error) {
      console.error("[SSE] Error polling job status:", error);
    }
  }, 2000);

  // Cleanup on connection close
  req.on("close", () => {
    clearInterval(heartbeatInterval);
    clearInterval(pollInterval);
    activeConnections.get(userId)?.delete(res);
    
    // Clean up job states for this connection
    jobIds.forEach(id => jobStates.delete(id));
    
    console.log(`[SSE] Client disconnected: user=${userId}`);
  });
});

/**
 * SSE endpoint for subscribing to all user's active jobs
 * 
 * GET /api/sse/jobs/all
 */
router.get("/jobs/all", async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Add connection
  if (!activeConnections.has(userId)) {
    activeConnections.set(userId, new Set());
  }
  activeConnections.get(userId)!.add(res);

  sendEvent(res, "connected", { 
    message: "Connected to all jobs stream",
  });

  // Heartbeat
  const heartbeatInterval = setInterval(() => {
    sendEvent(res, "heartbeat", { timestamp: new Date().toISOString() });
  }, 30000);

  // Poll for all active jobs
  const pollInterval = setInterval(async () => {
    try {
      const db = await getDb();
      if (!db) return;

      const jobs = await db
        .select()
        .from(workflowGenerationJobs)
        .where(and(
          eq(workflowGenerationJobs.userId, userId),
          inArray(workflowGenerationJobs.status, ["queued", "running"])
        ));

      for (const job of jobs) {
        const stateKey = job.id;
        const currentState = `${job.status}:${job.progress}`;
        const previousState = jobStates.get(stateKey);

        if (previousState !== currentState) {
          jobStates.set(stateKey, currentState);

          sendEvent(res, "job:update", {
            jobId: job.id,
            status: job.status,
            progress: job.progress,
            kind: job.jobKind,
            sessionId: job.sessionId,
            updatedAt: job.updatedAt,
          });
        }
      }
    } catch (error) {
      console.error("[SSE] Error polling all jobs:", error);
    }
  }, 2000);

  req.on("close", () => {
    clearInterval(heartbeatInterval);
    clearInterval(pollInterval);
    activeConnections.get(userId)?.delete(res);
    console.log(`[SSE] Client disconnected from all jobs: user=${userId}`);
  });
});

/**
 * Broadcast a job update to all connected clients for a user
 */
export function broadcastJobUpdate(
  userId: number,
  jobId: number,
  status: string,
  progress: number,
  data?: Record<string, unknown>
): void {
  const connections = activeConnections.get(userId);
  if (!connections || connections.size === 0) return;

  let eventType = "job:update";
  if (status === "succeeded") {
    eventType = "job:complete";
  } else if (status === "failed" || status === "dead_letter") {
    eventType = "job:failed";
  }

  const payload = {
    jobId,
    status,
    progress,
    ...data,
    timestamp: new Date().toISOString(),
  };

  connections.forEach(res => {
    sendEvent(res, eventType, payload);
  });
}

/**
 * Helper to send SSE event
 */
function sendEvent(res: Response, event: string, data: unknown): void {
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (error) {
    // Connection may have closed
  }
}

/**
 * Get count of active SSE connections
 */
export function getActiveConnectionCount(): number {
  let count = 0;
  activeConnections.forEach(connections => {
    count += connections.size;
  });
  return count;
}

export default router;
