/**
 * Audit Service - Immutable logging for security-sensitive actions
 * 
 * This service provides structured audit logging for all security-relevant
 * operations in the Matango.ai platform. Logs are immutable and include
 * full context for forensic analysis.
 */

import { getDb } from "../db";
import { adminAuditLog } from "../../drizzle/schema";
import type { TrpcContext } from "../_core/context";

export type AuditAction = 
  // Auth actions
  | "auth.login"
  | "auth.logout"
  | "auth.session_refresh"
  | "auth.password_change"
  
  // Brand Brain actions
  | "brandBrain.create"
  | "brandBrain.update"
  | "brandBrain.delete"
  | "brandBrain.archive"
  
  // Influencer actions
  | "influencer.create"
  | "influencer.update"
  | "influencer.delete"
  | "influencer.generate_image"
  
  // Campaign actions
  | "campaign.create"
  | "campaign.update"
  | "campaign.delete"
  | "campaign.publish"
  | "campaign.schedule"
  
  // Content actions
  | "content.generate"
  | "content.update"
  | "content.delete"
  | "content.publish"
  
  // Creator OS actions
  | "creator.projectCreate"
  | "creator.projectUpdate"
  | "creator.projectDelete"
  | "creator.sceneCreate"
  | "creator.sceneUpdate"
  | "creator.sceneDelete"
  | "creator.elementAdd"
  | "creator.elementUpdate"
  | "creator.elementDelete"
  | "creator.exportCreate"
  | "creator.exportCancel"
  
  // Social actions
  | "social.connect"
  | "social.disconnect"
  | "social.publish"
  | "social.refresh_token"
  
  // Admin actions
  | "admin.user_suspend"
  | "admin.user_activate"
  | "admin.user_role_change"
  | "admin.plan_change"
  | "admin.feature_toggle"
  
  // GDPR actions
  | "gdpr.data_export_request"
  | "gdpr.data_export_complete"
  | "gdpr.data_deletion_request"
  | "gdpr.data_deletion_complete"
  
  // Payment actions
  | "payment.checkout_created"
  | "payment.checkout_completed"
  | "payment.subscription_created"
  | "payment.subscription_cancelled"
  | "payment.refund_issued"
  
  // Generic actions
  | string;

export type ResourceType = 
  | "user"
  | "organization"
  | "brand_brain"
  | "influencer"
  | "campaign"
  | "campaign_asset"
  | "content"
  | "creator_project"
  | "creator_scene"
  | "creator_scene_element"
  | "creator_export_job"
  | "social_connection"
  | "lead"
  | "payment"
  | "subscription"
  | string;

export interface AuditPayload {
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: number | string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event with full context
 * 
 * @param ctx - tRPC context containing user and request info
 * @param payload - Audit event details
 */
export async function audit(
  ctx: Pick<TrpcContext, "user" | "req">,
  payload: AuditPayload
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.error("[Audit] Database not available");
      return;
    }

    const userId = ctx.user?.id ?? 0;
    const ipAddress = getClientIP(ctx.req);
    const userAgent = ctx.req?.headers?.["user-agent"] ?? null;
    const requestId = (ctx.req as any)?.requestId ?? null;

    await db.insert(adminAuditLog).values({
      adminUserId: userId,
      action: payload.action,
      targetType: payload.resourceType,
      targetId: typeof payload.resourceId === "number" 
        ? payload.resourceId 
        : payload.resourceId 
          ? parseInt(payload.resourceId, 10) || null 
          : null,
      metadata: {
        ...payload.metadata,
        requestId,
        timestamp: new Date().toISOString(),
      },
      ipAddress,
      userAgent,
    });

    // Also log to console for immediate visibility
    console.log(JSON.stringify({
      level: "audit",
      action: payload.action,
      resourceType: payload.resourceType,
      resourceId: payload.resourceId,
      userId,
      ipAddress,
      requestId,
      timestamp: new Date().toISOString(),
    }));
  } catch (error) {
    // Never throw from audit - log and continue
    console.error("[Audit] Failed to log audit event:", error);
  }
}

/**
 * Extract client IP from request, handling proxies
 */
function getClientIP(req: any): string | null {
  if (!req) return null;
  
  // Check X-Forwarded-For header (common for proxies/load balancers)
  const forwarded = req.headers?.["x-forwarded-for"];
  if (forwarded) {
    const ips = typeof forwarded === "string" 
      ? forwarded.split(",") 
      : forwarded;
    return ips[0]?.trim() ?? null;
  }
  
  // Check X-Real-IP header (nginx)
  const realIP = req.headers?.["x-real-ip"];
  if (realIP) {
    return typeof realIP === "string" ? realIP : realIP[0] ?? null;
  }
  
  // Fall back to socket remote address
  return req.socket?.remoteAddress ?? req.ip ?? null;
}

/**
 * Audit helper for batch operations
 */
export async function auditBatch(
  ctx: Pick<TrpcContext, "user" | "req">,
  events: AuditPayload[]
): Promise<void> {
  for (const event of events) {
    await audit(ctx, event);
  }
}

/**
 * Create an audit trail for a specific resource
 */
export async function getAuditTrail(
  resourceType: ResourceType,
  resourceId: number,
  limit: number = 100
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const { eq, and, desc } = await import("drizzle-orm");
  
  return db
    .select()
    .from(adminAuditLog)
    .where(
      and(
        eq(adminAuditLog.targetType, resourceType),
        eq(adminAuditLog.targetId, resourceId)
      )
    )
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(limit);
}

/**
 * Get user's audit history
 */
export async function getUserAuditHistory(
  userId: number,
  limit: number = 100
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const { eq, desc } = await import("drizzle-orm");
  
  return db
    .select()
    .from(adminAuditLog)
    .where(eq(adminAuditLog.adminUserId, userId))
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(limit);
}
