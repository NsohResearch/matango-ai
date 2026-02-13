import { eq, desc, and, gte, lte, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  influencers, InsertInfluencer, Influencer, 
  influencerContent, InsertInfluencerContent, 
  chatMessages, InsertChatMessage, ChatMessage, 
  scheduledPosts, InsertScheduledPost, ScheduledPost, 
  analyticsData, InsertAnalyticsData, AnalyticsData,
  notificationPreferences, InsertNotificationPreference, NotificationPreference,
  notifications, InsertNotification, Notification,
  contentTemplates, InsertContentTemplate, ContentTemplate,
  collaborators, InsertCollaborator, Collaborator,
  campaigns, InsertCampaign, Campaign,
  campaignScenes, InsertCampaignScene, CampaignScene,
  influencerSettings, InsertInfluencerSetting, InfluencerSetting
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Influencer queries
export async function createInfluencer(data: InsertInfluencer): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(influencers).values(data);
  return result[0].insertId;
}

export async function getInfluencersByUserId(userId: number): Promise<Influencer[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(influencers).where(eq(influencers.userId, userId));
}

export async function getInfluencerById(id: number): Promise<Influencer | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(influencers).where(eq(influencers.id, id)).limit(1);
  return result[0];
}

export async function getPublicInfluencers(): Promise<Influencer[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(influencers).where(eq(influencers.isPublic, true));
}

export async function updateInfluencer(id: number, data: Partial<InsertInfluencer>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(influencers).set(data).where(eq(influencers.id, id));
}

export async function deleteInfluencer(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(influencers).where(eq(influencers.id, id));
}

// Influencer content queries
export async function addInfluencerContent(data: InsertInfluencerContent): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(influencerContent).values(data);
  return result[0].insertId;
}

export async function getInfluencerContent(influencerId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(influencerContent).where(eq(influencerContent.influencerId, influencerId));
}

// Chat message queries
export async function addChatMessage(data: InsertChatMessage): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(chatMessages).values(data);
  return result[0].insertId;
}

export async function getChatMessages(influencerId: number, userId: number, limit: number = 50): Promise<ChatMessage[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(chatMessages)
    .where(and(eq(chatMessages.influencerId, influencerId), eq(chatMessages.userId, userId)))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
}

// Scheduled posts queries
export async function createScheduledPost(data: InsertScheduledPost): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(scheduledPosts).values(data);
  return result[0].insertId;
}

export async function getScheduledPosts(userId: number): Promise<ScheduledPost[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(scheduledPosts)
    .where(eq(scheduledPosts.userId, userId))
    .orderBy(desc(scheduledPosts.scheduledFor));
}

export async function getScheduledPostsByInfluencer(influencerId: number): Promise<ScheduledPost[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(scheduledPosts)
    .where(eq(scheduledPosts.influencerId, influencerId))
    .orderBy(desc(scheduledPosts.scheduledFor));
}

export async function updateScheduledPost(id: number, data: Partial<InsertScheduledPost>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(scheduledPosts).set(data).where(eq(scheduledPosts.id, id));
}

export async function deleteScheduledPost(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(scheduledPosts).where(eq(scheduledPosts.id, id));
}

export async function getScheduledPostById(id: number): Promise<ScheduledPost | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(scheduledPosts).where(eq(scheduledPosts.id, id)).limit(1);
  return result[0];
}

// Analytics queries
export async function addAnalyticsData(data: InsertAnalyticsData): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(analyticsData).values(data);
  return result[0].insertId;
}

export async function getAnalyticsData(influencerId: number, startDate?: Date, endDate?: Date): Promise<AnalyticsData[]> {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(analyticsData).where(eq(analyticsData.influencerId, influencerId));
  
  if (startDate && endDate) {
    query = db.select()
      .from(analyticsData)
      .where(and(
        eq(analyticsData.influencerId, influencerId),
        gte(analyticsData.date, startDate),
        lte(analyticsData.date, endDate)
      ));
  }
  
  return query.orderBy(desc(analyticsData.date));
}

export async function getLatestAnalytics(influencerId: number): Promise<AnalyticsData | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select()
    .from(analyticsData)
    .where(eq(analyticsData.influencerId, influencerId))
    .orderBy(desc(analyticsData.date))
    .limit(1);
  return result[0];
}


// ============================================
// Notification Preferences
// ============================================

export async function getNotificationPreferences(userId: number): Promise<NotificationPreference | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  return result[0];
}

export async function upsertNotificationPreferences(userId: number, data: Partial<InsertNotificationPreference>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(notificationPreferences)
    .values({ userId, ...data })
    .onDuplicateKeyUpdate({ set: data });
}

// ============================================
// Notifications
// ============================================

export async function createNotification(data: InsertNotification): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(notifications).values(data);
  return result[0].insertId;
}

export async function getNotifications(userId: number, limit: number = 20): Promise<Notification[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return result[0]?.count || 0;
}

export async function markNotificationRead(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

// ============================================
// Content Templates
// ============================================

export async function createContentTemplate(data: InsertContentTemplate): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(contentTemplates).values(data);
  return result[0].insertId;
}

export async function getContentTemplates(userId?: number): Promise<ContentTemplate[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Get system templates (userId is null) and user's own templates
  if (userId) {
    return db.select()
      .from(contentTemplates)
      .where(sql`${contentTemplates.userId} IS NULL OR ${contentTemplates.userId} = ${userId} OR ${contentTemplates.isPublic} = true`)
      .orderBy(desc(contentTemplates.usageCount));
  }
  
  // Only system templates for unauthenticated users
  return db.select()
    .from(contentTemplates)
    .where(sql`${contentTemplates.userId} IS NULL OR ${contentTemplates.isPublic} = true`)
    .orderBy(desc(contentTemplates.usageCount));
}

export async function getContentTemplateById(id: number): Promise<ContentTemplate | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(contentTemplates).where(eq(contentTemplates.id, id)).limit(1);
  return result[0];
}

export async function updateContentTemplate(id: number, data: Partial<InsertContentTemplate>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(contentTemplates).set(data).where(eq(contentTemplates.id, id));
}

export async function deleteContentTemplate(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(contentTemplates).where(eq(contentTemplates.id, id));
}

export async function incrementTemplateUsage(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(contentTemplates)
    .set({ usageCount: sql`${contentTemplates.usageCount} + 1` })
    .where(eq(contentTemplates.id, id));
}

// ============================================
// Collaborators
// ============================================

export async function createCollaborator(data: InsertCollaborator): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(collaborators).values(data);
  return result[0].insertId;
}

export async function getCollaboratorsByInfluencer(influencerId: number): Promise<Collaborator[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(collaborators)
    .where(eq(collaborators.influencerId, influencerId));
}

export async function getCollaboratorByToken(token: string): Promise<Collaborator | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select()
    .from(collaborators)
    .where(eq(collaborators.inviteToken, token))
    .limit(1);
  return result[0];
}

export async function getCollaboratorById(id: number): Promise<Collaborator | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(collaborators).where(eq(collaborators.id, id)).limit(1);
  return result[0];
}

export async function updateCollaborator(id: number, data: Partial<InsertCollaborator>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(collaborators).set(data).where(eq(collaborators.id, id));
}

export async function deleteCollaborator(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(collaborators).where(eq(collaborators.id, id));
}

export async function getSharedInfluencers(userId: number): Promise<Influencer[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Get influencers where user is a collaborator with accepted status
  const collabs = await db.select()
    .from(collaborators)
    .where(and(eq(collaborators.userId, userId), eq(collaborators.status, "accepted")));
  
  if (collabs.length === 0) return [];
  
  const influencerIds = collabs.map(c => c.influencerId);
  const results: Influencer[] = [];
  
  for (const id of influencerIds) {
    const inf = await getInfluencerById(id);
    if (inf) results.push(inf);
  }
  
  return results;
}

// ============================================
// Campaigns (Story Mode)
// ============================================

export async function createCampaign(data: InsertCampaign): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(campaigns).values(data);
  return result[0].insertId;
}

export async function getCampaignsByInfluencer(influencerId: number): Promise<Campaign[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(campaigns)
    .where(eq(campaigns.influencerId, influencerId))
    .orderBy(desc(campaigns.createdAt));
}

export async function getCampaignById(id: number): Promise<Campaign | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return result[0];
}

export async function updateCampaign(id: number, data: Partial<InsertCampaign>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(campaigns).set(data).where(eq(campaigns.id, id));
}

export async function deleteCampaign(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete scenes first
  await db.delete(campaignScenes).where(eq(campaignScenes.campaignId, id));
  await db.delete(campaigns).where(eq(campaigns.id, id));
}

// ============================================
// Campaign Scenes
// ============================================

export async function createCampaignScene(data: InsertCampaignScene): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(campaignScenes).values(data);
  return result[0].insertId;
}

export async function getCampaignScenes(campaignId: number): Promise<CampaignScene[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select()
    .from(campaignScenes)
    .where(eq(campaignScenes.campaignId, campaignId))
    .orderBy(campaignScenes.sceneOrder);
}

export async function getCampaignSceneById(id: number): Promise<CampaignScene | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(campaignScenes).where(eq(campaignScenes.id, id)).limit(1);
  return result[0];
}

export async function updateCampaignScene(id: number, data: Partial<InsertCampaignScene>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(campaignScenes).set(data).where(eq(campaignScenes.id, id));
}

export async function deleteCampaignScene(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(campaignScenes).where(eq(campaignScenes.id, id));
}

// ============================================
// Influencer Settings (Character Consistency)
// ============================================

export async function getInfluencerSettings(influencerId: number): Promise<InfluencerSetting | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select()
    .from(influencerSettings)
    .where(eq(influencerSettings.influencerId, influencerId))
    .limit(1);
  return result[0];
}

export async function upsertInfluencerSettings(influencerId: number, data: Partial<InsertInfluencerSetting>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(influencerSettings)
    .values({ influencerId, ...data })
    .onDuplicateKeyUpdate({ set: data });
}

// ============================================
// User queries
// ============================================

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}


// ============================================
// Business DNA (Brand Brain)
// ============================================

export async function getBusinessDna(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  // Query directly from the business_dna table using sql template
  const result = await db.execute(
    sql`SELECT * FROM business_dna WHERE userId = ${userId} ORDER BY createdAt DESC LIMIT 1`
  );
  
  const rows = result[0] as unknown as any[];
  if (!rows || rows.length === 0) return null;
  
  const row = rows[0];
  
  // Parse JSON fields safely
  const parseJson = (val: any) => {
    if (!val) return [];
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return []; }
    }
    return val;
  };
  
  return {
    id: row.id,
    userId: row.userId,
    productName: row.productName,
    websiteUrl: row.websiteUrl,
    category: row.category,
    tagline: row.tagline,
    icpPersonas: parseJson(row.icpPersonas),
    keyOutcomes: parseJson(row.keyOutcomes),
    differentiators: parseJson(row.differentiators),
    claimsProofMapping: parseJson(row.claimsProofMapping),
    objectionHandling: parseJson(row.objectionHandling),
    brandTone: row.brandTone,
    voiceRules: parseJson(row.voiceRules),
    forbiddenPhrases: parseJson(row.forbiddenPhrases),
    isComplete: row.isComplete,
    completionScore: row.completionScore,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function upsertBusinessDna(userId: number, data: {
  productName: string;
  websiteUrl?: string;
  category?: string;
  tagline?: string;
  brandTone?: string;
  icpPersonas?: any[];
  keyOutcomes?: string[];
  differentiators?: string[];
  claimsProofMapping?: any[];
  objectionHandling?: any[];
  voiceRules?: string[];
  forbiddenPhrases?: string[];
  isComplete?: boolean;
  completionScore?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if exists
  const existing = await getBusinessDna(userId);
  
  const icpPersonasJson = JSON.stringify(data.icpPersonas || []);
  const keyOutcomesJson = JSON.stringify(data.keyOutcomes || []);
  const differentiatorsJson = JSON.stringify(data.differentiators || []);
  const claimsProofMappingJson = JSON.stringify(data.claimsProofMapping || []);
  const objectionHandlingJson = JSON.stringify(data.objectionHandling || []);
  const voiceRulesJson = JSON.stringify(data.voiceRules || []);
  const forbiddenPhrasesJson = JSON.stringify(data.forbiddenPhrases || []);
  const isCompleteVal = data.isComplete ? 1 : 0;
  const completionScoreVal = data.completionScore || 0;
  const brandToneVal = data.brandTone || 'professional';
  const websiteUrlVal = data.websiteUrl || null;
  const categoryVal = data.category || null;
  const taglineVal = data.tagline || null;

  if (existing) {
    // Update
    await db.execute(
      sql`UPDATE business_dna SET 
        productName = ${data.productName},
        websiteUrl = ${websiteUrlVal},
        category = ${categoryVal},
        tagline = ${taglineVal},
        brandTone = ${brandToneVal},
        icpPersonas = ${icpPersonasJson},
        keyOutcomes = ${keyOutcomesJson},
        differentiators = ${differentiatorsJson},
        claimsProofMapping = ${claimsProofMappingJson},
        objectionHandling = ${objectionHandlingJson},
        voiceRules = ${voiceRulesJson},
        forbiddenPhrases = ${forbiddenPhrasesJson},
        isComplete = ${isCompleteVal},
        completionScore = ${completionScoreVal},
        updatedAt = NOW()
      WHERE userId = ${userId}`
    );
  } else {
    // Insert
    await db.execute(
      sql`INSERT INTO business_dna (
        organizationId, userId, productName, websiteUrl, category, tagline, brandTone,
        icpPersonas, keyOutcomes, differentiators, claimsProofMapping, objectionHandling,
        voiceRules, forbiddenPhrases, isComplete, completionScore
      ) VALUES (
        ${1}, ${userId}, ${data.productName}, ${websiteUrlVal}, ${categoryVal}, ${taglineVal}, ${brandToneVal},
        ${icpPersonasJson}, ${keyOutcomesJson}, ${differentiatorsJson}, ${claimsProofMappingJson}, ${objectionHandlingJson},
        ${voiceRulesJson}, ${forbiddenPhrasesJson}, ${isCompleteVal}, ${completionScoreVal}
      )`
    );
  }
}


// ============================================
// Phase 6 - Social Connections
// ============================================

export async function createSocialConnection(connection: {
  userId: number;
  platform: 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'linkedin';
  platformUserId?: string;
  platformUsername?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  scopes?: string[];
  profilePictureUrl?: string;
  metadata?: Record<string, any>;
}) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(
    sql`INSERT INTO social_connections (userId, platform, platformUserId, platformUsername, accessToken, refreshToken, tokenExpiresAt, scopes, profilePictureUrl, metadata)
        VALUES (${connection.userId}, ${connection.platform}, ${connection.platformUserId || null}, ${connection.platformUsername || null}, 
                ${connection.accessToken || null}, ${connection.refreshToken || null}, ${connection.tokenExpiresAt || null},
                ${JSON.stringify(connection.scopes || [])}, ${connection.profilePictureUrl || null}, ${JSON.stringify(connection.metadata || {})})`
  );
  const insertResult = result as any;
  return { id: insertResult[0]?.insertId };
}

export async function getSocialConnectionsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(
    sql`SELECT * FROM social_connections WHERE userId = ${userId} AND isActive = TRUE ORDER BY createdAt DESC`
  );
  return (result as any)[0] || [];
}

export async function getSocialConnectionById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(
    sql`SELECT * FROM social_connections WHERE id = ${id} AND userId = ${userId}`
  );
  const rows = (result as any)[0];
  return rows?.[0] || null;
}

export async function updateSocialConnection(id: number, userId: number, updates: {
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  isActive?: boolean;
  lastSyncAt?: Date;
  platformUsername?: string;
  profilePictureUrl?: string;
  status?: 'active' | 'expired' | 'revoked';
}) {
  const db = await getDb();
  if (!db) return null;
  
  await db.execute(
    sql`UPDATE social_connections SET 
        accessToken = COALESCE(${updates.accessToken || null}, accessToken),
        refreshToken = COALESCE(${updates.refreshToken || null}, refreshToken),
        isActive = COALESCE(${updates.isActive !== undefined ? updates.isActive : null}, isActive),
        lastSyncAt = ${updates.lastSyncAt ? updates.lastSyncAt : sql`lastSyncAt`},
        platformUsername = COALESCE(${updates.platformUsername || null}, platformUsername),
        profilePictureUrl = COALESCE(${updates.profilePictureUrl || null}, profilePictureUrl)
      WHERE id = ${id} AND userId = ${userId}`
  );
  return { success: true };
}

export async function deleteSocialConnection(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  await db.execute(
    sql`UPDATE social_connections SET isActive = FALSE WHERE id = ${id} AND userId = ${userId}`
  );
  return { success: true };
}

// ============================================
// Phase 6 - Social Posts
// ============================================

export async function createSocialPost(post: {
  scheduledPostId?: number;
  socialConnectionId: number;
  userId: number;
  influencerId?: number;
  platform: 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'linkedin';
  postType?: 'image' | 'video' | 'carousel' | 'story' | 'reel' | 'short';
  caption?: string;
  mediaUrls?: string[];
}) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(
    sql`INSERT INTO social_posts (scheduledPostId, socialConnectionId, userId, influencerId, platform, postType, caption, mediaUrls)
        VALUES (${post.scheduledPostId || null}, ${post.socialConnectionId}, ${post.userId}, ${post.influencerId || null},
                ${post.platform}, ${post.postType || 'image'}, ${post.caption || null}, ${JSON.stringify(post.mediaUrls || [])})`
  );
  const insertResult = result as any;
  return { id: insertResult[0]?.insertId };
}

export async function getSocialPostsByUser(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(
    sql`SELECT sp.*, sc.platformUsername, sc.profilePictureUrl as connectionProfilePic
        FROM social_posts sp
        LEFT JOIN social_connections sc ON sp.socialConnectionId = sc.id
        WHERE sp.userId = ${userId}
        ORDER BY sp.createdAt DESC
        LIMIT ${limit}`
  );
  return (result as any)[0] || [];
}

export async function updateSocialPostStatus(id: number, status: 'pending' | 'publishing' | 'published' | 'failed', platformPostId?: string, errorMessage?: string) {
  const db = await getDb();
  if (!db) return null;
  
  if (status === 'published') {
    await db.execute(
      sql`UPDATE social_posts SET status = ${status}, platformPostId = ${platformPostId || null}, publishedAt = NOW() WHERE id = ${id}`
    );
  } else if (status === 'failed') {
    await db.execute(
      sql`UPDATE social_posts SET status = ${status}, errorMessage = ${errorMessage || null} WHERE id = ${id}`
    );
  } else {
    await db.execute(
      sql`UPDATE social_posts SET status = ${status} WHERE id = ${id}`
    );
  }
  return { success: true };
}

// ============================================
// Phase 6 - A/B Testing
// ============================================

export async function createAbTest(test: {
  userId: number;
  influencerId?: number;
  campaignId?: number;
  name: string;
  description?: string;
  testType: 'caption' | 'image' | 'cta' | 'timing' | 'audience';
  targetMetric?: 'engagement' | 'clicks' | 'conversions' | 'reach' | 'impressions';
  confidenceLevel?: number;
  minSampleSize?: number;
  autoOptimize?: boolean;
}) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(
    sql`INSERT INTO ab_tests (userId, influencerId, campaignId, name, description, testType, targetMetric, confidenceLevel, minSampleSize, autoOptimize)
        VALUES (${test.userId}, ${test.influencerId || null}, ${test.campaignId || null}, ${test.name}, ${test.description || null},
                ${test.testType}, ${test.targetMetric || 'engagement'}, ${test.confidenceLevel || 95}, ${test.minSampleSize || 100}, ${test.autoOptimize || false})`
  );
  
  const insertResult = result as any;
  return { id: insertResult[0]?.insertId };
}

export async function getAbTestsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(
    sql`SELECT * FROM ab_tests WHERE userId = ${userId} ORDER BY createdAt DESC`
  );
  return (result as any)[0] || [];
}

export async function getAbTestById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(
    sql`SELECT * FROM ab_tests WHERE id = ${id} AND userId = ${userId}`
  );
  const rows = (result as any)[0];
  return rows?.[0] || null;
}

export async function updateAbTestStatus(id: number, userId: number, status: 'draft' | 'running' | 'paused' | 'completed' | 'archived') {
  const db = await getDb();
  if (!db) return null;
  
  if (status === 'running') {
    await db.execute(
      sql`UPDATE ab_tests SET status = ${status}, startDate = NOW() WHERE id = ${id} AND userId = ${userId}`
    );
  } else if (status === 'completed') {
    await db.execute(
      sql`UPDATE ab_tests SET status = ${status}, endDate = NOW() WHERE id = ${id} AND userId = ${userId}`
    );
  } else {
    await db.execute(
      sql`UPDATE ab_tests SET status = ${status} WHERE id = ${id} AND userId = ${userId}`
    );
  }
  return { success: true };
}

export async function createAbTestVariant(variant: {
  abTestId: number;
  name: string;
  isControl?: boolean;
  content?: { caption?: string; imageUrl?: string; cta?: string; scheduledTime?: string };
  trafficPercentage?: number;
}) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(
    sql`INSERT INTO ab_test_variants (abTestId, name, isControl, content, trafficPercentage)
        VALUES (${variant.abTestId}, ${variant.name}, ${variant.isControl || false}, ${JSON.stringify(variant.content || {})}, ${variant.trafficPercentage || 50})`
  );
  
  const insertResult = result as any;
  return { id: insertResult[0]?.insertId };
}

export async function getAbTestVariants(abTestId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(
    sql`SELECT * FROM ab_test_variants WHERE abTestId = ${abTestId} ORDER BY isControl DESC, id ASC`
  );
  return (result as any)[0] || [];
}

export async function updateAbTestVariantMetrics(variantId: number, metrics: {
  impressions?: number;
  clicks?: number;
  conversions?: number;
  engagements?: number;
}) {
  const db = await getDb();
  if (!db) return null;
  
  await db.execute(
    sql`UPDATE ab_test_variants SET 
        impressions = impressions + ${metrics.impressions || 0},
        clicks = clicks + ${metrics.clicks || 0},
        conversions = conversions + ${metrics.conversions || 0},
        engagements = engagements + ${metrics.engagements || 0}
      WHERE id = ${variantId}`
  );
  return { success: true };
}

export async function setAbTestWinner(abTestId: number, variantId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  // Reset all variants
  await db.execute(
    sql`UPDATE ab_test_variants SET isWinner = FALSE WHERE abTestId = ${abTestId}`
  );
  
  // Set winner
  await db.execute(
    sql`UPDATE ab_test_variants SET isWinner = TRUE WHERE id = ${variantId} AND abTestId = ${abTestId}`
  );
  
  // Update test
  await db.execute(
    sql`UPDATE ab_tests SET winnerVariantId = ${variantId}, status = 'completed', endDate = NOW() WHERE id = ${abTestId} AND userId = ${userId}`
  );
  
  return { success: true };
}

// ============================================
// Phase 6 - White Label Settings
// ============================================

export async function createWhiteLabelSettings(settings: {
  organizationId: number;
  userId: number;
  brandName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  customDomain?: string;
  hideMatangoBranding?: boolean;
  customFooterText?: string;
  customSupportEmail?: string;
  emailFromName?: string;
  emailReplyTo?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(
    sql`INSERT INTO white_label_settings (organizationId, userId, brandName, logoUrl, faviconUrl, primaryColor, secondaryColor, accentColor, customDomain, hideMatangoBranding, customFooterText, customSupportEmail, emailFromName, emailReplyTo)
        VALUES (${settings.organizationId}, ${settings.userId}, ${settings.brandName || null}, ${settings.logoUrl || null}, ${settings.faviconUrl || null},
                ${settings.primaryColor || null}, ${settings.secondaryColor || null}, ${settings.accentColor || null}, ${settings.customDomain || null},
                ${settings.hideMatangoBranding || false}, ${settings.customFooterText || null}, ${settings.customSupportEmail || null},
                ${settings.emailFromName || null}, ${settings.emailReplyTo || null})`
  );
  
  const insertResult = result as any;
  return { id: insertResult[0]?.insertId };
}

export async function getWhiteLabelSettingsByOrg(organizationId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(
    sql`SELECT * FROM white_label_settings WHERE organizationId = ${organizationId} AND isActive = TRUE`
  );
  const rows = (result as any)[0];
  return rows?.[0] || null;
}

export async function getWhiteLabelSettingsByUser(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(
    sql`SELECT * FROM white_label_settings WHERE userId = ${userId} AND isActive = TRUE`
  );
  const rows = (result as any)[0];
  return rows?.[0] || null;
}

export async function updateWhiteLabelSettings(id: number, userId: number, updates: {
  brandName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  customDomain?: string;
  hideMatangoBranding?: boolean;
  customFooterText?: string;
  customSupportEmail?: string;
  customTermsUrl?: string;
  customPrivacyUrl?: string;
  emailFromName?: string;
  emailReplyTo?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  
  await db.execute(
    sql`UPDATE white_label_settings SET 
        brandName = COALESCE(${updates.brandName || null}, brandName),
        logoUrl = COALESCE(${updates.logoUrl || null}, logoUrl),
        faviconUrl = COALESCE(${updates.faviconUrl || null}, faviconUrl),
        primaryColor = COALESCE(${updates.primaryColor || null}, primaryColor),
        secondaryColor = COALESCE(${updates.secondaryColor || null}, secondaryColor),
        accentColor = COALESCE(${updates.accentColor || null}, accentColor),
        customDomain = COALESCE(${updates.customDomain || null}, customDomain),
        hideMatangoBranding = COALESCE(${updates.hideMatangoBranding !== undefined ? updates.hideMatangoBranding : null}, hideMatangoBranding),
        customFooterText = COALESCE(${updates.customFooterText || null}, customFooterText),
        customSupportEmail = COALESCE(${updates.customSupportEmail || null}, customSupportEmail),
        customTermsUrl = COALESCE(${updates.customTermsUrl || null}, customTermsUrl),
        customPrivacyUrl = COALESCE(${updates.customPrivacyUrl || null}, customPrivacyUrl),
        emailFromName = COALESCE(${updates.emailFromName || null}, emailFromName),
        emailReplyTo = COALESCE(${updates.emailReplyTo || null}, emailReplyTo)
      WHERE id = ${id} AND userId = ${userId}`
  );
  return { success: true };
}

// ============================================
// Phase 6 - Client Workspaces
// ============================================

export async function createClientWorkspace(workspace: {
  whiteLabelId: number;
  organizationId: number;
  clientName: string;
  clientEmail?: string;
  clientLogoUrl?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  
  const accessToken = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  
  const result = await db.execute(
    sql`INSERT INTO client_workspaces (whiteLabelId, organizationId, clientName, clientEmail, clientLogoUrl, accessToken)
        VALUES (${workspace.whiteLabelId}, ${workspace.organizationId}, ${workspace.clientName}, ${workspace.clientEmail || null}, ${workspace.clientLogoUrl || null}, ${accessToken})`
  );
  
  const insertResult = result as any;
  return { id: insertResult[0]?.insertId, accessToken };
}

export async function getClientWorkspacesByWhiteLabel(whiteLabelId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(
    sql`SELECT * FROM client_workspaces WHERE whiteLabelId = ${whiteLabelId} AND isActive = TRUE ORDER BY createdAt DESC`
  );
  return (result as any)[0] || [];
}

export async function updateClientWorkspace(id: number, whiteLabelId: number, updates: {
  clientName?: string;
  clientEmail?: string;
  clientLogoUrl?: string;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) return null;
  
  await db.execute(
    sql`UPDATE client_workspaces SET 
        clientName = COALESCE(${updates.clientName || null}, clientName),
        clientEmail = COALESCE(${updates.clientEmail || null}, clientEmail),
        clientLogoUrl = COALESCE(${updates.clientLogoUrl || null}, clientLogoUrl),
        isActive = COALESCE(${updates.isActive !== undefined ? updates.isActive : null}, isActive)
      WHERE id = ${id} AND whiteLabelId = ${whiteLabelId}`
  );
  return { success: true };
}


// ============================================
// Phase 8 - System Influencers & Video Scripts
// ============================================

export async function getSystemInfluencers() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(
    sql`SELECT * FROM system_influencers WHERE isActive = TRUE ORDER BY createdAt ASC`
  );
  return (result as any)[0] || [];
}

export async function getSystemInfluencerBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(
    sql`SELECT * FROM system_influencers WHERE slug = ${slug} AND isActive = TRUE`
  );
  const rows = (result as any)[0];
  if (!rows || rows.length === 0) return null;
  
  const row = rows[0];
  // Parse JSON fields
  const parseJson = (val: any) => {
    if (!val) return [];
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return []; }
    }
    return val;
  };
  
  return {
    ...row,
    voiceTraits: parseJson(row.voiceTraits),
    behavioralConstraints: parseJson(row.behavioralConstraints),
    cameraRules: typeof row.cameraRules === 'string' ? JSON.parse(row.cameraRules) : row.cameraRules,
  };
}

export async function getVideoScripts(systemInfluencerId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  let result;
  if (systemInfluencerId) {
    result = await db.execute(
      sql`SELECT * FROM video_scripts WHERE systemInfluencerId = ${systemInfluencerId} AND isPublished = TRUE ORDER BY scriptType ASC`
    );
  } else {
    result = await db.execute(
      sql`SELECT * FROM video_scripts WHERE isSystemScript = TRUE AND isPublished = TRUE ORDER BY scriptType ASC`
    );
  }
  
  const rows = (result as any)[0] || [];
  return rows.map((row: any) => {
    const parseJson = (val: any) => {
      if (!val) return null;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return null; }
      }
      return val;
    };
    
    return {
      ...row,
      scenes: parseJson(row.scenes),
      deliveryNotes: parseJson(row.deliveryNotes),
    };
  });
}

export async function getVideoScriptBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(
    sql`SELECT * FROM video_scripts WHERE slug = ${slug}`
  );
  const rows = (result as any)[0];
  if (!rows || rows.length === 0) return null;
  
  const row = rows[0];
  const parseJson = (val: any) => {
    if (!val) return null;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return null; }
    }
    return val;
  };
  
  return {
    ...row,
    scenes: parseJson(row.scenes),
    deliveryNotes: parseJson(row.deliveryNotes),
  };
}

export async function getVideoScriptById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(
    sql`SELECT * FROM video_scripts WHERE id = ${id}`
  );
  const rows = (result as any)[0];
  if (!rows || rows.length === 0) return null;
  
  const row = rows[0];
  const parseJson = (val: any) => {
    if (!val) return null;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return null; }
    }
    return val;
  };
  
  return {
    ...row,
    scenes: parseJson(row.scenes),
    deliveryNotes: parseJson(row.deliveryNotes),
  };
}

export async function createVideoScript(script: {
  systemInfluencerId?: number;
  userId?: number;
  name: string;
  slug?: string;
  scriptType: 'master' | 'tiktok' | 'youtube_shorts' | 'instagram_reels' | 'agency' | 'custom';
  durationSeconds?: number;
  scenes?: Array<{
    sceneNumber: number;
    title: string;
    dialogue: string;
    visualNotes?: string;
    onScreenText?: string;
    durationHint?: string;
  }>;
  fullScript?: string;
  deliveryNotes?: {
    pacing?: string;
    emphasis?: string[];
    pauses?: string[];
    tone?: string;
  };
  isPublished?: boolean;
  isSystemScript?: boolean;
}) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(
    sql`INSERT INTO video_scripts (systemInfluencerId, userId, name, slug, scriptType, durationSeconds, scenes, fullScript, deliveryNotes, isPublished, isSystemScript)
        VALUES (${script.systemInfluencerId || null}, ${script.userId || null}, ${script.name}, ${script.slug || null}, ${script.scriptType},
                ${script.durationSeconds || null}, ${JSON.stringify(script.scenes || [])}, ${script.fullScript || null},
                ${JSON.stringify(script.deliveryNotes || {})}, ${script.isPublished || false}, ${script.isSystemScript || false})`
  );
  
  const insertResult = result as any;
  return { id: insertResult[0]?.insertId };
}

export async function updateVideoScript(id: number, userId: number, updates: {
  name?: string;
  durationSeconds?: number;
  scenes?: Array<{
    sceneNumber: number;
    title: string;
    dialogue: string;
    visualNotes?: string;
    onScreenText?: string;
    durationHint?: string;
  }>;
  fullScript?: string;
  deliveryNotes?: {
    pacing?: string;
    emphasis?: string[];
    pauses?: string[];
    tone?: string;
  };
  isPublished?: boolean;
}) {
  const db = await getDb();
  if (!db) return null;
  
  await db.execute(
    sql`UPDATE video_scripts SET 
        name = COALESCE(${updates.name || null}, name),
        durationSeconds = COALESCE(${updates.durationSeconds || null}, durationSeconds),
        scenes = COALESCE(${updates.scenes ? JSON.stringify(updates.scenes) : null}, scenes),
        fullScript = COALESCE(${updates.fullScript || null}, fullScript),
        deliveryNotes = COALESCE(${updates.deliveryNotes ? JSON.stringify(updates.deliveryNotes) : null}, deliveryNotes),
        isPublished = COALESCE(${updates.isPublished !== undefined ? updates.isPublished : null}, isPublished)
      WHERE id = ${id} AND (userId = ${userId} OR isSystemScript = FALSE)`
  );
  return { success: true };
}

export async function getUserVideoScripts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(
    sql`SELECT * FROM video_scripts WHERE userId = ${userId} ORDER BY createdAt DESC`
  );
  
  const rows = (result as any)[0] || [];
  return rows.map((row: any) => {
    const parseJson = (val: any) => {
      if (!val) return null;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return null; }
      }
      return val;
    };
    
    return {
      ...row,
      scenes: parseJson(row.scenes),
      deliveryNotes: parseJson(row.deliveryNotes),
    };
  });
}


// ============================================
// Phase 11 - Multi-Brand Brand Brain
// ============================================

export async function listBrandsByOrg(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const parseJson = (val: any) => {
    if (!val) return [];
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return []; }
    }
    return val;
  };
  
  const result = await db.execute(
    sql`SELECT * FROM business_dna WHERE organizationId = ${organizationId} AND brandStatus != 'archived' ORDER BY createdAt DESC`
  );
  const rows = (result as any)[0] || [];
  return rows.map((row: any) => ({
    id: row.id,
    organizationId: row.organizationId,
    userId: row.userId,
    productName: row.productName,
    brandName: row.brandName || row.productName,
    websiteUrl: row.websiteUrl,
    category: row.category,
    brandStatus: row.brandStatus,
    tags: parseJson(row.tags),
    isComplete: row.isComplete,
    completionScore: row.completionScore,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function createBrand(data: {
  organizationId: number;
  userId: number;
  productName: string;
  brandName?: string;
  websiteUrl?: string;
  category?: string;
  tagline?: string;
  brandTone?: string;
  tags?: string[];
}): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.execute(
    sql`INSERT INTO business_dna (
      organizationId, userId, createdByUserId, productName, brandName, websiteUrl, category, tagline, brandTone, tags, brandStatus
    ) VALUES (
      ${data.organizationId}, ${data.userId}, ${data.userId}, ${data.productName}, 
      ${data.brandName || data.productName}, ${data.websiteUrl || null}, ${data.category || null},
      ${data.tagline || null}, ${data.brandTone || 'professional'}, ${JSON.stringify(data.tags || [])}, 'active'
    )`
  );
  
  const insertResult = result as any;
  return { id: insertResult[0]?.insertId };
}

export async function getBrandById(brandId: number, organizationId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const parseJson = (val: any) => {
    if (!val) return [];
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return []; }
    }
    return val;
  };
  
  const result = await db.execute(
    sql`SELECT * FROM business_dna WHERE id = ${brandId} AND organizationId = ${organizationId}`
  );
  const rows = (result as any)[0];
  const row = rows?.[0];
  if (!row) return null;
  
  return {
    id: row.id,
    organizationId: row.organizationId,
    userId: row.userId,
    productName: row.productName,
    brandName: row.brandName || row.productName,
    websiteUrl: row.websiteUrl,
    category: row.category,
    tagline: row.tagline,
    icpPersonas: parseJson(row.icpPersonas),
    keyOutcomes: parseJson(row.keyOutcomes),
    differentiators: parseJson(row.differentiators),
    claimsProofMapping: parseJson(row.claimsProofMapping),
    objectionHandling: parseJson(row.objectionHandling),
    brandTone: row.brandTone,
    voiceRules: parseJson(row.voiceRules),
    forbiddenPhrases: parseJson(row.forbiddenPhrases),
    brandStatus: row.brandStatus,
    tags: parseJson(row.tags),
    isComplete: row.isComplete,
    completionScore: row.completionScore,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function setActiveBrand(organizationId: number, brandId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.execute(
    sql`UPDATE organizations SET activeBrandId = ${brandId} WHERE id = ${organizationId}`
  );
}

export async function getActiveBrand(organizationId: number) {
  const db = await getDb();
  if (!db) return null;
  
  // Get active brand ID from organization
  const orgResult = await db.execute(
    sql`SELECT activeBrandId FROM organizations WHERE id = ${organizationId}`
  );
  const orgRows = (orgResult as any)[0];
  const activeBrandId = orgRows?.[0]?.activeBrandId;
  
  if (!activeBrandId) {
    // Return first brand if no active brand set
    const firstBrand = await db.execute(
      sql`SELECT * FROM business_dna WHERE organizationId = ${organizationId} AND brandStatus = 'active' ORDER BY createdAt ASC LIMIT 1`
    );
    const rows = (firstBrand as any)[0];
    if (rows?.[0]) {
      // Set this as active brand
      await setActiveBrand(organizationId, rows[0].id);
      return getBrandById(rows[0].id, organizationId);
    }
    return null;
  }
  
  return getBrandById(activeBrandId, organizationId);
}

export async function archiveBrand(brandId: number, organizationId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.execute(
    sql`UPDATE business_dna SET brandStatus = 'archived' WHERE id = ${brandId} AND organizationId = ${organizationId}`
  );
  
  // If this was the active brand, clear it
  await db.execute(
    sql`UPDATE organizations SET activeBrandId = NULL WHERE id = ${organizationId} AND activeBrandId = ${brandId}`
  );
}

export async function duplicateBrand(brandId: number, organizationId: number, userId: number, newBrandName: string): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get original brand
  const original = await getBrandById(brandId, organizationId);
  if (!original) throw new Error("Brand not found");
  
  // Create copy
  const result = await db.execute(
    sql`INSERT INTO business_dna (
      organizationId, userId, createdByUserId, productName, brandName, websiteUrl, category, tagline,
      icpPersonas, keyOutcomes, differentiators, claimsProofMapping, objectionHandling,
      brandTone, voiceRules, forbiddenPhrases, tags, brandStatus, isComplete, completionScore
    ) SELECT 
      organizationId, ${userId}, ${userId}, productName, ${newBrandName}, websiteUrl, category, tagline,
      icpPersonas, keyOutcomes, differentiators, claimsProofMapping, objectionHandling,
      brandTone, voiceRules, forbiddenPhrases, tags, 'draft', isComplete, completionScore
    FROM business_dna WHERE id = ${brandId} AND organizationId = ${organizationId}`
  );
  
  const insertResult = result as any;
  return { id: insertResult[0]?.insertId };
}

export async function getBrandCount(organizationId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.execute(
    sql`SELECT COUNT(*) as count FROM business_dna WHERE organizationId = ${organizationId} AND brandStatus != 'archived'`
  );
  const rows = (result as any)[0];
  return rows?.[0]?.count || 0;
}

export async function getOrganizationById(organizationId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(
    sql`SELECT * FROM organizations WHERE id = ${organizationId}`
  );
  const rows = (result as any)[0];
  return rows?.[0] || null;
}

export async function getOrganizationByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  // First check memberships
  const memberResult = await db.execute(
    sql`SELECT o.* FROM organizations o 
        JOIN memberships m ON o.id = m.organizationId 
        WHERE m.userId = ${userId} LIMIT 1`
  );
  const memberRows = (memberResult as any)[0];
  if (memberRows?.[0]) return memberRows[0];
  
  // Check if user owns an org
  const ownerResult = await db.execute(
    sql`SELECT * FROM organizations WHERE ownerId = ${userId} LIMIT 1`
  );
  const ownerRows = (ownerResult as any)[0];
  return ownerRows?.[0] || null;
}

export async function createOrganizationForUser(userId: number, name: string): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  
  const result = await db.execute(
    sql`INSERT INTO organizations (ownerId, name, slug, plan, maxBrands) VALUES (${userId}, ${name}, ${slug}, 'free', 1)`
  );
  
  const insertResult = result as any;
  const orgId = insertResult[0]?.insertId;
  
  // Add user as owner member
  await db.execute(
    sql`INSERT INTO memberships (organizationId, userId, role) VALUES (${orgId}, ${userId}, 'owner')`
  );
  
  return { id: orgId };
}


// ============================================================================
// Admin Tenant Control Functions
// ============================================================================

export type TenantStatus = "active" | "suspended" | "read_only";

export interface TenantControlResult {
  success: boolean;
  previousStatus: TenantStatus;
  newStatus: TenantStatus;
}

/**
 * Suspend a tenant - blocks all access except viewing
 */
export async function suspendTenant(
  userId: number,
  adminId: number,
  reason: string
): Promise<TenantControlResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current status
  const userResult = await db.execute(
    sql`SELECT tenantStatus FROM users WHERE id = ${userId}`
  );
  const rows = (userResult as any)[0];
  const previousStatus = rows?.[0]?.tenantStatus || "active";

  // Update user status
  await db.execute(
    sql`UPDATE users SET 
        tenantStatus = 'suspended',
        suspensionReason = ${reason},
        suspendedBy = ${adminId},
        suspendedAt = NOW(),
        updatedAt = NOW()
        WHERE id = ${userId}`
  );

  return {
    success: true,
    previousStatus,
    newStatus: "suspended",
  };
}

/**
 * Unsuspend a tenant - restores full access
 */
export async function unsuspendTenant(
  userId: number,
  adminId: number
): Promise<TenantControlResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current status
  const userResult = await db.execute(
    sql`SELECT tenantStatus FROM users WHERE id = ${userId}`
  );
  const rows = (userResult as any)[0];
  const previousStatus = rows?.[0]?.tenantStatus || "suspended";

  // Update user status
  await db.execute(
    sql`UPDATE users SET 
        tenantStatus = 'active',
        suspensionReason = NULL,
        suspendedBy = NULL,
        suspendedAt = NULL,
        updatedAt = NOW()
        WHERE id = ${userId}`
  );

  return {
    success: true,
    previousStatus,
    newStatus: "active",
  };
}

/**
 * Set tenant to read-only mode - can view but not create/edit
 */
export async function setTenantReadOnly(
  userId: number,
  adminId: number,
  reason: string
): Promise<TenantControlResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current status
  const userResult = await db.execute(
    sql`SELECT tenantStatus FROM users WHERE id = ${userId}`
  );
  const rows = (userResult as any)[0];
  const previousStatus = rows?.[0]?.tenantStatus || "active";

  // Update user status
  await db.execute(
    sql`UPDATE users SET 
        tenantStatus = 'read_only',
        suspensionReason = ${reason},
        suspendedBy = ${adminId},
        suspendedAt = NOW(),
        updatedAt = NOW()
        WHERE id = ${userId}`
  );

  return {
    success: true,
    previousStatus,
    newStatus: "read_only",
  };
}

/**
 * Reset tenant limits to plan defaults
 */
export async function resetTenantLimits(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get user's plan
  const userResult = await db.execute(
    sql`SELECT plan FROM users WHERE id = ${userId}`
  );
  const rows = (userResult as any)[0];
  const plan = rows?.[0]?.plan || "free";

  // Define plan defaults
  const planDefaults: Record<string, {
    influencersLimit: number;
    imagesPerMonth: number;
    videosPerMonth: number;
    brandsLimit: number;
    customDomainsLimit: number;
    teamMembersLimit: number;
    storageGb: number;
  }> = {
    free: {
      influencersLimit: 1,
      imagesPerMonth: 3,
      videosPerMonth: 0,
      brandsLimit: 1,
      customDomainsLimit: 0,
      teamMembersLimit: 1,
      storageGb: 1,
    },
    basic: {
      influencersLimit: 5,
      imagesPerMonth: 100,
      videosPerMonth: 10,
      brandsLimit: 3,
      customDomainsLimit: 3,
      teamMembersLimit: 1,
      storageGb: 10,
    },
    agency: {
      influencersLimit: -1, // unlimited
      imagesPerMonth: 500,
      videosPerMonth: 50,
      brandsLimit: 20,
      customDomainsLimit: 20,
      teamMembersLimit: 5,
      storageGb: 100,
    },
    agency_plus: {
      influencersLimit: -1, // unlimited
      imagesPerMonth: -1, // unlimited
      videosPerMonth: 200,
      brandsLimit: -1, // unlimited
      customDomainsLimit: -1, // unlimited
      teamMembersLimit: -1, // unlimited
      storageGb: -1, // unlimited
    },
  };

  const defaults = planDefaults[plan] || planDefaults.free;

  // Upsert tenant limits
  await db.execute(
    sql`INSERT INTO tenant_limits (userId, influencersLimit, imagesPerMonth, videosPerMonth, brandsLimit, customDomainsLimit, teamMembersLimit, storageGb)
        VALUES (${userId}, ${defaults.influencersLimit}, ${defaults.imagesPerMonth}, ${defaults.videosPerMonth}, ${defaults.brandsLimit}, ${defaults.customDomainsLimit}, ${defaults.teamMembersLimit}, ${defaults.storageGb})
        ON DUPLICATE KEY UPDATE
        influencersLimit = ${defaults.influencersLimit},
        imagesPerMonth = ${defaults.imagesPerMonth},
        videosPerMonth = ${defaults.videosPerMonth},
        brandsLimit = ${defaults.brandsLimit},
        customDomainsLimit = ${defaults.customDomainsLimit},
        teamMembersLimit = ${defaults.teamMembersLimit},
        storageGb = ${defaults.storageGb},
        updatedAt = NOW()`
  );

  return true;
}

/**
 * Get tenant limits for a user
 */
export async function getTenantLimits(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.execute(
    sql`SELECT * FROM tenant_limits WHERE userId = ${userId}`
  );
  const rows = (result as any)[0];
  return rows?.[0] || null;
}

/**
 * Update specific tenant limits
 */
export async function updateTenantLimits(
  userId: number,
  limits: Partial<{
    influencersLimit: number;
    imagesPerMonth: number;
    videosPerMonth: number;
    brandsLimit: number;
    customDomainsLimit: number;
    teamMembersLimit: number;
    storageGb: number;
  }>
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Build dynamic update
  const updates: string[] = [];
  const values: any[] = [];

  if (limits.influencersLimit !== undefined) {
    updates.push("influencersLimit = ?");
    values.push(limits.influencersLimit);
  }
  if (limits.imagesPerMonth !== undefined) {
    updates.push("imagesPerMonth = ?");
    values.push(limits.imagesPerMonth);
  }
  if (limits.videosPerMonth !== undefined) {
    updates.push("videosPerMonth = ?");
    values.push(limits.videosPerMonth);
  }
  if (limits.brandsLimit !== undefined) {
    updates.push("brandsLimit = ?");
    values.push(limits.brandsLimit);
  }
  if (limits.customDomainsLimit !== undefined) {
    updates.push("customDomainsLimit = ?");
    values.push(limits.customDomainsLimit);
  }
  if (limits.teamMembersLimit !== undefined) {
    updates.push("teamMembersLimit = ?");
    values.push(limits.teamMembersLimit);
  }
  if (limits.storageGb !== undefined) {
    updates.push("storageGb = ?");
    values.push(limits.storageGb);
  }

  if (updates.length === 0) return false;

  updates.push("updatedAt = NOW()");

  // Check if limits exist
  const existing = await getTenantLimits(userId);
  if (!existing) {
    // Create with defaults first
    await resetTenantLimits(userId);
  }

  // Now update
  await db.execute(
    sql.raw(`UPDATE tenant_limits SET ${updates.join(", ")} WHERE userId = ${userId}`)
  );

  return true;
}

/**
 * Get usage counters for a user for current month
 */
export async function getCurrentUsageCounters(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const result = await db.execute(
    sql`SELECT * FROM usage_counters WHERE userId = ${userId} AND periodMonth = ${currentMonth}`
  );
  const rows = (result as any)[0];
  return rows?.[0] || null;
}

/**
 * Reset usage counters for a user (for current month)
 */
export async function resetUsageCounters(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const currentMonth = new Date().toISOString().slice(0, 7);

  await db.execute(
    sql`DELETE FROM usage_counters WHERE userId = ${userId} AND periodMonth = ${currentMonth}`
  );

  return true;
}

/**
 * List all tenants with pagination and filters
 */
export async function listTenants(options: {
  page?: number;
  limit?: number;
  status?: TenantStatus;
  plan?: string;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return { tenants: [], total: 0 };

  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;

  let whereClause = "1=1";
  if (options.status) {
    whereClause += ` AND tenantStatus = '${options.status}'`;
  }
  if (options.plan) {
    whereClause += ` AND plan = '${options.plan}'`;
  }
  if (options.search) {
    whereClause += ` AND (name LIKE '%${options.search}%' OR email LIKE '%${options.search}%')`;
  }

  const countResult = await db.execute(
    sql.raw(`SELECT COUNT(*) as total FROM users WHERE ${whereClause}`)
  );
  const countRows = (countResult as any)[0];
  const total = countRows?.[0]?.total || 0;

  const result = await db.execute(
    sql.raw(`SELECT id, openId, name, email, role, plan, tenantStatus, suspensionReason, suspendedAt, createdAt, lastSignedIn 
             FROM users WHERE ${whereClause} ORDER BY createdAt DESC LIMIT ${limit} OFFSET ${offset}`)
  );
  const rows = (result as any)[0];

  return {
    tenants: rows || [],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get full tenant details including limits and usage
 */
export async function getTenantDetails(userId: number) {
  const db = await getDb();
  if (!db) return null;

  // Get user
  const userResult = await db.execute(
    sql`SELECT * FROM users WHERE id = ${userId}`
  );
  const userRows = (userResult as any)[0];
  const user = userRows?.[0];
  if (!user) return null;

  // Get limits
  const limits = await getTenantLimits(userId);

  // Get current usage
  const usage = await getCurrentUsageCounters(userId);

  // Get influencer count
  const influencerResult = await db.execute(
    sql`SELECT COUNT(*) as count FROM influencers WHERE userId = ${userId}`
  );
  const influencerRows = (influencerResult as any)[0];
  const influencerCount = influencerRows?.[0]?.count || 0;

  // Get campaign count
  const campaignResult = await db.execute(
    sql`SELECT COUNT(*) as count FROM unified_campaigns WHERE userId = ${userId}`
  );
  const campaignRows = (campaignResult as any)[0];
  const campaignCount = campaignRows?.[0]?.count || 0;

  return {
    user,
    limits,
    usage,
    stats: {
      influencerCount,
      campaignCount,
    },
  };
}


// Complete user onboarding wizard
export async function completeUserOnboarding(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot complete onboarding: database not available");
    return;
  }
  
  await db.update(users)
    .set({ onboardingCompleted: true })
    .where(eq(users.id, userId));
}
