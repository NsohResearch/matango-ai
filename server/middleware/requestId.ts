/**
 * Request ID Middleware
 * 
 * Generates unique request IDs for distributed tracing and correlation.
 * The ID is attached to the request object and included in all logs.
 */

import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

// Note: requestId is already declared in server/_core/logger.ts
// We extend the existing declaration here

/**
 * Middleware to generate and attach request IDs
 * 
 * - Checks for existing X-Request-ID header (from upstream proxy/gateway)
 * - Generates a new UUID if none exists
 * - Attaches to request object and response header
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Check for existing request ID from upstream
  const existingId = req.headers["x-request-id"];
  const requestId = typeof existingId === "string" && existingId.length > 0
    ? existingId
    : randomUUID();

  // Attach to request object
  req.requestId = requestId;

  // Include in response headers for client correlation
  res.setHeader("X-Request-ID", requestId);

  // Log request start
  console.log(JSON.stringify({
    level: "info",
    event: "request_start",
    requestId,
    method: req.method,
    path: req.path,
    userAgent: req.headers["user-agent"],
    ip: getClientIP(req),
    timestamp: new Date().toISOString(),
  }));

  // Track response time
  const startTime = Date.now();

  // Log on response finish
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      level: "info",
      event: "request_end",
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date().toISOString(),
    }));
  });

  next();
}

/**
 * Extract client IP from request
 */
function getClientIP(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ips = typeof forwarded === "string" ? forwarded.split(",") : forwarded;
    return ips[0]?.trim() ?? null;
  }
  
  const realIP = req.headers["x-real-ip"];
  if (realIP) {
    return typeof realIP === "string" ? realIP : realIP[0] ?? null;
  }
  
  return req.socket?.remoteAddress ?? req.ip ?? null;
}
