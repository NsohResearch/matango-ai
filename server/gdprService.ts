/**
 * GDPR Compliance Service
 * 
 * Handles data export and deletion requests for GDPR compliance.
 */

import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { storagePut } from "./storage";
import { logAuditEvent } from "./_core/auditLog";
import { logger } from "./_core/logger";
import { nanoid } from "nanoid";

export interface GdprExportResult {
  success: boolean;
  downloadUrl?: string;
  expiresAt?: Date;
  error?: string;
}

export interface GdprDeleteResult {
  success: boolean;
  deletedRecords: {
    table: string;
    count: number;
  }[];
  error?: string;
}

/**
 * Collect all user data for GDPR export
 */
async function collectUserData(userId: number): Promise<Record<string, any>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const data: Record<string, any> = {};

  // User profile
  const userResult = await db.execute(
    sql`SELECT id, name, email, loginMethod, role, plan, credits, tenantStatus, createdAt, updatedAt, lastSignedIn 
        FROM users WHERE id = ${userId}`
  );
  data.user = (userResult as any)[0]?.[0] || null;

  // Influencers
  const influencersResult = await db.execute(
    sql`SELECT * FROM influencers WHERE userId = ${userId}`
  );
  data.influencers = (influencersResult as any)[0] || [];

  // Influencer content
  const contentResult = await db.execute(
    sql`SELECT ic.* FROM influencer_content ic 
        JOIN influencers i ON ic.influencerId = i.id 
        WHERE i.userId = ${userId}`
  );
  data.influencerContent = (contentResult as any)[0] || [];

  // Chat messages
  const chatResult = await db.execute(
    sql`SELECT * FROM chat_messages WHERE userId = ${userId}`
  );
  data.chatMessages = (chatResult as any)[0] || [];

  // Scheduled posts
  const postsResult = await db.execute(
    sql`SELECT * FROM scheduled_posts WHERE userId = ${userId}`
  );
  data.scheduledPosts = (postsResult as any)[0] || [];

  // Analytics data
  const analyticsResult = await db.execute(
    sql`SELECT ad.* FROM analytics_data ad 
        JOIN influencers i ON ad.influencerId = i.id 
        WHERE i.userId = ${userId}`
  );
  data.analyticsData = (analyticsResult as any)[0] || [];

  // Notification preferences
  const notifResult = await db.execute(
    sql`SELECT * FROM notification_preferences WHERE userId = ${userId}`
  );
  data.notificationPreferences = (notifResult as any)[0] || [];

  // Notifications
  const notificationsResult = await db.execute(
    sql`SELECT * FROM notifications WHERE userId = ${userId}`
  );
  data.notifications = (notificationsResult as any)[0] || [];

  // Content templates
  const templatesResult = await db.execute(
    sql`SELECT * FROM content_templates WHERE userId = ${userId}`
  );
  data.contentTemplates = (templatesResult as any)[0] || [];

  // Collaborators
  const collabResult = await db.execute(
    sql`SELECT * FROM collaborators WHERE userId = ${userId} OR invitedByUserId = ${userId}`
  );
  data.collaborators = (collabResult as any)[0] || [];

  // Campaigns
  const campaignsResult = await db.execute(
    sql`SELECT * FROM campaigns WHERE userId = ${userId}`
  );
  data.campaigns = (campaignsResult as any)[0] || [];

  // Unified campaigns
  const unifiedCampaignsResult = await db.execute(
    sql`SELECT * FROM unified_campaigns WHERE userId = ${userId}`
  );
  data.unifiedCampaigns = (unifiedCampaignsResult as any)[0] || [];

  // Campaign assets
  const assetsResult = await db.execute(
    sql`SELECT ca.* FROM campaign_assets ca 
        JOIN unified_campaigns uc ON ca.campaignId = uc.id 
        WHERE uc.userId = ${userId}`
  );
  data.campaignAssets = (assetsResult as any)[0] || [];

  // Business DNA / Brand Brain
  const brandBrainResult = await db.execute(
    sql`SELECT * FROM business_dna WHERE userId = ${userId}`
  );
  data.brandBrain = (brandBrainResult as any)[0] || [];

  // Leads
  const leadsResult = await db.execute(
    sql`SELECT * FROM leads WHERE userId = ${userId}`
  );
  data.leads = (leadsResult as any)[0] || [];

  // Social connections (without tokens)
  const socialResult = await db.execute(
    sql`SELECT id, userId, platform, platformUserId, platformUsername, isActive, createdAt, updatedAt 
        FROM social_connections WHERE userId = ${userId}`
  );
  data.socialConnections = (socialResult as any)[0] || [];

  // Social posts
  const socialPostsResult = await db.execute(
    sql`SELECT * FROM social_posts WHERE userId = ${userId}`
  );
  data.socialPosts = (socialPostsResult as any)[0] || [];

  // A/B tests
  const abTestsResult = await db.execute(
    sql`SELECT * FROM ab_tests WHERE userId = ${userId}`
  );
  data.abTests = (abTestsResult as any)[0] || [];

  // Video scripts
  const videoScriptsResult = await db.execute(
    sql`SELECT * FROM video_scripts WHERE userId = ${userId}`
  );
  data.videoScripts = (videoScriptsResult as any)[0] || [];

  // Video jobs
  const videoJobsResult = await db.execute(
    sql`SELECT * FROM video_jobs WHERE userId = ${userId}`
  );
  data.videoJobs = (videoJobsResult as any)[0] || [];

  // Purchases
  const purchasesResult = await db.execute(
    sql`SELECT id, userId, plan, amount, currency, status, createdAt FROM purchases WHERE userId = ${userId}`
  );
  data.purchases = (purchasesResult as any)[0] || [];

  // Tenant limits
  const limitsResult = await db.execute(
    sql`SELECT * FROM tenant_limits WHERE userId = ${userId}`
  );
  data.tenantLimits = (limitsResult as any)[0] || [];

  // Usage counters
  const usageResult = await db.execute(
    sql`SELECT * FROM usage_counters WHERE userId = ${userId}`
  );
  data.usageCounters = (usageResult as any)[0] || [];

  // Audit logs (user's own actions)
  const auditResult = await db.execute(
    sql`SELECT * FROM audit_logs WHERE userId = ${userId} ORDER BY createdAt DESC LIMIT 1000`
  );
  data.auditLogs = (auditResult as any)[0] || [];

  return data;
}

/**
 * Process a GDPR data export request
 */
export async function processGdprExport(
  requestId: number,
  userId: number,
  adminId?: number
): Promise<GdprExportResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Update request status to processing
    await db.execute(
      sql`UPDATE data_export_requests SET status = 'processing' WHERE id = ${requestId}`
    );

    // Collect all user data
    const userData = await collectUserData(userId);

    // Add metadata
    const exportData = {
      exportedAt: new Date().toISOString(),
      userId,
      requestId,
      data: userData,
    };

    // Convert to JSON
    const jsonContent = JSON.stringify(exportData, null, 2);
    const buffer = Buffer.from(jsonContent, "utf-8");

    // Upload to S3
    const fileKey = `gdpr-exports/${userId}/${nanoid()}.json`;
    const { url } = await storagePut(fileKey, buffer, "application/json");

    // Set expiry (30 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Update request with download URL
    await db.execute(
      sql`UPDATE data_export_requests SET 
          status = 'completed',
          downloadUrl = ${url},
          expiresAt = ${expiresAt},
          processedBy = ${adminId || null},
          processedAt = NOW()
          WHERE id = ${requestId}`
    );

    // Log audit event
    await logAuditEvent({
      userId: adminId || userId,
      action: "gdpr_export_completed",
      resourceType: "data_export_request",
      resourceId: requestId,
      metadata: { targetUserId: userId },
    });

    logger.info("GDPR export completed", { requestId: String(requestId), userId, url });

    return {
      success: true,
      downloadUrl: url,
      expiresAt,
    };
  } catch (error) {
    logger.error("GDPR export failed", { requestId: String(requestId), userId, errorMsg: (error as Error).message });

    // Update request status to failed
    await db.execute(
      sql`UPDATE data_export_requests SET status = 'failed' WHERE id = ${requestId}`
    );

    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Process a GDPR data deletion request
 */
export async function processGdprDelete(
  requestId: number,
  userId: number,
  adminId: number
): Promise<GdprDeleteResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const deletedRecords: { table: string; count: number }[] = [];

  try {
    // Update request status to processing
    await db.execute(
      sql`UPDATE data_export_requests SET status = 'processing' WHERE id = ${requestId}`
    );

    // Delete in order to respect foreign key constraints
    // Start with child tables first

    // 1. Delete chat messages
    const chatResult = await db.execute(
      sql`DELETE FROM chat_messages WHERE userId = ${userId}`
    );
    deletedRecords.push({ table: "chat_messages", count: (chatResult as any)[0]?.affectedRows || 0 });

    // 2. Delete notifications
    const notifResult = await db.execute(
      sql`DELETE FROM notifications WHERE userId = ${userId}`
    );
    deletedRecords.push({ table: "notifications", count: (notifResult as any)[0]?.affectedRows || 0 });

    // 3. Delete notification preferences
    const notifPrefResult = await db.execute(
      sql`DELETE FROM notification_preferences WHERE userId = ${userId}`
    );
    deletedRecords.push({ table: "notification_preferences", count: (notifPrefResult as any)[0]?.affectedRows || 0 });

    // 4. Delete scheduled posts
    const postsResult = await db.execute(
      sql`DELETE FROM scheduled_posts WHERE userId = ${userId}`
    );
    deletedRecords.push({ table: "scheduled_posts", count: (postsResult as any)[0]?.affectedRows || 0 });

    // 5. Delete social posts
    const socialPostsResult = await db.execute(
      sql`DELETE FROM social_posts WHERE userId = ${userId}`
    );
    deletedRecords.push({ table: "social_posts", count: (socialPostsResult as any)[0]?.affectedRows || 0 });

    // 6. Delete social connections
    const socialResult = await db.execute(
      sql`DELETE FROM social_connections WHERE userId = ${userId}`
    );
    deletedRecords.push({ table: "social_connections", count: (socialResult as any)[0]?.affectedRows || 0 });

    // 7. Delete A/B test variants first
    await db.execute(
      sql`DELETE av FROM ab_test_variants av 
          JOIN ab_tests at ON av.testId = at.id 
          WHERE at.userId = ${userId}`
    );

    // 8. Delete A/B tests
    const abTestsResult = await db.execute(
      sql`DELETE FROM ab_tests WHERE userId = ${userId}`
    );
    deletedRecords.push({ table: "ab_tests", count: (abTestsResult as any)[0]?.affectedRows || 0 });

    // 9. Delete campaign assets
    await db.execute(
      sql`DELETE ca FROM campaign_assets ca 
          JOIN unified_campaigns uc ON ca.campaignId = uc.id 
          WHERE uc.userId = ${userId}`
    );

    // 10. Delete unified campaigns
    const unifiedCampaignsResult = await db.execute(
      sql`DELETE FROM unified_campaigns WHERE userId = ${userId}`
    );
    deletedRecords.push({ table: "unified_campaigns", count: (unifiedCampaignsResult as any)[0]?.affectedRows || 0 });

    // 11. Delete campaign scenes
    await db.execute(
      sql`DELETE cs FROM campaign_scenes cs 
          JOIN campaigns c ON cs.campaignId = c.id 
          WHERE c.userId = ${userId}`
    );

    // 12. Delete campaigns
    const campaignsResult = await db.execute(
      sql`DELETE FROM campaigns WHERE userId = ${userId}`
    );
    deletedRecords.push({ table: "campaigns", count: (campaignsResult as any)[0]?.affectedRows || 0 });

    // 13. Delete leads
    const leadsResult = await db.execute(
      sql`DELETE FROM leads WHERE userId = ${userId}`
    );
    deletedRecords.push({ table: "leads", count: (leadsResult as any)[0]?.affectedRows || 0 });

    // 14. Delete video scripts
    const videoScriptsResult = await db.execute(
      sql`DELETE FROM video_scripts WHERE userId = ${userId}`
    );
    deletedRecords.push({ table: "video_scripts", count: (videoScriptsResult as any)[0]?.affectedRows || 0 });

    // 15. Delete video jobs
    const videoJobsResult = await db.execute(
      sql`DELETE FROM video_jobs WHERE userId = ${userId}`
    );
    deletedRecords.push({ table: "video_jobs", count: (videoJobsResult as any)[0]?.affectedRows || 0 });

    // 16. Delete business DNA / Brand Brain
    const brandBrainResult = await db.execute(
      sql`DELETE FROM business_dna WHERE userId = ${userId}`
    );
    deletedRecords.push({ table: "business_dna", count: (brandBrainResult as any)[0]?.affectedRows || 0 });

    // 17. Delete content templates
    const templatesResult = await db.execute(
      sql`DELETE FROM content_templates WHERE userId = ${userId}`
    );
    deletedRecords.push({ table: "content_templates", count: (templatesResult as any)[0]?.affectedRows || 0 });

    // 18. Delete collaborators
    const collabResult = await db.execute(
      sql`DELETE FROM collaborators WHERE userId = ${userId} OR invitedByUserId = ${userId}`
    );
    deletedRecords.push({ table: "collaborators", count: (collabResult as any)[0]?.affectedRows || 0 });

    // 19. Delete analytics data for user's influencers
    await db.execute(
      sql`DELETE ad FROM analytics_data ad 
          JOIN influencers i ON ad.influencerId = i.id 
          WHERE i.userId = ${userId}`
    );

    // 20. Delete influencer content
    await db.execute(
      sql`DELETE ic FROM influencer_content ic 
          JOIN influencers i ON ic.influencerId = i.id 
          WHERE i.userId = ${userId}`
    );

    // 21. Delete influencer settings
    await db.execute(
      sql`DELETE ise FROM influencer_settings ise 
          JOIN influencers i ON ise.influencerId = i.id 
          WHERE i.userId = ${userId}`
    );

    // 22. Delete influencers
    const influencersResult = await db.execute(
      sql`DELETE FROM influencers WHERE userId = ${userId}`
    );
    deletedRecords.push({ table: "influencers", count: (influencersResult as any)[0]?.affectedRows || 0 });

    // 23. Delete tenant limits
    const limitsResult = await db.execute(
      sql`DELETE FROM tenant_limits WHERE userId = ${userId}`
    );
    deletedRecords.push({ table: "tenant_limits", count: (limitsResult as any)[0]?.affectedRows || 0 });

    // 24. Delete usage counters
    const usageResult = await db.execute(
      sql`DELETE FROM usage_counters WHERE userId = ${userId}`
    );
    deletedRecords.push({ table: "usage_counters", count: (usageResult as any)[0]?.affectedRows || 0 });

    // 25. Delete purchases (keep for accounting, but anonymize)
    await db.execute(
      sql`UPDATE purchases SET userId = 0 WHERE userId = ${userId}`
    );

    // 26. Anonymize audit logs (keep for compliance, but remove PII)
    await db.execute(
      sql`UPDATE audit_logs SET metadata = NULL WHERE userId = ${userId}`
    );

    // 27. Finally, delete or anonymize the user
    // We anonymize rather than delete to maintain referential integrity
    await db.execute(
      sql`UPDATE users SET 
          name = 'Deleted User',
          email = CONCAT('deleted_', id, '@deleted.local'),
          openId = CONCAT('deleted_', id),
          tenantStatus = 'suspended',
          suspensionReason = 'GDPR deletion request',
          updatedAt = NOW()
          WHERE id = ${userId}`
    );
    deletedRecords.push({ table: "users", count: 1 });

    // Update request status to completed
    await db.execute(
      sql`UPDATE data_export_requests SET 
          status = 'completed',
          processedBy = ${adminId},
          processedAt = NOW()
          WHERE id = ${requestId}`
    );

    // Log audit event
    await logAuditEvent({
      userId: adminId,
      action: "gdpr_delete_completed",
      resourceType: "data_export_request",
      resourceId: requestId,
      metadata: { targetUserId: userId, deletedRecords },
    });

    logger.info("GDPR deletion completed", { requestId: String(requestId), userId, deletedRecords });

    return {
      success: true,
      deletedRecords,
    };
  } catch (error) {
    logger.error("GDPR deletion failed", { requestId: String(requestId), userId, errorMsg: (error as Error).message });

    // Update request status to failed
    await db.execute(
      sql`UPDATE data_export_requests SET status = 'failed' WHERE id = ${requestId}`
    );

    return {
      success: false,
      deletedRecords,
      error: (error as Error).message,
    };
  }
}

/**
 * Create a new GDPR request
 */
export async function createGdprRequest(
  userId: number,
  requestType: "export" | "delete"
): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(
    sql`INSERT INTO data_export_requests (userId, requestType, status, createdAt)
        VALUES (${userId}, ${requestType}, 'pending', NOW())`
  );

  const insertId = (result as any)[0]?.insertId;

  // Log audit event
  await logAuditEvent({
    userId,
    action: requestType === "export" ? "gdpr_export_requested" : "gdpr_delete_requested",
    resourceType: "data_export_request",
    resourceId: insertId,
    metadata: { requestType },
  });

  return { id: insertId };
}

/**
 * Get GDPR requests for a user
 */
export async function getGdprRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(
    sql`SELECT * FROM data_export_requests WHERE userId = ${userId} ORDER BY createdAt DESC`
  );

  return (result as any)[0] || [];
}

/**
 * Get all pending GDPR requests (for admin)
 */
export async function getPendingGdprRequests() {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(
    sql`SELECT der.*, u.name as userName, u.email as userEmail 
        FROM data_export_requests der
        JOIN users u ON der.userId = u.id
        WHERE der.status IN ('pending', 'processing')
        ORDER BY der.createdAt ASC`
  );

  return (result as any)[0] || [];
}
