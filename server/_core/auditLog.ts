/**
 * Audit Logging System
 * 
 * Tracks sensitive operations for security and compliance.
 */

import { getDb } from '../db';
import { logger } from './logger';

export type AuditAction =
  | 'brand_brain_create'
  | 'brand_brain_update'
  | 'campaign_create'
  | 'campaign_update'
  | 'campaign_delete'
  | 'asset_publish'
  | 'asset_schedule'
  | 'social_connect'
  | 'social_disconnect'
  | 'white_label_update'
  | 'user_invite'
  | 'user_remove'
  | 'influencer_create'
  | 'influencer_update'
  | 'influencer_delete'
  | 'video_generate'
  | 'image_generate'
  | 'login'
  | 'logout'
  | 'settings_update'
  // Admin tenant control actions
  | 'tenant_suspended'
  | 'tenant_unsuspended'
  | 'tenant_set_read_only'
  | 'tenant_limits_reset'
  | 'tenant_limits_updated'
  | 'tenant_usage_reset'
  | 'tenant_plan_changed'
  // GDPR compliance actions
  | 'gdpr_export_requested'
  | 'gdpr_export_completed'
  | 'gdpr_delete_requested'
  | 'gdpr_delete_completed';

export interface AuditLogEntry {
  userId: number;
  organizationId?: number;
  action: AuditAction;
  resourceType: string;
  resourceId?: number;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const db = await getDb();
    
    if (db) {
      // Insert into audit_logs table if it exists
      await db.execute({
        sql: `INSERT INTO audit_logs (userId, organizationId, action, resourceType, resourceId, metadata, ipAddress, userAgent, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        args: [
          entry.userId,
          entry.organizationId || null,
          entry.action,
          entry.resourceType,
          entry.resourceId || null,
          entry.metadata ? JSON.stringify(entry.metadata) : null,
          entry.ipAddress || null,
          entry.userAgent || null,
        ],
      } as any);
    }
    
    // Also log to structured logs for immediate visibility
    logger.info('Audit event', {
      userId: entry.userId,
      orgId: entry.organizationId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      ...entry.metadata,
    });
  } catch (error) {
    // Don't fail the operation if audit logging fails
    logger.error('Failed to log audit event', {
      error: (error as Error).message,
      entry,
    });
  }
}

/**
 * Create an audit logger for a specific request context
 */
export function createAuditLogger(userId: number, organizationId?: number, ipAddress?: string, userAgent?: string) {
  return {
    log: (action: AuditAction, resourceType: string, resourceId?: number, metadata?: Record<string, any>) => {
      return logAuditEvent({
        userId,
        organizationId,
        action,
        resourceType,
        resourceId,
        metadata,
        ipAddress,
        userAgent,
      });
    },
    
    // Convenience methods for common actions
    brandBrainCreated: (brandBrainId: number, metadata?: Record<string, any>) =>
      logAuditEvent({ userId, organizationId, action: 'brand_brain_create', resourceType: 'brand_brain', resourceId: brandBrainId, metadata, ipAddress, userAgent }),
    
    brandBrainUpdated: (brandBrainId: number, metadata?: Record<string, any>) =>
      logAuditEvent({ userId, organizationId, action: 'brand_brain_update', resourceType: 'brand_brain', resourceId: brandBrainId, metadata, ipAddress, userAgent }),
    
    campaignCreated: (campaignId: number, metadata?: Record<string, any>) =>
      logAuditEvent({ userId, organizationId, action: 'campaign_create', resourceType: 'campaign', resourceId: campaignId, metadata, ipAddress, userAgent }),
    
    campaignUpdated: (campaignId: number, metadata?: Record<string, any>) =>
      logAuditEvent({ userId, organizationId, action: 'campaign_update', resourceType: 'campaign', resourceId: campaignId, metadata, ipAddress, userAgent }),
    
    campaignDeleted: (campaignId: number, metadata?: Record<string, any>) =>
      logAuditEvent({ userId, organizationId, action: 'campaign_delete', resourceType: 'campaign', resourceId: campaignId, metadata, ipAddress, userAgent }),
    
    assetPublished: (assetId: number, platform: string, metadata?: Record<string, any>) =>
      logAuditEvent({ userId, organizationId, action: 'asset_publish', resourceType: 'asset', resourceId: assetId, metadata: { platform, ...metadata }, ipAddress, userAgent }),
    
    socialConnected: (platform: string, metadata?: Record<string, any>) =>
      logAuditEvent({ userId, organizationId, action: 'social_connect', resourceType: 'social_connection', metadata: { platform, ...metadata }, ipAddress, userAgent }),
    
    socialDisconnected: (platform: string, connectionId: number, metadata?: Record<string, any>) =>
      logAuditEvent({ userId, organizationId, action: 'social_disconnect', resourceType: 'social_connection', resourceId: connectionId, metadata: { platform, ...metadata }, ipAddress, userAgent }),
    
    influencerCreated: (influencerId: number, metadata?: Record<string, any>) =>
      logAuditEvent({ userId, organizationId, action: 'influencer_create', resourceType: 'influencer', resourceId: influencerId, metadata, ipAddress, userAgent }),
    
    videoGenerated: (metadata?: Record<string, any>) =>
      logAuditEvent({ userId, organizationId, action: 'video_generate', resourceType: 'video', metadata, ipAddress, userAgent }),
    
    imageGenerated: (metadata?: Record<string, any>) =>
      logAuditEvent({ userId, organizationId, action: 'image_generate', resourceType: 'image', metadata, ipAddress, userAgent }),
  };
}

/**
 * Query audit logs for a user or organization
 */
export async function getAuditLogs(
  filters: {
    userId?: number;
    organizationId?: number;
    action?: AuditAction;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
  },
  limit: number = 100,
  offset: number = 0
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  let sql = 'SELECT * FROM audit_logs WHERE 1=1';
  const args: any[] = [];
  
  if (filters.userId) {
    sql += ' AND userId = ?';
    args.push(filters.userId);
  }
  
  if (filters.organizationId) {
    sql += ' AND organizationId = ?';
    args.push(filters.organizationId);
  }
  
  if (filters.action) {
    sql += ' AND action = ?';
    args.push(filters.action);
  }
  
  if (filters.resourceType) {
    sql += ' AND resourceType = ?';
    args.push(filters.resourceType);
  }
  
  if (filters.startDate) {
    sql += ' AND createdAt >= ?';
    args.push(filters.startDate);
  }
  
  if (filters.endDate) {
    sql += ' AND createdAt <= ?';
    args.push(filters.endDate);
  }
  
  sql += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
  args.push(limit, offset);
  
  try {
    const result = await db.execute({ sql, args } as any);
    return result as any[];
  } catch (error) {
    logger.error('Failed to query audit logs', { error: (error as Error).message });
    return [];
  }
}
