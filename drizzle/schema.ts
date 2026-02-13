import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, decimal, bigint } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "super_admin"]).default("user").notNull(),
  credits: int("credits").default(0).notNull(),
  plan: mysqlEnum("plan", ["free", "starter", "pro", "lifetime", "basic", "agency", "agency_plus"]).default("free").notNull(),
  /** Tenant status for admin controls: active, suspended, read_only */
  tenantStatus: mysqlEnum("tenantStatus", ["active", "suspended", "read_only"]).default("active").notNull(),
  /** Reason for suspension if applicable */
  suspensionReason: text("suspensionReason"),
  /** Admin who suspended/modified the tenant */
  suspendedBy: int("suspendedBy"),
  /** When the tenant was suspended */
  suspendedAt: timestamp("suspendedAt"),
  
  // Account Lifecycle Status (for deletion guardrails)
  /** Account status for deletion lifecycle: ACTIVE, DEACTIVATED, SUSPENDED, SOFT_DELETED_90D, RETENTION_12M, HARD_DELETED */
  accountStatus: mysqlEnum("accountStatus", [
    "ACTIVE",
    "DEACTIVATED",
    "SUSPENDED",
    "SOFT_DELETED_90D",
    "RETENTION_12M",
    "HARD_DELETED"
  ]).default("ACTIVE").notNull(),
  /** When the account was soft deleted */
  deletedAt: timestamp("deletedAt"),
  /** User ID who initiated the deletion */
  deletedBy: int("deletedBy"),
  /** Reason for deletion (optional) */
  deletionReason: text("deletionReason"),
  /** Deadline for self-restore (deleted_at + 90 days) */
  recoveryDeadline: timestamp("recoveryDeadline"),
  /** Deadline for support restore (deleted_at + 12 months) */
  retentionUntil: timestamp("retentionUntil"),
  /** When the account was hard deleted (irreversible) */
  hardDeletedAt: timestamp("hardDeletedAt"),
  
  /** Whether user has completed the AAO onboarding wizard */
  onboardingCompleted: boolean("onboardingCompleted").default(false).notNull(),
  
  // 5-Step Growth Loop Onboarding State Machine
  /** Current onboarding step: 1=PLAN, 2=BRAND, 3=CAMPAIGN, 4=PUBLISH, 5=OPTIMIZE, 6=COMPLETE */
  onboardingStep: int("onboardingStep").default(1).notNull(),
  /** Plan status: active, trial, past_due, cancelled */
  planStatus: mysqlEnum("planStatus", ["active", "trial", "past_due", "cancelled", "none"]).default("none").notNull(),
  /** Billing cycle: monthly or yearly */
  billingCycle: mysqlEnum("billingCycle", ["monthly", "yearly"]).default("monthly").notNull(),
  /** Stripe customer ID for reuse across sessions */
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  /** Stripe subscription ID for active subscription */
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  /** Plan intent - tier selected but not yet paid */
  planIntentTier: varchar("planIntentTier", { length: 64 }),
  /** Plan intent - billing cycle selected */
  planIntentCycle: varchar("planIntentCycle", { length: 16 }),
  /** Plan intent - Stripe price ID selected */
  planIntentPriceId: varchar("planIntentPriceId", { length: 255 }),
  /** Origin of plan selection (onboarding, upgrade, etc.) */
  planIntentOrigin: varchar("planIntentOrigin", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * AI Influencers created by users
 */
export const influencers = mysqlTable("influencers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  age: int("age"),
  bio: text("bio"),
  personality: text("personality"),
  avatarUrl: text("avatarUrl"),
  tags: json("tags").$type<string[]>(),
  stats: json("stats").$type<{ followers: number; likes: number; posts: number }>(),
  isPublic: boolean("isPublic").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Influencer = typeof influencers.$inferSelect;
export type InsertInfluencer = typeof influencers.$inferInsert;

/**
 * Generated content/images for influencers
 */
export const influencerContent = mysqlTable("influencer_content", {
  id: int("id").autoincrement().primaryKey(),
  influencerId: int("influencerId").notNull(),
  imageUrl: text("imageUrl").notNull(),
  prompt: text("prompt"),
  contentType: mysqlEnum("contentType", ["avatar", "post", "story"]).default("post").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InfluencerContent = typeof influencerContent.$inferSelect;
export type InsertInfluencerContent = typeof influencerContent.$inferInsert;

/**
 * Payment/purchase records
 */
export const purchases = mysqlTable("purchases", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stripeSessionId: varchar("stripeSessionId", { length: 255 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  plan: mysqlEnum("plan", ["starter", "pro", "lifetime"]).notNull(),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 3 }).default("usd").notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed", "refunded"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = typeof purchases.$inferInsert;

/**
 * Chat messages with AI influencers
 */
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  influencerId: int("influencerId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * Scheduled social media posts
 */
export const scheduledPosts = mysqlTable("scheduled_posts", {
  id: int("id").autoincrement().primaryKey(),
  influencerId: int("influencerId").notNull(),
  userId: int("userId").notNull(),
  platform: mysqlEnum("platform", ["instagram", "tiktok", "twitter", "youtube"]).notNull(),
  contentUrl: text("contentUrl"),
  caption: text("caption"),
  scheduledFor: timestamp("scheduledFor").notNull(),
  status: mysqlEnum("status", ["scheduled", "published", "failed", "cancelled"]).default("scheduled").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  publishedAt: timestamp("publishedAt"),
});

export type ScheduledPost = typeof scheduledPosts.$inferSelect;
export type InsertScheduledPost = typeof scheduledPosts.$inferInsert;

/**
 * Analytics data for influencers
 */
export const analyticsData = mysqlTable("analytics_data", {
  id: int("id").autoincrement().primaryKey(),
  influencerId: int("influencerId").notNull(),
  date: timestamp("date").notNull(),
  followers: int("followers").default(0).notNull(),
  followersGain: int("followersGain").default(0).notNull(),
  likes: int("likes").default(0).notNull(),
  views: int("views").default(0).notNull(),
  engagementRate: int("engagementRate").default(0).notNull(), // stored as percentage * 100
  postsCount: int("postsCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnalyticsData = typeof analyticsData.$inferSelect;
export type InsertAnalyticsData = typeof analyticsData.$inferInsert;

/**
 * Email notification preferences
 */
export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  emailEnabled: boolean("emailEnabled").default(true).notNull(),
  scheduledPostPublished: boolean("scheduledPostPublished").default(true).notNull(),
  followerMilestones: boolean("followerMilestones").default(true).notNull(),
  weeklyReport: boolean("weeklyReport").default(true).notNull(),
  teamInvitations: boolean("teamInvitations").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

/**
 * Notification log for sent notifications
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["post_published", "milestone", "team_invite", "weekly_report"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  emailSent: boolean("emailSent").default(false).notNull(),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Content templates for quick generation
 */
export const contentTemplates = mysqlTable("content_templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // null for system templates
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["product", "lifestyle", "fashion", "fitness", "travel", "food", "beauty", "tech", "custom"]).notNull(),
  promptTemplate: text("promptTemplate").notNull(),
  stylePreset: mysqlEnum("stylePreset", ["realistic", "anime", "artistic", "3d"]).default("realistic").notNull(),
  characterWeight: int("characterWeight").default(80).notNull(), // 0-100
  keepOutfit: boolean("keepOutfit").default(false).notNull(),
  isPublic: boolean("isPublic").default(false).notNull(),
  usageCount: int("usageCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentTemplate = typeof contentTemplates.$inferSelect;
export type InsertContentTemplate = typeof contentTemplates.$inferInsert;

/**
 * Team collaborators for influencer management
 */
export const collaborators = mysqlTable("collaborators", {
  id: int("id").autoincrement().primaryKey(),
  influencerId: int("influencerId").notNull(),
  userId: int("userId").notNull(),
  invitedByUserId: int("invitedByUserId").notNull(),
  role: mysqlEnum("role", ["owner", "editor", "viewer"]).default("viewer").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "rejected"]).default("pending").notNull(),
  inviteEmail: varchar("inviteEmail", { length: 320 }),
  inviteToken: varchar("inviteToken", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
});

export type Collaborator = typeof collaborators.$inferSelect;
export type InsertCollaborator = typeof collaborators.$inferInsert;

/**
 * Content campaigns (Story Mode)
 */
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  influencerId: int("influencerId").notNull(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["draft", "preview", "generating", "completed", "scheduled"]).default("draft").notNull(),
  totalScenes: int("totalScenes").default(0).notNull(),
  completedScenes: int("completedScenes").default(0).notNull(),
  scheduledStartDate: timestamp("scheduledStartDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

/**
 * Campaign scenes (individual posts in a campaign)
 */
export const campaignScenes = mysqlTable("campaign_scenes", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  sceneOrder: int("sceneOrder").notNull(),
  prompt: text("prompt").notNull(),
  caption: text("caption"),
  imageUrl: text("imageUrl"),
  platform: mysqlEnum("platform", ["instagram", "tiktok", "twitter", "youtube"]),
  scheduledFor: timestamp("scheduledFor"),
  status: mysqlEnum("status", ["pending", "generating", "completed", "published"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CampaignScene = typeof campaignScenes.$inferSelect;
export type InsertCampaignScene = typeof campaignScenes.$inferInsert;

/**
 * Influencer generation settings (Character Consistency)
 */
export const influencerSettings = mysqlTable("influencer_settings", {
  id: int("id").autoincrement().primaryKey(),
  influencerId: int("influencerId").notNull().unique(),
  characterWeight: int("characterWeight").default(80).notNull(), // 0-100 slider
  keepOutfit: boolean("keepOutfit").default(false).notNull(),
  defaultStyle: mysqlEnum("defaultStyle", ["realistic", "anime", "artistic", "3d"]).default("realistic").notNull(),
  referenceImages: json("referenceImages").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InfluencerSetting = typeof influencerSettings.$inferSelect;
export type InsertInfluencerSetting = typeof influencerSettings.$inferInsert;


/**
 * Organizations/Workspaces for multi-tenant support
 */
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  logoUrl: text("logoUrl"),
  plan: mysqlEnum("plan", ["free", "basic", "agency", "agency_plus"]).default("free").notNull(),
  assetsUsedThisMonth: int("assetsUsedThisMonth").default(0).notNull(),
  assetsLimit: int("assetsLimit").default(20).notNull(), // Free: 20, Basic: 300, Agency: unlimited (-1)
  activeBrandId: int("activeBrandId"), // FK to business_dna.id - the currently active brand
  maxBrands: int("maxBrands").default(1).notNull(), // Free: 1, Basic: 3, Agency: -1 (unlimited)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

/**
 * Organization memberships (RBAC)
 */
export const memberships = mysqlTable("memberships", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "admin", "marketer", "viewer"]).default("viewer").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Membership = typeof memberships.$inferSelect;
export type InsertMembership = typeof memberships.$inferInsert;

/**
 * Business DNA (Brand Brain) - Core of Matango.ai
 */
export const businessDna = mysqlTable("business_dna", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(),
  createdByUserId: int("createdByUserId"),
  
  // Basic Info
  productName: varchar("productName", { length: 200 }).notNull(),
  brandName: varchar("brandName", { length: 200 }), // Human-friendly name, may differ from productName
  websiteUrl: text("websiteUrl"),
  category: varchar("category", { length: 100 }),
  tagline: text("tagline"),
  
  // ICP (Ideal Customer Profile)
  icpPersonas: json("icpPersonas").$type<Array<{
    name: string;
    role: string;
    pains: string[];
    goals: string[];
    objections: string[];
  }>>(),
  
  // Value Proposition
  keyOutcomes: json("keyOutcomes").$type<string[]>(),
  differentiators: json("differentiators").$type<string[]>(),
  
  // Claims & Proof
  claimsProofMapping: json("claimsProofMapping").$type<Array<{
    claim: string;
    proof: string;
    proofType: "testimonial" | "metric" | "case_study" | "demo";
  }>>(),
  
  // Objection Handling
  objectionHandling: json("objectionHandling").$type<Array<{
    objection: string;
    response: string;
  }>>(),
  
  // Brand Voice
  brandTone: mysqlEnum("brandTone", ["authoritative", "playful", "contrarian", "friendly", "professional", "casual"]).default("professional").notNull(),
  voiceRules: json("voiceRules").$type<string[]>(),
  forbiddenPhrases: json("forbiddenPhrases").$type<string[]>(),
  
  // Channel Priorities
  channelPriorities: json("channelPriorities").$type<Array<{
    channel: string;
    priority: number;
    notes: string;
  }>>(),
  
  // Auto-enriched data
  autoEnrichedData: json("autoEnrichedData").$type<{
    features: string[];
    pricing: string;
    faqs: Array<{ question: string; answer: string }>;
    caseStudies: string[];
  }>(),
  
  isComplete: boolean("isComplete").default(false).notNull(),
  completionScore: int("completionScore").default(0).notNull(), // 0-100
  
  // Multi-brand support
  brandStatus: mysqlEnum("brandStatus", ["draft", "active", "archived"]).default("active").notNull(),
  tags: json("tags").$type<string[]>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BusinessDna = typeof businessDna.$inferSelect;
export type InsertBusinessDna = typeof businessDna.$inferInsert;

/**
 * Unified Campaign Object - First-class campaign entity
 */
export const unifiedCampaigns = mysqlTable("unified_campaigns", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  businessDnaId: int("businessDnaId").notNull(),
  userId: int("userId").notNull(),
  
  // Campaign Identity
  name: varchar("name", { length: 200 }).notNull(),
  angle: text("angle").notNull(), // The campaign angle/hook
  angleRationale: text("angleRationale"), // Why this angle was chosen
  targetIcp: varchar("targetIcp", { length: 100 }), // Which ICP persona this targets
  
  // Status
  status: mysqlEnum("status", ["draft", "generating", "review", "approved", "scheduled", "live", "completed", "paused"]).default("draft").notNull(),
  
  // Schedule
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  
  // Performance (updated from analytics)
  impressions: int("impressions").default(0).notNull(),
  clicks: int("clicks").default(0).notNull(),
  conversions: int("conversions").default(0).notNull(),
  leadsGenerated: int("leadsGenerated").default(0).notNull(),
  
  // Learnings (auto-generated insights)
  learnings: json("learnings").$type<string[]>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UnifiedCampaign = typeof unifiedCampaigns.$inferSelect;
export type InsertUnifiedCampaign = typeof unifiedCampaigns.$inferInsert;

/**
 * Campaign Assets - All content pieces linked to a campaign
 */
export const campaignAssets = mysqlTable("campaign_assets", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  
  // Asset Type
  assetType: mysqlEnum("assetType", [
    "linkedin_post", "linkedin_carousel", 
    "x_thread", "x_post",
    "tiktok_script", "ig_reel_script",
    "landing_page", 
    "email_welcome", "email_nurture",
    "ad_meta", "ad_linkedin", "ad_google"
  ]).notNull(),
  
  // Content
  content: text("content").notNull(),
  headline: text("headline"),
  cta: text("cta"),
  imageUrl: text("imageUrl"),
  videoUrl: text("videoUrl"),
  
  // Platform-specific metadata
  metadata: json("metadata").$type<Record<string, any>>(),
  
  // Status
  status: mysqlEnum("status", ["draft", "approved", "scheduled", "published", "paused"]).default("draft").notNull(),
  scheduledFor: timestamp("scheduledFor"),
  publishedAt: timestamp("publishedAt"),
  
  // UTM Tracking
  utmSource: varchar("utmSource", { length: 100 }),
  utmMedium: varchar("utmMedium", { length: 100 }),
  utmCampaign: varchar("utmCampaign", { length: 100 }),
  utmContent: varchar("utmContent", { length: 100 }),
  
  // Performance
  impressions: int("impressions").default(0).notNull(),
  clicks: int("clicks").default(0).notNull(),
  engagements: int("engagements").default(0).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CampaignAsset = typeof campaignAssets.$inferSelect;
export type InsertCampaignAsset = typeof campaignAssets.$inferInsert;

/**
 * Influencer Personas (for content voice)
 */
export const influencerPersonas = mysqlTable("influencer_personas", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(),
  
  name: varchar("name", { length: 100 }).notNull(),
  personaType: mysqlEnum("personaType", ["founder", "practitioner", "analyst", "custom"]).default("custom").notNull(),
  
  // Style Guide
  styleGuide: text("styleGuide"),
  vocabulary: json("vocabulary").$type<string[]>(), // Words to use
  tabooList: json("tabooList").$type<string[]>(), // Words to avoid
  hookPatterns: json("hookPatterns").$type<string[]>(), // Opening patterns
  ctaPatterns: json("ctaPatterns").$type<string[]>(), // Call-to-action patterns
  
  // Visual Identity
  avatarUrl: text("avatarUrl"),
  referenceImages: json("referenceImages").$type<string[]>(),
  characterWeight: int("characterWeight").default(80).notNull(),
  
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InfluencerPersona = typeof influencerPersonas.$inferSelect;
export type InsertInfluencerPersona = typeof influencerPersonas.$inferInsert;

/**
 * Leads captured from campaigns
 */
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  campaignId: int("campaignId"),
  assetId: int("assetId"),
  
  // Lead Info
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 200 }),
  company: varchar("company", { length: 200 }),
  role: varchar("role", { length: 100 }),
  
  // Source Attribution
  source: varchar("source", { length: 100 }),
  utmSource: varchar("utmSource", { length: 100 }),
  utmMedium: varchar("utmMedium", { length: 100 }),
  utmCampaign: varchar("utmCampaign", { length: 100 }),
  
  // Pipeline Stage
  stage: mysqlEnum("stage", ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"]).default("new").notNull(),
  
  // Notes & Activity
  notes: text("notes"),
  lastContactedAt: timestamp("lastContactedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Analytics Events (for closed-loop optimization)
 */
export const analyticsEvents = mysqlTable("analytics_events", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  campaignId: int("campaignId"),
  assetId: int("assetId"),
  
  eventType: mysqlEnum("eventType", ["impression", "click", "engagement", "conversion", "lead", "booked_call"]).notNull(),
  
  // Attribution
  source: varchar("source", { length: 100 }),
  platform: varchar("platform", { length: 50 }),
  
  // Event Data
  metadata: json("metadata").$type<Record<string, any>>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;

/**
 * Auto-Insights (AI-generated recommendations)
 */
export const autoInsights = mysqlTable("auto_insights", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  
  insightType: mysqlEnum("insightType", [
    "winning_angle", "underperforming_persona", "channel_recommendation",
    "hook_refresh", "claim_revision", "next_best_action"
  ]).notNull(),
  
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  actionable: text("actionable"), // Suggested action
  
  // Context
  relatedCampaignId: int("relatedCampaignId"),
  relatedPersonaId: int("relatedPersonaId"),
  
  confidence: int("confidence").default(0).notNull(), // 0-100
  isActioned: boolean("isActioned").default(false).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AutoInsight = typeof autoInsights.$inferSelect;
export type InsertAutoInsight = typeof autoInsights.$inferInsert;

/**
 * Character Training Jobs (for image upload & training)
 */
export const characterTrainingJobs = mysqlTable("character_training_jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  personaId: int("personaId"),
  
  // Training Images
  trainingImages: json("trainingImages").$type<string[]>().notNull(),
  
  // Job Status
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  progress: int("progress").default(0).notNull(), // 0-100
  
  // Result
  modelId: varchar("modelId", { length: 100 }), // Reference to trained model
  errorMessage: text("errorMessage"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type CharacterTrainingJob = typeof characterTrainingJobs.$inferSelect;
export type InsertCharacterTrainingJob = typeof characterTrainingJobs.$inferInsert;

/**
 * Landing Pages (hosted on matango.ai)
 */
export const landingPages = mysqlTable("landing_pages", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  campaignId: int("campaignId"),
  
  // Page Identity
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  
  // Content
  headline: text("headline").notNull(),
  subheadline: text("subheadline"),
  bullets: json("bullets").$type<string[]>(),
  ctaText: varchar("ctaText", { length: 100 }),
  ctaUrl: text("ctaUrl"),
  faq: json("faq").$type<Array<{ question: string; answer: string }>>(),
  
  // Design
  heroImageUrl: text("heroImageUrl"),
  templateId: varchar("templateId", { length: 50 }),
  customCss: text("customCss"),
  
  // Status
  isPublished: boolean("isPublished").default(false).notNull(),
  
  // Analytics
  views: int("views").default(0).notNull(),
  conversions: int("conversions").default(0).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LandingPage = typeof landingPages.$inferSelect;
export type InsertLandingPage = typeof landingPages.$inferInsert;

/**
 * Email Sequences
 */
export const emailSequences = mysqlTable("email_sequences", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  campaignId: int("campaignId"),
  
  name: varchar("name", { length: 200 }).notNull(),
  sequenceType: mysqlEnum("sequenceType", ["welcome", "nurture", "onboarding", "re_engagement"]).default("welcome").notNull(),
  
  isActive: boolean("isActive").default(false).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailSequence = typeof emailSequences.$inferSelect;
export type InsertEmailSequence = typeof emailSequences.$inferInsert;

/**
 * Email Sequence Steps
 */
export const emailSequenceSteps = mysqlTable("email_sequence_steps", {
  id: int("id").autoincrement().primaryKey(),
  sequenceId: int("sequenceId").notNull(),
  
  stepOrder: int("stepOrder").notNull(),
  delayDays: int("delayDays").default(0).notNull(), // Days after previous step
  
  subject: varchar("subject", { length: 200 }).notNull(),
  preheader: varchar("preheader", { length: 200 }),
  body: text("body").notNull(),
  ctaText: varchar("ctaText", { length: 100 }),
  ctaUrl: text("ctaUrl"),
  
  // Performance
  sent: int("sent").default(0).notNull(),
  opened: int("opened").default(0).notNull(),
  clicked: int("clicked").default(0).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailSequenceStep = typeof emailSequenceSteps.$inferSelect;
export type InsertEmailSequenceStep = typeof emailSequenceSteps.$inferInsert;


// ============================================
// Phase 6 - Advanced Features Tables
// ============================================

/**
 * Connected social media accounts for auto-posting
 */
export const socialConnections = mysqlTable("social_connections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  platform: mysqlEnum("platform", ["instagram", "facebook", "youtube", "tiktok", "linkedin"]).notNull(),
  platformUserId: varchar("platformUserId", { length: 255 }),
  platformUsername: varchar("platformUsername", { length: 255 }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  scopes: json("scopes").$type<string[]>(),
  profilePictureUrl: text("profilePictureUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  lastSyncAt: timestamp("lastSyncAt"),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SocialConnection = typeof socialConnections.$inferSelect;
export type InsertSocialConnection = typeof socialConnections.$inferInsert;

/**
 * Posted content tracking for social media
 */
export const socialPosts = mysqlTable("social_posts", {
  id: int("id").autoincrement().primaryKey(),
  scheduledPostId: int("scheduledPostId"),
  socialConnectionId: int("socialConnectionId").notNull(),
  userId: int("userId").notNull(),
  influencerId: int("influencerId"),
  platform: mysqlEnum("platform", ["instagram", "facebook", "youtube", "tiktok", "linkedin"]).notNull(),
  platformPostId: varchar("platformPostId", { length: 255 }),
  postType: mysqlEnum("postType", ["image", "video", "carousel", "story", "reel", "short"]).default("image").notNull(),
  caption: text("caption"),
  mediaUrls: json("mediaUrls").$type<string[]>(),
  status: mysqlEnum("status", ["pending", "publishing", "published", "failed"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  publishedAt: timestamp("publishedAt"),
  metrics: json("metrics").$type<{
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
    reach?: number;
    impressions?: number;
  }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SocialPost = typeof socialPosts.$inferSelect;
export type InsertSocialPost = typeof socialPosts.$inferInsert;

/**
 * A/B Test experiments for campaigns
 */
export const abTests = mysqlTable("ab_tests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  influencerId: int("influencerId"),
  campaignId: int("campaignId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  testType: mysqlEnum("testType", ["caption", "image", "cta", "timing", "audience"]).notNull(),
  status: mysqlEnum("status", ["draft", "running", "paused", "completed", "archived"]).default("draft").notNull(),
  trafficSplit: json("trafficSplit").$type<{ [variantId: string]: number }>(), // percentage per variant
  targetMetric: mysqlEnum("targetMetric", ["engagement", "clicks", "conversions", "reach", "impressions"]).default("engagement").notNull(),
  confidenceLevel: int("confidenceLevel").default(95).notNull(), // 90, 95, 99
  minSampleSize: int("minSampleSize").default(100).notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  winnerVariantId: int("winnerVariantId"),
  autoOptimize: boolean("autoOptimize").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AbTest = typeof abTests.$inferSelect;
export type InsertAbTest = typeof abTests.$inferInsert;

/**
 * A/B Test variants
 */
export const abTestVariants = mysqlTable("ab_test_variants", {
  id: int("id").autoincrement().primaryKey(),
  abTestId: int("abTestId").notNull(),
  name: varchar("name", { length: 100 }).notNull(), // e.g., "Control", "Variant A", "Variant B"
  isControl: boolean("isControl").default(false).notNull(),
  content: json("content").$type<{
    caption?: string;
    imageUrl?: string;
    cta?: string;
    scheduledTime?: string;
  }>(),
  trafficPercentage: int("trafficPercentage").default(50).notNull(),
  impressions: int("impressions").default(0).notNull(),
  clicks: int("clicks").default(0).notNull(),
  conversions: int("conversions").default(0).notNull(),
  engagements: int("engagements").default(0).notNull(),
  conversionRate: int("conversionRate").default(0).notNull(), // stored as rate * 10000
  engagementRate: int("engagementRate").default(0).notNull(), // stored as rate * 10000
  isWinner: boolean("isWinner").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AbTestVariant = typeof abTestVariants.$inferSelect;
export type InsertAbTestVariant = typeof abTestVariants.$inferInsert;

/**
 * White-label settings for Agency tier users
 */
export const whiteLabelSettings = mysqlTable("white_label_settings", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().unique(),
  userId: int("userId").notNull(),
  brandName: varchar("brandName", { length: 100 }),
  logoUrl: text("logoUrl"),
  faviconUrl: text("faviconUrl"),
  primaryColor: varchar("primaryColor", { length: 7 }), // hex color
  secondaryColor: varchar("secondaryColor", { length: 7 }),
  accentColor: varchar("accentColor", { length: 7 }),
  customDomain: varchar("customDomain", { length: 255 }),
  customDomainVerified: boolean("customDomainVerified").default(false).notNull(),
  customDomainVerificationToken: varchar("customDomainVerificationToken", { length: 64 }),
  hideMatangoBranding: boolean("hideMatangoBranding").default(false).notNull(),
  customFooterText: text("customFooterText"),
  customSupportEmail: varchar("customSupportEmail", { length: 320 }),
  customTermsUrl: text("customTermsUrl"),
  customPrivacyUrl: text("customPrivacyUrl"),
  emailFromName: varchar("emailFromName", { length: 100 }),
  emailReplyTo: varchar("emailReplyTo", { length: 320 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WhiteLabelSetting = typeof whiteLabelSettings.$inferSelect;
export type InsertWhiteLabelSetting = typeof whiteLabelSettings.$inferInsert;

/**
 * Custom email templates for white-label
 */
export const customEmailTemplates = mysqlTable("custom_email_templates", {
  id: int("id").autoincrement().primaryKey(),
  whiteLabelId: int("whiteLabelId").notNull(),
  templateType: mysqlEnum("templateType", [
    "welcome", 
    "password_reset", 
    "team_invite", 
    "post_published", 
    "milestone", 
    "weekly_report",
    "payment_receipt",
    "subscription_renewal"
  ]).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  htmlContent: text("htmlContent").notNull(),
  textContent: text("textContent"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomEmailTemplate = typeof customEmailTemplates.$inferSelect;
export type InsertCustomEmailTemplate = typeof customEmailTemplates.$inferInsert;

/**
 * Client workspaces for Agency white-label
 */
export const clientWorkspaces = mysqlTable("client_workspaces", {
  id: int("id").autoincrement().primaryKey(),
  whiteLabelId: int("whiteLabelId").notNull(),
  organizationId: int("organizationId").notNull(),
  clientName: varchar("clientName", { length: 100 }).notNull(),
  clientEmail: varchar("clientEmail", { length: 320 }),
  clientLogoUrl: text("clientLogoUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  accessToken: varchar("accessToken", { length: 64 }),
  lastAccessAt: timestamp("lastAccessAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ClientWorkspace = typeof clientWorkspaces.$inferSelect;
export type InsertClientWorkspace = typeof clientWorkspaces.$inferInsert;


// ============================================
// Phase 8 - Matango AI Influencer & Video Scripts
// ============================================

/**
 * System AI Influencers (official Matango personas)
 */
export const systemInfluencers = mysqlTable("system_influencers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  
  // Identity
  genderPresentation: varchar("genderPresentation", { length: 50 }),
  ageAppearance: varchar("ageAppearance", { length: 50 }),
  ethnicity: varchar("ethnicity", { length: 100 }),
  aesthetic: text("aesthetic"),
  
  // Persona
  personaDescription: text("personaDescription"),
  voiceTraits: json("voiceTraits").$type<string[]>(),
  
  // Behavioral Constraints
  behavioralConstraints: json("behavioralConstraints").$type<string[]>(),
  
  // Camera & Visual Rules
  cameraRules: json("cameraRules").$type<{
    framing?: string;
    background?: string;
    lighting?: string;
    overlays?: string;
    motion?: string;
  }>(),
  
  // Avatar/Image
  avatarUrl: text("avatarUrl"),
  
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemInfluencer = typeof systemInfluencers.$inferSelect;
export type InsertSystemInfluencer = typeof systemInfluencers.$inferInsert;

/**
 * Video Scripts (master and variants)
 */
export const videoScripts = mysqlTable("video_scripts", {
  id: int("id").autoincrement().primaryKey(),
  systemInfluencerId: int("systemInfluencerId"),
  userId: int("userId"), // null for system scripts
  
  // Script Identity
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }),
  scriptType: mysqlEnum("scriptType", ["master", "tiktok", "youtube_shorts", "instagram_reels", "agency", "custom"]).default("custom").notNull(),
  
  // Duration
  durationSeconds: int("durationSeconds"),
  
  // Script Content (scenes)
  scenes: json("scenes").$type<Array<{
    sceneNumber: number;
    title: string;
    dialogue: string;
    visualNotes?: string;
    onScreenText?: string;
    durationHint?: string;
  }>>(),
  
  // Full Script (concatenated)
  fullScript: text("fullScript"),
  
  // Delivery Notes
  deliveryNotes: json("deliveryNotes").$type<{
    pacing?: string;
    emphasis?: string[];
    pauses?: string[];
    tone?: string;
  }>(),
  
  // Status
  isPublished: boolean("isPublished").default(false).notNull(),
  isSystemScript: boolean("isSystemScript").default(false).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VideoScript = typeof videoScripts.$inferSelect;
export type InsertVideoScript = typeof videoScripts.$inferInsert;


/**
 * Sales Leads for Agency++ contact form
 */
export const salesLeads = mysqlTable("sales_leads", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  company: varchar("company", { length: 200 }).notNull(),
  companySize: varchar("companySize", { length: 50 }),
  phone: varchar("phone", { length: 50 }),
  message: text("message"),
  status: mysqlEnum("status", ["new", "contacted", "qualified", "converted", "closed"]).default("new").notNull(),
  source: varchar("source", { length: 100 }).default("agency_plus_pricing").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SalesLead = typeof salesLeads.$inferSelect;
export type InsertSalesLead = typeof salesLeads.$inferInsert;


// ============================================
// ADMIN PANEL TABLES
// ============================================

/**
 * Admin Roles - defines available admin roles
 */
export const adminRoles = mysqlTable("admin_roles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: text("description"),
  permissions: json("permissions").$type<string[]>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AdminRole = typeof adminRoles.$inferSelect;
export type InsertAdminRole = typeof adminRoles.$inferInsert;

/**
 * Admin Users - links users to admin roles
 */
export const adminUsers = mysqlTable("admin_users", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  roleId: int("roleId").notNull(),
  mfaEnabled: boolean("mfaEnabled").default(false).notNull(),
  mfaSecret: varchar("mfaSecret", { length: 255 }),
  status: mysqlEnum("status", ["active", "suspended", "pending"]).default("pending").notNull(),
  lastLoginAt: timestamp("lastLoginAt"),
  lastLoginIp: varchar("lastLoginIp", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;

/**
 * Admin Audit Log - immutable log of all admin actions
 */
export const adminAuditLog = mysqlTable("admin_audit_log", {
  id: int("id").autoincrement().primaryKey(),
  adminUserId: int("adminUserId").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  targetType: varchar("targetType", { length: 50 }), // 'tenant', 'user', 'subscription', etc.
  targetId: int("targetId"),
  metadata: json("metadata").$type<Record<string, any>>(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AdminAuditLog = typeof adminAuditLog.$inferSelect;
export type InsertAdminAuditLog = typeof adminAuditLog.$inferInsert;

/**
 * Impersonation Sessions - tracks admin impersonation of users
 */
export const impersonationSessions = mysqlTable("impersonation_sessions", {
  id: int("id").autoincrement().primaryKey(),
  adminUserId: int("adminUserId").notNull(),
  targetUserId: int("targetUserId").notNull(),
  justification: text("justification").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ImpersonationSession = typeof impersonationSessions.$inferSelect;
export type InsertImpersonationSession = typeof impersonationSessions.$inferInsert;

/**
 * Feature Flags - global feature toggles
 */
export const featureFlags = mysqlTable("feature_flags", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  defaultState: boolean("defaultState").default(false).notNull(),
  rules: json("rules").$type<{
    plans?: string[];
    userIds?: number[];
    percentage?: number;
    regions?: string[];
  }>(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type FeatureFlag = typeof featureFlags.$inferSelect;
export type InsertFeatureFlag = typeof featureFlags.$inferInsert;

/**
 * Feature Flag Overrides - tenant-specific flag overrides
 */
export const featureFlagOverrides = mysqlTable("feature_flag_overrides", {
  id: int("id").autoincrement().primaryKey(),
  featureFlagId: int("featureFlagId").notNull(),
  userId: int("userId").notNull(),
  state: boolean("state").notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FeatureFlagOverride = typeof featureFlagOverrides.$inferSelect;
export type InsertFeatureFlagOverride = typeof featureFlagOverrides.$inferInsert;

/**
 * Tenant Limits - configurable limits per user/tenant
 */
export const tenantLimits = mysqlTable("tenant_limits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  influencersLimit: int("influencersLimit").default(1).notNull(),
  imagesPerMonth: int("imagesPerMonth").default(3).notNull(),
  videosPerMonth: int("videosPerMonth").default(0).notNull(),
  brandsLimit: int("brandsLimit").default(1).notNull(),
  customDomainsLimit: int("customDomainsLimit").default(0).notNull(),
  teamMembersLimit: int("teamMembersLimit").default(1).notNull(),
  storageGb: int("storageGb").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TenantLimit = typeof tenantLimits.$inferSelect;
export type InsertTenantLimit = typeof tenantLimits.$inferInsert;

/**
 * Usage Counters - tracks monthly usage per user
 */
export const usageCounters = mysqlTable("usage_counters", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  periodMonth: varchar("periodMonth", { length: 7 }).notNull(), // YYYY-MM format
  imagesGenerated: int("imagesGenerated").default(0).notNull(),
  videosGenerated: int("videosGenerated").default(0).notNull(),
  postsPublished: int("postsPublished").default(0).notNull(),
  storageUsedMb: int("storageUsedMb").default(0).notNull(),
  apiCalls: int("apiCalls").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UsageCounter = typeof usageCounters.$inferSelect;
export type InsertUsageCounter = typeof usageCounters.$inferInsert;

/**
 * Moderation Queue - flagged content for review
 */
export const moderationQueue = mysqlTable("moderation_queue", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  contentType: mysqlEnum("contentType", ["image", "video", "script", "post", "profile"]).notNull(),
  contentId: int("contentId").notNull(),
  contentUrl: text("contentUrl"),
  reason: varchar("reason", { length: 200 }).notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "escalated"]).default("pending").notNull(),
  reviewerId: int("reviewerId"),
  reviewNotes: text("reviewNotes"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ModerationQueueItem = typeof moderationQueue.$inferSelect;
export type InsertModerationQueueItem = typeof moderationQueue.$inferInsert;

/**
 * Policy Rules - content moderation rules
 */
export const policyRules = mysqlTable("policy_rules", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  type: mysqlEnum("type", ["blocklist", "allowlist", "pattern", "keyword"]).notNull(),
  pattern: text("pattern").notNull(),
  action: mysqlEnum("action", ["flag", "block", "warn", "auto_reject"]).default("flag").notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PolicyRule = typeof policyRules.$inferSelect;
export type InsertPolicyRule = typeof policyRules.$inferInsert;

/**
 * OAuth Health Events - tracks integration health
 */
export const oauthHealthEvents = mysqlTable("oauth_health_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  platform: mysqlEnum("platform", ["instagram", "tiktok", "youtube", "linkedin", "twitter"]).notNull(),
  eventType: mysqlEnum("eventType", ["token_refresh_success", "token_refresh_failure", "api_error", "rate_limit", "connection_lost"]).notNull(),
  details: json("details").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type OAuthHealthEvent = typeof oauthHealthEvents.$inferSelect;
export type InsertOAuthHealthEvent = typeof oauthHealthEvents.$inferInsert;

/**
 * Webhook Events - tracks webhook delivery
 */
export const webhookEvents = mysqlTable("webhook_events", {
  id: int("id").autoincrement().primaryKey(),
  platform: varchar("platform", { length: 50 }).notNull(),
  eventId: varchar("eventId", { length: 255 }).notNull(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["received", "processed", "failed", "retrying"]).default("received").notNull(),
  payload: json("payload").$type<Record<string, any>>(),
  errorMessage: text("errorMessage"),
  retryCount: int("retryCount").default(0).notNull(),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = typeof webhookEvents.$inferInsert;

/**
 * Job Queue - background job tracking
 */
export const jobQueue = mysqlTable("job_queue", {
  id: int("id").autoincrement().primaryKey(),
  jobType: mysqlEnum("jobType", ["image_generation", "video_generation", "post_publish", "analytics_sync", "email_send"]).notNull(),
  userId: int("userId"),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "dead_letter"]).default("pending").notNull(),
  priority: int("priority").default(5).notNull(),
  payload: json("payload").$type<Record<string, any>>(),
  result: json("result").$type<Record<string, any>>(),
  errorMessage: text("errorMessage"),
  attempts: int("attempts").default(0).notNull(),
  maxAttempts: int("maxAttempts").default(3).notNull(),
  scheduledFor: timestamp("scheduledFor"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type JobQueueItem = typeof jobQueue.$inferSelect;
export type InsertJobQueueItem = typeof jobQueue.$inferInsert;

/**
 * Support Tickets - customer support tracking
 */
export const supportTickets = mysqlTable("support_tickets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  assignedAdminId: int("assignedAdminId"),
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: mysqlEnum("category", ["billing", "technical", "feature_request", "bug_report", "account", "other"]).default("other").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  status: mysqlEnum("status", ["open", "in_progress", "waiting_customer", "resolved", "closed"]).default("open").notNull(),
  slaDeadline: timestamp("slaDeadline"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = typeof supportTickets.$inferInsert;

/**
 * Support Ticket Messages - ticket conversation thread
 */
export const supportTicketMessages = mysqlTable("support_ticket_messages", {
  id: int("id").autoincrement().primaryKey(),
  ticketId: int("ticketId").notNull(),
  senderId: int("senderId").notNull(),
  senderType: mysqlEnum("senderType", ["user", "admin", "system"]).notNull(),
  message: text("message").notNull(),
  attachments: json("attachments").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SupportTicketMessage = typeof supportTicketMessages.$inferSelect;
export type InsertSupportTicketMessage = typeof supportTicketMessages.$inferInsert;

/**
 * Platform Announcements - broadcast messages
 */
export const platformAnnouncements = mysqlTable("platform_announcements", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ["info", "warning", "maintenance", "feature"]).default("info").notNull(),
  targetPlans: json("targetPlans").$type<string[]>(),
  showBanner: boolean("showBanner").default(false).notNull(),
  sendEmail: boolean("sendEmail").default(false).notNull(),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt"),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PlatformAnnouncement = typeof platformAnnouncements.$inferSelect;
export type InsertPlatformAnnouncement = typeof platformAnnouncements.$inferInsert;

/**
 * Data Export Requests - GDPR compliance
 */
export const dataExportRequests = mysqlTable("data_export_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  requestType: mysqlEnum("requestType", ["export", "delete"]).notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  downloadUrl: text("downloadUrl"),
  expiresAt: timestamp("expiresAt"),
  processedBy: int("processedBy"),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DataExportRequest = typeof dataExportRequests.$inferSelect;
export type InsertDataExportRequest = typeof dataExportRequests.$inferInsert;


/**
 * Video Jobs - async video generation tasks
 */
export const videoJobs = mysqlTable("video_jobs", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId"),
  userId: int("userId").notNull(),
  brandId: int("brandId"),
  influencerId: int("influencerId"),
  campaignId: int("campaignId"),
  type: mysqlEnum("type", [
    "imageToVideo",
    "textToVideo",
    "videoRestyle",
    "lipSync",
    "motionSync",
    "characterSwap",
    "storyPreview",
    "finalRender"
  ]).notNull(),
  title: varchar("title", { length: 255 }),
  prompt: text("prompt"),
  params: json("params").$type<{
    aspectRatio?: string;
    resolution?: string;
    duration?: number;
    style?: string;
    voiceId?: string;
    musicTrackId?: string;
    inputImageUrl?: string;
    inputVideoUrl?: string;
    inputAudioUrl?: string;
    seed?: number;
    negativePrompt?: string;
  }>(),
  status: mysqlEnum("status", ["queued", "running", "completed", "failed", "cancelled"]).default("queued").notNull(),
  progress: int("progress").default(0).notNull(),
  creditsEstimated: int("creditsEstimated").default(0).notNull(),
  creditsConsumed: int("creditsConsumed").default(0).notNull(),
  previewUrl: text("previewUrl"),
  outputUrl: text("outputUrl"),
  thumbnailUrl: text("thumbnailUrl"),
  duration: int("duration"),
  errorMessage: text("errorMessage"),
  retryCount: int("retryCount").default(0).notNull(),
  maxRetries: int("maxRetries").default(3).notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type VideoJob = typeof videoJobs.$inferSelect;
export type InsertVideoJob = typeof videoJobs.$inferInsert;

/**
 * Video Scenes - individual scenes within a video project
 */
export const videoScenes = mysqlTable("video_scenes", {
  id: int("id").autoincrement().primaryKey(),
  videoJobId: int("videoJobId").notNull(),
  order: int("order").notNull(),
  title: varchar("title", { length: 255 }),
  prompt: text("prompt"),
  duration: int("duration").default(5).notNull(),
  aspectRatio: mysqlEnum("aspectRatio", ["16:9", "9:16", "1:1", "4:5"]).default("16:9").notNull(),
  transitionType: mysqlEnum("transitionType", ["none", "fade", "dissolve", "wipe", "slide"]).default("fade").notNull(),
  transitionDuration: int("transitionDuration").default(500).notNull(),
  voiceoverText: text("voiceoverText"),
  voiceId: varchar("voiceId", { length: 100 }),
  musicTrackId: varchar("musicTrackId", { length: 100 }),
  musicVolume: int("musicVolume").default(50).notNull(),
  inputImageUrl: text("inputImageUrl"),
  inputVideoUrl: text("inputVideoUrl"),
  outputUrl: text("outputUrl"),
  thumbnailUrl: text("thumbnailUrl"),
  status: mysqlEnum("status", ["pending", "generating", "completed", "failed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type VideoScene = typeof videoScenes.$inferSelect;
export type InsertVideoScene = typeof videoScenes.$inferInsert;

/**
 * Video Templates - pre-built video templates
 */
export const videoTemplates = mysqlTable("video_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", [
    "product_demo",
    "day_in_life",
    "vlog",
    "tutorial",
    "testimonial",
    "social_ad",
    "explainer",
    "announcement",
    "behind_scenes",
    "custom"
  ]).default("custom").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  previewUrl: text("previewUrl"),
  aspectRatio: mysqlEnum("aspectRatio", ["16:9", "9:16", "1:1", "4:5"]).default("16:9").notNull(),
  duration: int("duration").default(30).notNull(),
  sceneCount: int("sceneCount").default(1).notNull(),
  scenes: json("scenes").$type<{
    order: number;
    title: string;
    prompt: string;
    duration: number;
    voiceoverTemplate?: string;
  }[]>(),
  tags: json("tags").$type<string[]>(),
  isPremium: boolean("isPremium").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  usageCount: int("usageCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type VideoTemplate = typeof videoTemplates.$inferSelect;
export type InsertVideoTemplate = typeof videoTemplates.$inferInsert;

/**
 * Video Assets Library - saved video outputs
 */
export const videoAssets = mysqlTable("video_assets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orgId: int("orgId"),
  brandId: int("brandId"),
  influencerId: int("influencerId"),
  campaignId: int("campaignId"),
  videoJobId: int("videoJobId"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  duration: int("duration").notNull(),
  resolution: varchar("resolution", { length: 20 }),
  aspectRatio: mysqlEnum("aspectRatio", ["16:9", "9:16", "1:1", "4:5"]).default("16:9").notNull(),
  fileSize: int("fileSize"),
  format: varchar("format", { length: 20 }).default("mp4").notNull(),
  hasWatermark: boolean("hasWatermark").default(false).notNull(),
  version: int("version").default(1).notNull(),
  parentAssetId: int("parentAssetId"),
  tags: json("tags").$type<string[]>(),
  metadata: json("metadata").$type<{
    prompt?: string;
    style?: string;
    voiceId?: string;
    musicTrackId?: string;
  }>(),
  isPublished: boolean("isPublished").default(false).notNull(),
  publishedAt: timestamp("publishedAt"),
  viewCount: int("viewCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type VideoAsset = typeof videoAssets.$inferSelect;
export type InsertVideoAsset = typeof videoAssets.$inferInsert;

/**
 * Music Library - background music tracks
 */
export const musicTracks = mysqlTable("music_tracks", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  artist: varchar("artist", { length: 255 }),
  genre: mysqlEnum("genre", [
    "ambient",
    "corporate",
    "upbeat",
    "cinematic",
    "electronic",
    "acoustic",
    "hip_hop",
    "pop",
    "rock",
    "classical",
    "jazz",
    "other"
  ]).default("ambient").notNull(),
  mood: mysqlEnum("mood", [
    "happy",
    "energetic",
    "calm",
    "inspiring",
    "dramatic",
    "mysterious",
    "romantic",
    "sad",
    "neutral"
  ]).default("neutral").notNull(),
  url: text("url").notNull(),
  previewUrl: text("previewUrl"),
  duration: int("duration").notNull(),
  bpm: int("bpm"),
  isPremium: boolean("isPremium").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  usageCount: int("usageCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type MusicTrack = typeof musicTracks.$inferSelect;
export type InsertMusicTrack = typeof musicTracks.$inferInsert;

/**
 * Voice Library - TTS voice options
 */
export const voiceLibrary = mysqlTable("voice_library", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  providerId: varchar("providerId", { length: 100 }).notNull(),
  provider: mysqlEnum("provider", ["elevenlabs", "openai", "azure", "google", "custom"]).default("elevenlabs").notNull(),
  gender: mysqlEnum("gender", ["male", "female", "neutral"]).default("neutral").notNull(),
  language: varchar("language", { length: 10 }).default("en").notNull(),
  accent: varchar("accent", { length: 50 }),
  style: mysqlEnum("style", [
    "professional",
    "casual",
    "energetic",
    "calm",
    "authoritative",
    "friendly",
    "narrative"
  ]).default("professional").notNull(),
  previewUrl: text("previewUrl"),
  isPremium: boolean("isPremium").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  usageCount: int("usageCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type VoiceLibraryItem = typeof voiceLibrary.$inferSelect;
export type InsertVoiceLibraryItem = typeof voiceLibrary.$inferInsert;

/**
 * Video Credits Usage - track video generation credits
 */
export const videoCreditsUsage = mysqlTable("video_credits_usage", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orgId: int("orgId"),
  videoJobId: int("videoJobId"),
  action: mysqlEnum("action", [
    "preview",
    "generate",
    "upscale",
    "extend",
    "restyle",
    "lip_sync",
    "motion_sync"
  ]).notNull(),
  creditsUsed: int("creditsUsed").notNull(),
  durationSeconds: int("durationSeconds"),
  resolution: varchar("resolution", { length: 20 }),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type VideoCreditsUsageItem = typeof videoCreditsUsage.$inferSelect;
export type InsertVideoCreditsUsageItem = typeof videoCreditsUsage.$inferInsert;


/**
 * AI Influencer Training Jobs - tracks character model training
 */
export const influencerTrainingJobs = mysqlTable("influencer_training_jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  influencerId: int("influencerId"),
  name: varchar("name", { length: 255 }).notNull(),
  creationMethod: mysqlEnum("creationMethod", ["image_upload", "text_prompt", "template"]).notNull(),
  status: mysqlEnum("status", [
    "pending",
    "uploading",
    "processing",
    "training",
    "completed",
    "failed",
    "cancelled"
  ]).default("pending").notNull(),
  progress: int("progress").default(0).notNull(),
  // For image upload path
  referenceImages: json("referenceImages").$type<string[]>(),
  // For text prompt path
  textPrompt: text("textPrompt"),
  // Character attributes
  gender: mysqlEnum("gender", ["male", "female", "non_binary", "other"]),
  ageRange: mysqlEnum("ageRange", ["young_adult", "adult", "middle_aged", "senior"]),
  ethnicity: varchar("ethnicity", { length: 100 }),
  bodyType: varchar("bodyType", { length: 100 }),
  hairStyle: varchar("hairStyle", { length: 100 }),
  hairColor: varchar("hairColor", { length: 50 }),
  eyeColor: varchar("eyeColor", { length: 50 }),
  skinTone: varchar("skinTone", { length: 50 }),
  facialFeatures: text("facialFeatures"),
  distinctiveFeatures: text("distinctiveFeatures"),
  // Style settings
  stylePreset: mysqlEnum("stylePreset", [
    "photorealistic",
    "anime",
    "cartoon",
    "3d_render",
    "illustration",
    "oil_painting",
    "watercolor",
    "pixel_art",
    "comic_book",
    "fashion",
    "cinematic"
  ]).default("photorealistic"),
  // Consistency controls
  consistencyWeight: int("consistencyWeight").default(80).notNull(),
  keepOutfit: boolean("keepOutfit").default(false).notNull(),
  styleBias: int("styleBias").default(50).notNull(),
  // Brand Brain binding
  brandBrainId: int("brandBrainId"),
  // Training results
  modelId: varchar("modelId", { length: 255 }),
  trainingCreditsUsed: int("trainingCreditsUsed").default(0).notNull(),
  errorMessage: text("errorMessage"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InfluencerTrainingJob = typeof influencerTrainingJobs.$inferSelect;
export type InsertInfluencerTrainingJob = typeof influencerTrainingJobs.$inferInsert;

/**
 * Influencer Generation History - tracks all image generations for an influencer
 */
export const influencerGenerations = mysqlTable("influencer_generations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  influencerId: int("influencerId").notNull(),
  prompt: text("prompt").notNull(),
  negativePrompt: text("negativePrompt"),
  // Generation settings
  aspectRatio: mysqlEnum("aspectRatio", [
    "1:1",
    "4:3",
    "3:4",
    "16:9",
    "9:16",
    "21:9",
    "3:2",
    "2:3"
  ]).default("1:1").notNull(),
  resolution: mysqlEnum("resolution", ["512", "768", "1024", "1536", "2048"]).default("1024").notNull(),
  stylePreset: varchar("stylePreset", { length: 100 }),
  seed: int("seed"),
  guidanceScale: decimal("guidanceScale", { precision: 4, scale: 2 }).default("7.50"),
  steps: int("steps").default(30),
  // Consistency controls used
  consistencyWeight: int("consistencyWeight").default(80),
  keepOutfit: boolean("keepOutfit").default(false),
  // Results
  imageUrls: json("imageUrls").$type<string[]>(),
  thumbnailUrl: text("thumbnailUrl"),
  status: mysqlEnum("status", ["pending", "generating", "completed", "failed"]).default("pending").notNull(),
  creditsUsed: int("creditsUsed").default(1).notNull(),
  generationTime: int("generationTime"),
  errorMessage: text("errorMessage"),
  // Metadata
  isFavorite: boolean("isFavorite").default(false).notNull(),
  isPublic: boolean("isPublic").default(false).notNull(),
  tags: json("tags").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InfluencerGeneration = typeof influencerGenerations.$inferSelect;
export type InsertInfluencerGeneration = typeof influencerGenerations.$inferInsert;

/**
 * Influencer Templates - pre-made character templates
 */
export const influencerTemplates = mysqlTable("influencer_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", [
    "lifestyle",
    "fashion",
    "fitness",
    "tech",
    "gaming",
    "beauty",
    "food",
    "travel",
    "business",
    "entertainment",
    "education",
    "other"
  ]).default("lifestyle").notNull(),
  thumbnailUrl: text("thumbnailUrl").notNull(),
  previewImages: json("previewImages").$type<string[]>(),
  // Template settings
  gender: mysqlEnum("gender", ["male", "female", "non_binary", "other"]),
  ageRange: mysqlEnum("ageRange", ["young_adult", "adult", "middle_aged", "senior"]),
  stylePreset: varchar("stylePreset", { length: 100 }),
  basePrompt: text("basePrompt"),
  modelId: varchar("modelId", { length: 255 }),
  // Metadata
  createdBy: varchar("createdBy", { length: 100 }).default("Matango").notNull(),
  isPremium: boolean("isPremium").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  usageCount: int("usageCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InfluencerTemplate = typeof influencerTemplates.$inferSelect;
export type InsertInfluencerTemplate = typeof influencerTemplates.$inferInsert;

/**
 * Influencer Presets - saved generation settings for quick reuse
 */
export const influencerPresets = mysqlTable("influencer_presets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  influencerId: int("influencerId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  // Saved settings
  prompt: text("prompt"),
  negativePrompt: text("negativePrompt"),
  aspectRatio: varchar("aspectRatio", { length: 20 }),
  resolution: varchar("resolution", { length: 20 }),
  stylePreset: varchar("stylePreset", { length: 100 }),
  consistencyWeight: int("consistencyWeight"),
  keepOutfit: boolean("keepOutfit"),
  guidanceScale: decimal("guidanceScale", { precision: 4, scale: 2 }),
  steps: int("steps"),
  // Metadata
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InfluencerPreset = typeof influencerPresets.$inferSelect;
export type InsertInfluencerPreset = typeof influencerPresets.$inferInsert;


// ============================================
// Creator OS - Video Studio Pro Tables
// ============================================

/**
 * Creator Projects - Main video project container
 */
export const creatorProjects = mysqlTable("creator_projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  folderId: int("folderId"),
  
  // Project Identity
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnailUrl"),
  
  // Project Settings
  aspectRatio: mysqlEnum("aspectRatio", ["16:9", "9:16", "1:1", "4:5"]).default("16:9").notNull(),
  resolution: mysqlEnum("resolution", ["720p", "1080p", "4k"]).default("1080p").notNull(),
  frameRate: int("frameRate").default(30).notNull(),
  
  // Duration (calculated from scenes)
  totalDuration: int("totalDuration").default(0).notNull(), // in milliseconds
  
  // Status
  status: mysqlEnum("status", ["draft", "editing", "rendering", "completed", "archived"]).default("draft").notNull(),
  
  // Metadata
  tags: json("tags").$type<string[]>(),
  metadata: json("metadata").$type<Record<string, any>>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreatorProject = typeof creatorProjects.$inferSelect;
export type InsertCreatorProject = typeof creatorProjects.$inferInsert;

/**
 * Creator Folders - Project organization
 */
export const creatorFolders = mysqlTable("creator_folders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  parentId: int("parentId"),
  
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 7 }), // hex color
  icon: varchar("icon", { length: 50 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreatorFolder = typeof creatorFolders.$inferSelect;
export type InsertCreatorFolder = typeof creatorFolders.$inferInsert;

/**
 * Creator Scenes - Individual scenes within a project
 */
export const creatorScenes = mysqlTable("creator_scenes", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  
  // Scene Identity
  title: varchar("title", { length: 255 }),
  order: int("order").notNull(),
  
  // Duration
  duration: int("duration").default(5000).notNull(), // in milliseconds
  
  // Background
  backgroundType: mysqlEnum("backgroundType", ["color", "image", "video", "gradient"]).default("color").notNull(),
  backgroundValue: text("backgroundValue"), // color hex, image URL, video URL, or gradient CSS
  
  // Avatar
  avatarId: int("avatarId"),
  avatarPosition: json("avatarPosition").$type<{ x: number; y: number; scale: number }>(),
  
  // Script/Voiceover
  script: text("script"),
  voiceId: int("voiceId"),
  audioUrl: text("audioUrl"),
  
  // Transition
  transitionType: mysqlEnum("transitionType", ["none", "fade", "dissolve", "slide_left", "slide_right", "zoom"]).default("fade").notNull(),
  transitionDuration: int("transitionDuration").default(500).notNull(), // in milliseconds
  
  // Animation
  animation: json("animation").$type<{
    entrance?: string;
    exit?: string;
    entranceDuration?: number;
    exitDuration?: number;
  }>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreatorScene = typeof creatorScenes.$inferSelect;
export type InsertCreatorScene = typeof creatorScenes.$inferInsert;

/**
 * Creator Scene Elements - Text, images, shapes overlaid on scenes
 */
export const creatorSceneElements = mysqlTable("creator_scene_elements", {
  id: int("id").autoincrement().primaryKey(),
  sceneId: int("sceneId").notNull(),
  
  // Element Type
  elementType: mysqlEnum("elementType", ["text", "image", "shape", "video", "audio", "sticker"]).notNull(),
  
  // Position & Size
  x: int("x").default(0).notNull(),
  y: int("y").default(0).notNull(),
  width: int("width").default(100).notNull(),
  height: int("height").default(100).notNull(),
  rotation: int("rotation").default(0).notNull(),
  zIndex: int("zIndex").default(0).notNull(),
  
  // Content
  content: text("content"), // text content or URL for media
  
  // Styling
  style: json("style").$type<{
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    borderRadius?: number;
    borderWidth?: number;
    borderColor?: string;
    opacity?: number;
    shadow?: string;
    textAlign?: string;
  }>(),
  
  // Animation
  animation: json("animation").$type<{
    type?: string;
    delay?: number;
    duration?: number;
    easing?: string;
  }>(),
  
  // Timing (when element appears/disappears within scene)
  startTime: int("startTime").default(0).notNull(), // milliseconds from scene start
  endTime: int("endTime"), // null means until scene end
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreatorSceneElement = typeof creatorSceneElements.$inferSelect;
export type InsertCreatorSceneElement = typeof creatorSceneElements.$inferInsert;

/**
 * Creator Avatars - AI avatars for video generation
 */
export const creatorAvatars = mysqlTable("creator_avatars", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Avatar Identity
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Avatar Type
  avatarType: mysqlEnum("avatarType", ["ai_generated", "uploaded", "stock", "custom"]).default("ai_generated").notNull(),
  
  // Media
  imageUrl: text("imageUrl").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  videoUrl: text("videoUrl"), // for animated avatars
  
  // Avatar Settings
  style: mysqlEnum("style", ["realistic", "cartoon", "anime", "3d", "illustrated"]).default("realistic").notNull(),
  gender: mysqlEnum("gender", ["male", "female", "neutral"]),
  
  // Lip-sync model reference
  lipSyncModelId: varchar("lipSyncModelId", { length: 255 }),
  
  // Metadata
  tags: json("tags").$type<string[]>(),
  isFavorite: boolean("isFavorite").default(false).notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreatorAvatar = typeof creatorAvatars.$inferSelect;
export type InsertCreatorAvatar = typeof creatorAvatars.$inferInsert;

/**
 * Creator Assets - Media library (images, videos, audio)
 */
export const creatorAssets = mysqlTable("creator_assets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Asset Identity
  name: varchar("name", { length: 255 }).notNull(),
  
  // Asset Type
  assetType: mysqlEnum("assetType", ["image", "video", "audio", "font", "template"]).notNull(),
  
  // Media
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  
  // File Info
  fileSize: int("fileSize"), // in bytes
  mimeType: varchar("mimeType", { length: 100 }),
  duration: int("duration"), // for video/audio, in milliseconds
  width: int("width"), // for images/videos
  height: int("height"),
  
  // Organization
  category: varchar("category", { length: 100 }),
  tags: json("tags").$type<string[]>(),
  isFavorite: boolean("isFavorite").default(false).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreatorAsset = typeof creatorAssets.$inferSelect;
export type InsertCreatorAsset = typeof creatorAssets.$inferInsert;

/**
 * Creator Templates - Pre-built video templates
 */
export const creatorTemplates = mysqlTable("creator_templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // null for system templates
  
  // Template Identity
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnailUrl"),
  
  // Template Category
  category: mysqlEnum("category", [
    "product_demo",
    "social_ad",
    "explainer",
    "testimonial",
    "tutorial",
    "announcement",
    "promo",
    "story",
    "custom"
  ]).default("custom").notNull(),
  
  // Template Data (scenes and elements)
  templateData: json("templateData").$type<{
    aspectRatio: string;
    resolution: string;
    scenes: Array<{
      title?: string;
      duration: number;
      backgroundType: string;
      backgroundValue?: string;
      script?: string;
      elements?: Array<{
        elementType: string;
        x: number;
        y: number;
        width: number;
        height: number;
        content?: string;
        style?: Record<string, any>;
      }>;
    }>;
  }>(),
  
  // Metadata
  sceneCount: int("sceneCount").default(1).notNull(),
  duration: int("duration").default(0).notNull(), // total duration in milliseconds
  tags: json("tags").$type<string[]>(),
  
  // Status
  isSystem: boolean("isSystem").default(false).notNull(),
  isPremium: boolean("isPremium").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  usageCount: int("usageCount").default(0).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreatorTemplate = typeof creatorTemplates.$inferSelect;
export type InsertCreatorTemplate = typeof creatorTemplates.$inferInsert;

/**
 * Creator Voices - Text-to-speech voices
 */
export const creatorVoices = mysqlTable("creator_voices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // null for system voices
  
  // Voice Identity
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Voice Provider
  provider: mysqlEnum("provider", ["elevenlabs", "openai", "azure", "google", "custom"]).default("elevenlabs").notNull(),
  providerId: varchar("providerId", { length: 255 }).notNull(),
  
  // Voice Characteristics
  gender: mysqlEnum("gender", ["male", "female", "neutral"]).default("neutral").notNull(),
  language: varchar("language", { length: 10 }).default("en").notNull(),
  accent: varchar("accent", { length: 50 }),
  style: mysqlEnum("style", ["professional", "casual", "energetic", "calm", "narrative", "conversational"]).default("professional").notNull(),
  
  // Preview
  previewUrl: text("previewUrl"),
  
  // Status
  isSystem: boolean("isSystem").default(false).notNull(),
  isPremium: boolean("isPremium").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreatorVoice = typeof creatorVoices.$inferSelect;
export type InsertCreatorVoice = typeof creatorVoices.$inferInsert;

/**
 * Creator Export Jobs - Video rendering queue
 */
export const creatorExportJobs = mysqlTable("creator_export_jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId").notNull(),
  
  // Export Settings
  format: mysqlEnum("format", ["mp4", "webm", "mov", "gif"]).default("mp4").notNull(),
  resolution: mysqlEnum("resolution", ["720p", "1080p", "4k"]).default("1080p").notNull(),
  quality: mysqlEnum("quality", ["draft", "standard", "high", "ultra"]).default("standard").notNull(),
  frameRate: int("frameRate").default(30).notNull(),
  
  // Status
  status: mysqlEnum("status", ["queued", "processing", "completed", "failed", "cancelled"]).default("queued").notNull(),
  progress: int("progress").default(0).notNull(), // 0-100
  
  // Output
  outputUrl: text("outputUrl"),
  thumbnailUrl: text("thumbnailUrl"),
  fileSize: int("fileSize"), // in bytes
  duration: int("duration"), // in milliseconds
  
  // Error handling
  errorMessage: text("errorMessage"),
  retryCount: int("retryCount").default(0).notNull(),
  
  // Timing
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreatorExportJob = typeof creatorExportJobs.$inferSelect;
export type InsertCreatorExportJob = typeof creatorExportJobs.$inferInsert;

/**
 * Creator Usage - Credits and limits tracking
 */
export const creatorUsage = mysqlTable("creator_usage", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  periodMonth: varchar("periodMonth", { length: 7 }).notNull(), // YYYY-MM format
  
  // Usage Counters
  projectsCreated: int("projectsCreated").default(0).notNull(),
  scenesCreated: int("scenesCreated").default(0).notNull(),
  exportsCompleted: int("exportsCompleted").default(0).notNull(),
  storageUsedMb: int("storageUsedMb").default(0).notNull(),
  renderMinutesUsed: int("renderMinutesUsed").default(0).notNull(),
  aiGenerationsUsed: int("aiGenerationsUsed").default(0).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreatorUsage = typeof creatorUsage.$inferSelect;
export type InsertCreatorUsage = typeof creatorUsage.$inferInsert;


// ============================================
// Phase 46 - Template Marketplace & Collaboration
// ============================================

/**
 * Template Marketplace Listings - Templates available for purchase/sharing
 */
export const templateMarketplaceListings = mysqlTable("template_marketplace_listings", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull(),
  sellerId: int("sellerId").notNull(),
  
  // Listing Details
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  longDescription: text("longDescription"),
  previewVideoUrl: text("previewVideoUrl"),
  thumbnailUrl: text("thumbnailUrl"),
  screenshots: json("screenshots").$type<string[]>(),
  
  // Pricing
  pricingType: mysqlEnum("pricingType", ["free", "paid", "subscription"]).default("free").notNull(),
  price: int("price").default(0).notNull(), // in cents
  currency: varchar("currency", { length: 3 }).default("usd").notNull(),
  
  // Categories and Tags
  category: mysqlEnum("category", [
    "social_media",
    "youtube",
    "ads",
    "tutorials",
    "presentations",
    "explainers",
    "testimonials",
    "promos",
    "stories",
    "other"
  ]).default("other").notNull(),
  tags: json("tags").$type<string[]>(),
  
  // Stats
  downloads: int("downloads").default(0).notNull(),
  rating: int("rating").default(0).notNull(), // stored as rating * 100 (e.g., 450 = 4.5 stars)
  reviewCount: int("reviewCount").default(0).notNull(),
  
  // Status
  status: mysqlEnum("status", ["draft", "pending_review", "approved", "rejected", "suspended"]).default("draft").notNull(),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  isVerified: boolean("isVerified").default(false).notNull(),
  
  // Metadata
  rejectionReason: text("rejectionReason"),
  approvedAt: timestamp("approvedAt"),
  approvedBy: int("approvedBy"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TemplateMarketplaceListing = typeof templateMarketplaceListings.$inferSelect;
export type InsertTemplateMarketplaceListing = typeof templateMarketplaceListings.$inferInsert;

/**
 * Template Purchases - Track template purchases
 */
export const templatePurchases = mysqlTable("template_purchases", {
  id: int("id").autoincrement().primaryKey(),
  listingId: int("listingId").notNull(),
  buyerId: int("buyerId").notNull(),
  sellerId: int("sellerId").notNull(),
  
  // Purchase Details
  price: int("price").notNull(), // in cents
  currency: varchar("currency", { length: 3 }).default("usd").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  
  // Status
  status: mysqlEnum("status", ["pending", "completed", "refunded", "failed"]).default("pending").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TemplatePurchase = typeof templatePurchases.$inferSelect;
export type InsertTemplatePurchase = typeof templatePurchases.$inferInsert;

/**
 * Template Reviews - User reviews for marketplace templates
 */
export const templateReviews = mysqlTable("template_reviews", {
  id: int("id").autoincrement().primaryKey(),
  listingId: int("listingId").notNull(),
  userId: int("userId").notNull(),
  
  // Review Content
  rating: int("rating").notNull(), // 1-5
  title: varchar("title", { length: 255 }),
  content: text("content"),
  
  // Status
  isVerifiedPurchase: boolean("isVerifiedPurchase").default(false).notNull(),
  isHelpful: int("isHelpful").default(0).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TemplateReview = typeof templateReviews.$inferSelect;
export type InsertTemplateReview = typeof templateReviews.$inferInsert;

/**
 * Project Collaborators - Team members with access to projects
 */
export const projectCollaborators = mysqlTable("project_collaborators", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  
  // Permissions
  role: mysqlEnum("role", ["owner", "editor", "viewer"]).default("viewer").notNull(),
  canEdit: boolean("canEdit").default(false).notNull(),
  canDelete: boolean("canDelete").default(false).notNull(),
  canInvite: boolean("canInvite").default(false).notNull(),
  canExport: boolean("canExport").default(true).notNull(),
  
  // Invitation
  invitedBy: int("invitedBy"),
  invitedAt: timestamp("invitedAt"),
  acceptedAt: timestamp("acceptedAt"),
  status: mysqlEnum("status", ["pending", "accepted", "declined", "removed"]).default("pending").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectCollaborator = typeof projectCollaborators.$inferSelect;
export type InsertProjectCollaborator = typeof projectCollaborators.$inferInsert;

/**
 * Project Presence - Real-time collaboration presence tracking
 */
export const projectPresence = mysqlTable("project_presence", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  
  // Presence Data
  isOnline: boolean("isOnline").default(true).notNull(),
  currentSceneId: int("currentSceneId"),
  cursorPosition: json("cursorPosition").$type<{ x: number; y: number }>(),
  selectedElementId: int("selectedElementId"),
  
  // User Display
  displayName: varchar("displayName", { length: 100 }),
  avatarUrl: text("avatarUrl"),
  cursorColor: varchar("cursorColor", { length: 7 }), // hex color
  
  // Activity
  lastActiveAt: timestamp("lastActiveAt").defaultNow().notNull(),
  sessionStartedAt: timestamp("sessionStartedAt").defaultNow().notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectPresence = typeof projectPresence.$inferSelect;
export type InsertProjectPresence = typeof projectPresence.$inferInsert;

/**
 * AAO Activity Log - Track AAO operator activities
 */
export const aaoActivityLog = mysqlTable("aao_activity_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  influencerId: int("influencerId"), // which AAO performed the action
  
  // Activity Details
  activityType: mysqlEnum("activityType", [
    "content_generation",
    "content_publishing",
    "engagement_response",
    "analytics_processing",
    "lead_capture",
    "campaign_optimization",
    "brand_brain_update",
    "video_rendering",
    "image_generation",
    "scheduling",
    "other"
  ]).notNull(),
  
  // Activity Data
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  metadata: json("metadata").$type<Record<string, any>>(),
  
  // Status
  status: mysqlEnum("status", ["started", "in_progress", "completed", "failed"]).default("started").notNull(),
  errorMessage: text("errorMessage"),
  
  // Timing
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  durationMs: int("durationMs"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AaoActivityLog = typeof aaoActivityLog.$inferSelect;
export type InsertAaoActivityLog = typeof aaoActivityLog.$inferInsert;

/**
 * AAO Daily Stats - Aggregated daily statistics for AAO activities
 */
export const aaoDailyStats = mysqlTable("aao_daily_stats", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: timestamp("date").notNull(),
  
  // Activity Counts
  contentGenerated: int("contentGenerated").default(0).notNull(),
  contentPublished: int("contentPublished").default(0).notNull(),
  engagementsHandled: int("engagementsHandled").default(0).notNull(),
  leadsCapture: int("leadsCapture").default(0).notNull(),
  analyticsProcessed: int("analyticsProcessed").default(0).notNull(),
  videosRendered: int("videosRendered").default(0).notNull(),
  imagesGenerated: int("imagesGenerated").default(0).notNull(),
  
  // Time Stats
  totalActiveMinutes: int("totalActiveMinutes").default(0).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AaoDailyStat = typeof aaoDailyStats.$inferSelect;
export type InsertAaoDailyStat = typeof aaoDailyStats.$inferInsert;


// ============================================
// Phase 49 - Account Deletion Guardrails
// ============================================

/**
 * Account Lifecycle Events - Immutable audit trail for account state changes
 */
export const accountLifecycleEvents = mysqlTable("account_lifecycle_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  organizationId: int("organizationId"),
  
  // Event Details
  action: mysqlEnum("action", [
    "account_created",
    "account_activated",
    "account_deactivated",
    "account_suspended",
    "account_unsuspended",
    "billing_paused",
    "billing_resumed",
    "plan_downgraded",
    "plan_upgraded",
    "deletion_requested",
    "deletion_confirmed",
    "deletion_cancelled",
    "soft_deleted",
    "restored_from_soft_delete",
    "moved_to_retention",
    "restored_from_retention",
    "hard_deleted"
  ]).notNull(),
  
  // State Transition
  fromStatus: mysqlEnum("fromStatus", [
    "ACTIVE",
    "DEACTIVATED",
    "SUSPENDED",
    "SOFT_DELETED_90D",
    "RETENTION_12M",
    "HARD_DELETED"
  ]),
  toStatus: mysqlEnum("toStatus", [
    "ACTIVE",
    "DEACTIVATED",
    "SUSPENDED",
    "SOFT_DELETED_90D",
    "RETENTION_12M",
    "HARD_DELETED"
  ]),
  
  // Context
  triggeredBy: mysqlEnum("triggeredBy", ["user", "admin", "system", "support"]).notNull(),
  triggeredByUserId: int("triggeredByUserId"),
  reason: text("reason"),
  
  // Device/Session Info
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  deviceFingerprint: varchar("deviceFingerprint", { length: 255 }),
  
  // Additional Metadata
  metadata: json("metadata").$type<Record<string, any>>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AccountLifecycleEvent = typeof accountLifecycleEvents.$inferSelect;
export type InsertAccountLifecycleEvent = typeof accountLifecycleEvents.$inferInsert;

/**
 * Account Deletion Requests - Track deletion confirmation steps
 */
export const accountDeletionRequests = mysqlTable("account_deletion_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Request Status
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "expired"]).default("pending").notNull(),
  
  // Confirmation Steps (all must be true to confirm)
  typedPhraseOk: boolean("typedPhraseOk").default(false).notNull(),
  emailMatchOk: boolean("emailMatchOk").default(false).notNull(),
  reauthOk: boolean("reauthOk").default(false).notNull(),
  mfaOk: boolean("mfaOk").default(false).notNull(), // true if MFA not enabled
  acknowledgedConsequences: boolean("acknowledgedConsequences").default(false).notNull(),
  acknowledged90DayRecovery: boolean("acknowledged90DayRecovery").default(false).notNull(),
  acknowledged12MonthRetention: boolean("acknowledged12MonthRetention").default(false).notNull(),
  
  // Confirmation Method
  confirmationMethod: mysqlEnum("confirmationMethod", ["password", "oauth_reauth", "mfa"]),
  
  // Alternative Chosen (if any)
  alternativeChosen: mysqlEnum("alternativeChosen", [
    "none",
    "pause_billing_30d",
    "pause_billing_60d",
    "pause_billing_90d",
    "downgrade_plan",
    "deactivate_account"
  ]).default("none").notNull(),
  
  // Timing
  expiresAt: timestamp("expiresAt").notNull(), // Request expires after 24 hours
  confirmedAt: timestamp("confirmedAt"),
  cancelledAt: timestamp("cancelledAt"),
  
  // Context
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AccountDeletionRequest = typeof accountDeletionRequests.$inferSelect;
export type InsertAccountDeletionRequest = typeof accountDeletionRequests.$inferInsert;

/**
 * Billing Pause Records - Track billing pause periods
 */
export const billingPauseRecords = mysqlTable("billing_pause_records", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Pause Details
  pauseDuration: mysqlEnum("pauseDuration", ["30d", "60d", "90d"]).notNull(),
  pauseStartDate: timestamp("pauseStartDate").notNull(),
  pauseEndDate: timestamp("pauseEndDate").notNull(),
  
  // Stripe Integration
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  stripePauseCollectionBehavior: mysqlEnum("stripePauseCollectionBehavior", [
    "keep_as_draft",
    "mark_uncollectible",
    "void"
  ]).default("keep_as_draft").notNull(),
  
  // Status
  status: mysqlEnum("status", ["scheduled", "active", "completed", "cancelled"]).default("scheduled").notNull(),
  
  // Reason
  reason: text("reason"),
  
  // Timing
  resumedAt: timestamp("resumedAt"),
  cancelledAt: timestamp("cancelledAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BillingPauseRecord = typeof billingPauseRecords.$inferSelect;
export type InsertBillingPauseRecord = typeof billingPauseRecords.$inferInsert;


// ============================================
// Phase 50 - Video Scripts → Video Studio/Lab → AAO → K'ah Workflow
// ============================================

/**
 * Workflow Sessions - Container for multi-step content creation workflows
 */
export const workflowSessions = mysqlTable("workflow_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  brandId: int("brandId"), // FK to business_dna.id
  organizationId: int("organizationId"),
  
  // Session Identity
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  
  // Status
  status: mysqlEnum("status", ["draft", "active", "completed", "archived"]).default("draft").notNull(),
  
  // Current Step Tracking
  currentStep: mysqlEnum("currentStep", [
    "script_generation",
    "image_generation", 
    "video_generation",
    "review",
    "deployment"
  ]).default("script_generation").notNull(),
  
  // Metadata
  metadata: json("metadata").$type<Record<string, any>>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkflowSession = typeof workflowSessions.$inferSelect;
export type InsertWorkflowSession = typeof workflowSessions.$inferInsert;

/**
 * Workflow Scripts - Scripts generated within a workflow session
 */
export const workflowScripts = mysqlTable("workflow_scripts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sessionId: int("sessionId").notNull(), // FK to workflow_sessions.id
  
  // Script Identity
  platform: mysqlEnum("platform", ["tiktok", "instagram", "youtube", "ads", "linkedin", "other"]).notNull(),
  language: varchar("language", { length: 20 }).default("en").notNull(),
  tone: varchar("tone", { length: 40 }).default("confident").notNull(),
  
  // Script Content (structured JSON)
  contentJson: json("contentJson").$type<{
    hook: string;
    body: string;
    cta: string;
    shotList?: Array<{
      shot: number;
      description: string;
      duration?: string;
    }>;
    safetyNotes?: string[];
    deliveryNotes?: {
      pacing?: string;
      emphasis?: string[];
      pauses?: string[];
    };
  }>().notNull(),
  
  // Full Script (concatenated text)
  fullScript: text("fullScript"),
  
  // Duration
  estimatedDurationSeconds: int("estimatedDurationSeconds"),
  
  // Status
  status: mysqlEnum("status", ["draft", "approved", "used"]).default("draft").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkflowScript = typeof workflowScripts.$inferSelect;
export type InsertWorkflowScript = typeof workflowScripts.$inferInsert;

/**
 * Workflow Media Assets - All media files associated with a workflow
 */
export const workflowMediaAssets = mysqlTable("workflow_media_assets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sessionId: int("sessionId").notNull(), // FK to workflow_sessions.id
  brandId: int("brandId"),
  
  // Asset Type
  assetType: mysqlEnum("assetType", [
    "reference_image",
    "generated_image",
    "generated_video",
    "audio",
    "poster",
    "thumbnail"
  ]).notNull(),
  
  // Storage
  s3Key: varchar("s3Key", { length: 1024 }).notNull(),
  url: text("url"),
  
  // Media Properties
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  width: int("width"),
  height: int("height"),
  durationSeconds: int("durationSeconds"),
  sizeBytes: int("sizeBytes"),
  
  // Metadata (prompts, model IDs, forge job IDs, etc.)
  metadata: json("metadata").$type<{
    prompt?: string;
    negativePrompt?: string;
    modelId?: string;
    forgeJobId?: string;
    referenceAssetIds?: number[];
    seed?: number;
    steps?: number;
    guidance?: number;
    aspectRatio?: string;
    referenceStrength?: number;
  }>(),
  
  // Status
  status: mysqlEnum("status", ["uploading", "processing", "ready", "failed"]).default("ready").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkflowMediaAsset = typeof workflowMediaAssets.$inferSelect;
export type InsertWorkflowMediaAsset = typeof workflowMediaAssets.$inferInsert;

/**
 * Workflow Generation Jobs - Async generation tasks for workflow
 */
export const workflowGenerationJobs = mysqlTable("workflow_generation_jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sessionId: int("sessionId").notNull(), // FK to workflow_sessions.id
  
  // Job Type
  jobKind: mysqlEnum("jobKind", ["image", "video", "script", "audio"]).notNull(),
  
  // Status
  status: mysqlEnum("status", [
    "queued",
    "running",
    "succeeded",
    "failed",
    "canceled",
    "dead_letter"
  ]).default("queued").notNull(),
  
  // Progress
  progress: int("progress").default(0).notNull(), // 0-100
  
  // Error Handling
  errorMessage: text("errorMessage"),
  
  // Input Parameters
  inputJson: json("inputJson").$type<{
    prompt?: string;
    negativePrompt?: string;
    modelId?: string;
    referenceAssetIds?: number[];
    scriptId?: number;
    influencerProfileId?: number;
    voice?: Record<string, any>;
    style?: string;
    aspectRatio?: string;
    seed?: number;
    steps?: number;
    guidance?: number;
    referenceStrength?: number;
  }>().notNull(),
  
  // Output
  outputAssetId: int("outputAssetId"), // FK to workflow_media_assets.id
  
  // Forge Integration
  forgeJobId: varchar("forgeJobId", { length: 120 }),
  
  // Retry Logic
  attemptCount: int("attemptCount").default(0).notNull(),
  maxAttempts: int("maxAttempts").default(5).notNull(),
  nextRunAt: timestamp("nextRunAt").defaultNow().notNull(),
  
  // Lease Management (for job worker)
  leaseToken: varchar("leaseToken", { length: 80 }),
  leaseExpiresAt: timestamp("leaseExpiresAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkflowGenerationJob = typeof workflowGenerationJobs.$inferSelect;
export type InsertWorkflowGenerationJob = typeof workflowGenerationJobs.$inferInsert;

/**
 * Workflow Influencer Profiles - Age-gated influencer profiles for policy enforcement
 */
export const workflowInfluencerProfiles = mysqlTable("workflow_influencer_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Profile Identity
  displayName: varchar("displayName", { length: 140 }).notNull(),
  
  // Age Information (for policy enforcement)
  dateOfBirth: timestamp("dateOfBirth"),
  ageRange: mysqlEnum("ageRange", [
    "unknown",
    "10_12",
    "13_15",
    "16_17",
    "18_24",
    "25_34",
    "35_44",
    "45_plus"
  ]).default("unknown").notNull(),
  
  // Policy Flag
  isUnder10: boolean("isUnder10").default(false).notNull(),
  
  // Avatar
  avatarUrl: text("avatarUrl"),
  
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkflowInfluencerProfile = typeof workflowInfluencerProfiles.$inferSelect;
export type InsertWorkflowInfluencerProfile = typeof workflowInfluencerProfiles.$inferInsert;

/**
 * K'ah Chat Messages - Conversation history with K'ah AI assistant
 */
export const kahChatMessages = mysqlTable("kah_chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sessionId: int("sessionId"), // Optional FK to workflow_sessions.id
  
  // Message Content
  role: mysqlEnum("role", ["user", "assistant", "tool", "system"]).notNull(),
  content: text("content").notNull(),
  
  // Metadata (tool calls, citations, etc.)
  metadata: json("metadata").$type<{
    toolCalls?: Array<{
      name: string;
      arguments: Record<string, any>;
      result?: any;
    }>;
    citations?: string[];
    confidence?: number;
    suggestedActions?: string[];
  }>(),
  
  // Context
  contextType: mysqlEnum("contextType", [
    "general",
    "script_help",
    "video_help",
    "marketing_advice",
    "platform_guidance",
    "troubleshooting"
  ]).default("general").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type KahChatMessage = typeof kahChatMessages.$inferSelect;
export type InsertKahChatMessage = typeof kahChatMessages.$inferInsert;

/**
 * AAO Deployments - Campaign asset deployments from AAO workflow
 */
export const aaoDeployments = mysqlTable("aao_deployments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sessionId: int("sessionId").notNull(), // FK to workflow_sessions.id
  
  // Asset Reference
  videoAssetId: int("videoAssetId"), // FK to workflow_media_assets.id
  scriptId: int("scriptId"), // FK to workflow_scripts.id
  
  // Deployment Configuration
  destination: mysqlEnum("destination", [
    "publish_track",
    "download_only",
    "draft",
    "schedule"
  ]).notNull(),
  
  // Scheduling
  scheduledFor: timestamp("scheduledFor"),
  
  // Target Platforms
  targetPlatforms: json("targetPlatforms").$type<Array<{
    platform: string;
    accountId?: number;
    status: string;
    publishedAt?: string;
    postUrl?: string;
  }>>(),
  
  // Status
  status: mysqlEnum("status", [
    "queued",
    "processing",
    "published",
    "failed",
    "cancelled"
  ]).default("queued").notNull(),
  
  // Notes
  notes: text("notes"),
  
  // Results
  publishResults: json("publishResults").$type<Record<string, any>>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AaoDeployment = typeof aaoDeployments.$inferSelect;
export type InsertAaoDeployment = typeof aaoDeployments.$inferInsert;

/**
 * Workflow Audit Logs - Detailed audit trail for workflow actions
 */
export const workflowAuditLogs = mysqlTable("workflow_audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Action Details
  action: varchar("action", { length: 120 }).notNull(),
  entityType: varchar("entityType", { length: 80 }).notNull(),
  entityId: int("entityId"),
  
  // Context
  sessionId: int("sessionId"),
  
  // Details
  details: json("details").$type<Record<string, any>>().notNull(),
  
  // Request Context
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkflowAuditLog = typeof workflowAuditLogs.$inferSelect;
export type InsertWorkflowAuditLog = typeof workflowAuditLogs.$inferInsert;


// ============================================
// Phase 51 - BYOK AI Provider Integration
// ============================================

/**
 * AI Providers - Supported AI service providers for video/image generation
 */
export const aiProviders = mysqlTable("ai_providers", {
  id: int("id").autoincrement().primaryKey(),
  
  // Provider Identity
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  description: text("description"),
  
  // Provider Type
  providerType: mysqlEnum("providerType", [
    "video_generation",
    "image_generation",
    "audio_generation",
    "text_generation",
    "multi_modal"
  ]).notNull(),
  
  // Branding
  logoUrl: text("logoUrl"),
  websiteUrl: text("websiteUrl"),
  docsUrl: text("docsUrl"),
  
  // Configuration
  baseApiUrl: text("baseApiUrl"),
  authType: mysqlEnum("authType", ["api_key", "oauth2", "bearer_token"]).default("api_key").notNull(),
  
  // Capabilities
  capabilities: json("capabilities").$type<{
    textToVideo?: boolean;
    imageToVideo?: boolean;
    textToImage?: boolean;
    imageToImage?: boolean;
    lipSync?: boolean;
    voiceCloning?: boolean;
    characterConsistency?: boolean;
    maxDurationSeconds?: number;
    supportedAspectRatios?: string[];
    supportedResolutions?: string[];
  }>(),
  
  // Pricing Info (for display purposes)
  pricingModel: mysqlEnum("pricingModel", ["per_second", "per_generation", "per_token", "subscription", "credits"]).default("per_generation").notNull(),
  estimatedCostPerUnit: int("estimatedCostPerUnit").default(0).notNull(), // in cents
  costUnit: varchar("costUnit", { length: 50 }).default("generation").notNull(),
  
  // Status
  isBuiltIn: boolean("isBuiltIn").default(false).notNull(), // Manus built-in provider
  isActive: boolean("isActive").default(true).notNull(),
  isPremium: boolean("isPremium").default(false).notNull(), // Requires paid plan
  
  // Rate Limits (default)
  defaultRateLimit: int("defaultRateLimit").default(60).notNull(), // requests per minute
  defaultDailyLimit: int("defaultDailyLimit").default(1000).notNull(), // requests per day
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiProvider = typeof aiProviders.$inferSelect;
export type InsertAiProvider = typeof aiProviders.$inferInsert;

/**
 * User AI Credentials - BYOK API keys for AI providers
 */
export const userAiCredentials = mysqlTable("user_ai_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  providerId: int("providerId").notNull(), // FK to ai_providers.id
  
  // Credential Storage (encrypted)
  encryptedApiKey: text("encryptedApiKey").notNull(),
  keyHint: varchar("keyHint", { length: 20 }), // Last 4 chars for display
  
  // Validation Status
  isValid: boolean("isValid").default(false).notNull(),
  lastValidatedAt: timestamp("lastValidatedAt"),
  validationError: text("validationError"),
  
  // Usage Tracking
  totalRequests: int("totalRequests").default(0).notNull(),
  totalCreditsUsed: int("totalCreditsUsed").default(0).notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  
  // Rate Limit Overrides
  customRateLimit: int("customRateLimit"),
  customDailyLimit: int("customDailyLimit"),
  
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(), // Primary provider for this type
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserAiCredential = typeof userAiCredentials.$inferSelect;
export type InsertUserAiCredential = typeof userAiCredentials.$inferInsert;

/**
 * AI Usage Logs - Track API usage per provider
 */
export const aiUsageLogs = mysqlTable("ai_usage_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  credentialId: int("credentialId").notNull(), // FK to user_ai_credentials.id
  providerId: int("providerId").notNull(), // FK to ai_providers.id
  
  // Job Reference
  jobId: int("jobId"), // FK to workflow_generation_jobs.id
  jobKind: mysqlEnum("jobKind", ["image", "video", "audio", "text"]).notNull(),
  
  // Operation Details
  operation: varchar("operation", { length: 100 }).notNull(), // e.g., "text_to_video", "image_to_video"
  modelId: varchar("modelId", { length: 100 }), // Specific model used
  
  // Input/Output
  inputTokens: int("inputTokens").default(0).notNull(),
  outputTokens: int("outputTokens").default(0).notNull(),
  durationSeconds: int("durationSeconds").default(0).notNull(),
  
  // Cost Tracking
  creditsUsed: int("creditsUsed").default(0).notNull(),
  estimatedCostCents: int("estimatedCostCents").default(0).notNull(),
  
  // Status
  status: mysqlEnum("status", ["pending", "success", "failed", "rate_limited"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  
  // Response Metadata
  responseMetadata: json("responseMetadata").$type<{
    requestId?: string;
    latencyMs?: number;
    modelVersion?: string;
    outputUrl?: string;
  }>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiUsageLog = typeof aiUsageLogs.$inferSelect;
export type InsertAiUsageLog = typeof aiUsageLogs.$inferInsert;

/**
 * Provider Rate Limits - Track rate limit state per user/provider
 */
export const providerRateLimits = mysqlTable("provider_rate_limits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  providerId: int("providerId").notNull(), // FK to ai_providers.id
  
  // Current Window
  windowStart: timestamp("windowStart").notNull(),
  requestCount: int("requestCount").default(0).notNull(),
  
  // Daily Tracking
  dailyDate: timestamp("dailyDate").notNull(),
  dailyRequestCount: int("dailyRequestCount").default(0).notNull(),
  
  // Limits
  minuteLimit: int("minuteLimit").notNull(),
  dailyLimit: int("dailyLimit").notNull(),
  
  // Cooldown (if rate limited)
  cooldownUntil: timestamp("cooldownUntil"),
  
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProviderRateLimit = typeof providerRateLimits.$inferSelect;
export type InsertProviderRateLimit = typeof providerRateLimits.$inferInsert;

/**
 * AI Provider Tiers - Different service tiers for providers
 */
export const aiProviderTiers = mysqlTable("ai_provider_tiers", {
  id: int("id").autoincrement().primaryKey(),
  providerId: int("providerId").notNull(), // FK to ai_providers.id
  
  // Tier Identity
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull(),
  
  // Limits
  requestsPerMinute: int("requestsPerMinute").notNull(),
  requestsPerDay: int("requestsPerDay").notNull(),
  maxConcurrent: int("maxConcurrent").default(1).notNull(),
  
  // Features
  features: json("features").$type<{
    priorityQueue?: boolean;
    extendedDuration?: boolean;
    highResolution?: boolean;
    customModels?: boolean;
  }>(),
  
  // Pricing
  monthlyPriceCents: int("monthlyPriceCents").default(0).notNull(),
  
  // Status
  isDefault: boolean("isDefault").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiProviderTier = typeof aiProviderTiers.$inferSelect;
export type InsertAiProviderTier = typeof aiProviderTiers.$inferInsert;


// ============================================================
// Canonical Workflow Tables (Phase 55)
// ============================================================

/**
 * Canonical media objects table — single source of truth for all uploaded/generated media.
 * Workspace-scoped. Replaces transient client-side gallery state.
 */
export const mediaObjects = mysqlTable("media_objects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** kind: image | video | audio */
  kind: mysqlEnum("kind", ["image", "video", "audio"]).notNull(),
  /** purpose: influencer_source | generated_image | generated_video | upload | music | reference | hero */
  purpose: varchar("purpose", { length: 64 }).notNull(),
  /** S3 object key */
  objectKey: varchar("objectKey", { length: 512 }).notNull(),
  /** MIME content type */
  contentType: varchar("contentType", { length: 128 }).notNull(),
  /** File size in bytes */
  bytes: bigint("bytes", { mode: "number" }).default(0).notNull(),
  /** Image/video width */
  width: int("width"),
  /** Image/video height */
  height: int("height"),
  /** Video/audio duration in seconds */
  durationSec: int("durationSec"),
  /** SHA-256 hash for dedup */
  sha256: varchar("sha256", { length: 64 }),
  /** Public URL after upload (cached) */
  url: text("url"),
  /** Original filename */
  originalName: varchar("originalName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MediaObject = typeof mediaObjects.$inferSelect;
export type InsertMediaObject = typeof mediaObjects.$inferInsert;

/**
 * Link training images to an influencer (1 required, 2-3 recommended).
 */
export const influencerImages = mysqlTable("influencer_images", {
  id: int("id").autoincrement().primaryKey(),
  influencerId: int("influencerId").notNull(),
  mediaId: int("mediaId").notNull(),
  /** role: training | reference | hero */
  role: varchar("role", { length: 32 }).default("training").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InfluencerImage = typeof influencerImages.$inferSelect;
export type InsertInfluencerImage = typeof influencerImages.$inferInsert;

/**
 * Canonical video generation jobs (v2) — workspace-scoped, batch-capable, provider-aware.
 */
export const videoGenJobsV2 = mysqlTable("video_gen_jobs_v2", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  influencerId: int("influencerId"),
  /** Script ID from video_scripts table (optional) */
  scriptId: int("scriptId"),
  /** Raw script text (always stored for audit) */
  scriptText: text("scriptText"),
  /** Provider: local | sora | runway | pika | replicate */
  provider: varchar("provider", { length: 64 }).default("local").notNull(),
  /** Job status: queued | running | succeeded | failed */
  status: mysqlEnum("status", ["queued", "running", "succeeded", "failed"]).default("queued").notNull(),
  /** Progress 0-100 */
  progress: int("progress").default(0).notNull(),
  /** Error message if failed */
  error: text("error"),
  /** FK to media_objects for output video */
  outputMediaId: int("outputMediaId"),
  /** Batch group ID for batch generation */
  batchGroupId: varchar("batchGroupId", { length: 64 }),
  /** Background music media ID */
  bgMusicMediaId: int("bgMusicMediaId"),
  /** Lip-sync enabled */
  lipSync: boolean("lipSync").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VideoGenJobV2 = typeof videoGenJobsV2.$inferSelect;
export type InsertVideoGenJobV2 = typeof videoGenJobsV2.$inferInsert;


// ============================================================
// Phase A: Production-Grade Asset & Editing Tables
// ============================================================

export const assetLibrary = mysqlTable("asset_library", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orgId: int("orgId"),
  brandId: int("brandId"),
  influencerId: int("influencerId"),
  campaignId: int("campaignId"),
  type: mysqlEnum("type", ["image", "video", "audio", "document"]).notNull(),
  url: text("url").notNull(),
  thumbUrl: text("thumbUrl"),
  prompt: text("prompt"),
  negativePrompt: text("negativePrompt"),
  modelId: varchar("modelId", { length: 128 }),
  seed: bigint("seed", { mode: "number" }),
  aspectRatio: varchar("aspectRatio", { length: 16 }),
  width: int("width"),
  height: int("height"),
  fileSize: int("fileSize"),
  mimeType: varchar("mimeType", { length: 128 }),
  tags: json("tags").$type<string[]>(),
  folder: varchar("folder", { length: 255 }),
  stylePreset: varchar("stylePreset", { length: 64 }),
  steps: int("steps"),
  guidanceScale: decimal("guidanceScale", { precision: 5, scale: 2 }),
  isFavorite: boolean("isFavorite").default(false).notNull(),
  isArchived: boolean("isArchived").default(false).notNull(),
  objectKey: varchar("objectKey", { length: 512 }),
  source: mysqlEnum("source", ["generated", "uploaded", "edited", "imported"]).default("generated").notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AssetLibraryItem = typeof assetLibrary.$inferSelect;
export type InsertAssetLibraryItem = typeof assetLibrary.$inferInsert;

export const assetVersions = mysqlTable("asset_versions", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("assetId").notNull(),
  parentVersionId: int("parentVersionId"),
  versionNumber: int("versionNumber").default(1).notNull(),
  operation: varchar("operation", { length: 64 }).notNull(),
  params: json("params"),
  prompt: text("prompt"),
  modelId: varchar("modelId", { length: 128 }),
  url: text("url").notNull(),
  thumbUrl: text("thumbUrl"),
  objectKey: varchar("objectKey", { length: 512 }),
  width: int("width"),
  height: int("height"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AssetVersion = typeof assetVersions.$inferSelect;
export type InsertAssetVersion = typeof assetVersions.$inferInsert;

export const editSessions = mysqlTable("edit_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  assetId: int("assetId").notNull(),
  chatHistory: json("chatHistory").$type<Array<{ role: string; content: string; timestamp: number }>>(),
  lastAction: varchar("lastAction", { length: 128 }),
  currentVersionId: int("currentVersionId"),
  status: mysqlEnum("status", ["active", "completed", "abandoned"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EditSession = typeof editSessions.$inferSelect;

export const modelRegistry = mysqlTable("model_registry", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId"),
  type: mysqlEnum("type", ["image_gen", "video_gen", "face", "character", "style", "object", "voice"]).notNull(),
  provider: varchar("provider", { length: 64 }).notNull(),
  providerModelId: varchar("providerModelId", { length: 255 }),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  capabilities: json("capabilities").$type<string[]>(),
  previewUrl: text("previewUrl"),
  status: mysqlEnum("status", ["active", "training", "deprecated", "failed"]).default("active").notNull(),
  isBuiltIn: boolean("isBuiltIn").default(false).notNull(),
  defaultPresets: json("defaultPresets"),
  supportedAspectRatios: json("supportedAspectRatios").$type<string[]>(),
  maxWidth: int("maxWidth"),
  maxHeight: int("maxHeight"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ModelRegistryItem = typeof modelRegistry.$inferSelect;

export const modelTrainingJobs = mysqlTable("model_training_jobs", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId"),
  userId: int("userId").notNull(),
  modelType: mysqlEnum("modelType", ["face", "character", "style", "object"]).notNull(),
  modelName: varchar("modelName", { length: 128 }).notNull(),
  modelDescription: text("modelDescription"),
  status: mysqlEnum("status", ["queued", "validating", "training", "succeeded", "failed"]).default("queued").notNull(),
  progress: int("progress").default(0).notNull(),
  inputImageIds: json("inputImageIds").$type<number[]>(),
  inputImageCount: int("inputImageCount").default(0).notNull(),
  outputModelId: int("outputModelId"),
  logs: json("logs").$type<Array<{ timestamp: number; message: string; level: string }>>(),
  config: json("config"),
  creditsUsed: int("creditsUsed").default(0).notNull(),
  error: text("error"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ModelTrainingJob = typeof modelTrainingJobs.$inferSelect;

export const bulkJobs = mysqlTable("bulk_jobs", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId"),
  userId: int("userId").notNull(),
  jobType: varchar("jobType", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["queued", "running", "paused", "completed", "failed", "cancelled"]).default("queued").notNull(),
  total: int("total").default(0).notNull(),
  completed: int("completed").default(0).notNull(),
  failed: int("failed").default(0).notNull(),
  config: json("config"),
  promptTemplate: text("promptTemplate"),
  variables: json("variables"),
  outputAssetIds: json("outputAssetIds").$type<number[]>(),
  errorLog: json("errorLog").$type<Array<{ index: number; error: string }>>(),
  creditsUsed: int("creditsUsed").default(0).notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BulkJob = typeof bulkJobs.$inferSelect;

export const stylePresets = mysqlTable("style_presets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  orgId: int("orgId"),
  name: varchar("name", { length: 128 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  description: text("description"),
  promptPrefix: text("promptPrefix"),
  promptSuffix: text("promptSuffix"),
  negativePrompt: text("negativePrompt"),
  modelId: varchar("modelId", { length: 128 }),
  steps: int("steps"),
  guidanceScale: decimal("guidanceScale", { precision: 5, scale: 2 }),
  previewUrl: text("previewUrl"),
  isSystem: boolean("isSystem").default(false).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StylePreset = typeof stylePresets.$inferSelect;

export const promptHistory = mysqlTable("prompt_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  prompt: text("prompt").notNull(),
  negativePrompt: text("negativePrompt"),
  modelId: varchar("modelId", { length: 128 }),
  stylePreset: varchar("stylePreset", { length: 64 }),
  resultCount: int("resultCount").default(0).notNull(),
  isFavorite: boolean("isFavorite").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PromptHistoryItem = typeof promptHistory.$inferSelect;

export const storyProjects = mysqlTable("story_projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orgId: int("orgId"),
  brandId: int("brandId"),
  name: varchar("name", { length: 255 }).notNull(),
  templateType: varchar("templateType", { length: 64 }),
  description: text("description"),
  status: mysqlEnum("status", ["draft", "in_progress", "completed", "published"]).default("draft").notNull(),
  scenes: json("scenes").$type<Array<{
    id: string;
    order: number;
    prompt: string;
    influencerId?: number;
    duration?: number;
    transition?: string;
    voiceover?: string;
    assetId?: number;
    status: string;
  }>>(),
  outputAssetId: int("outputAssetId"),
  totalDuration: int("totalDuration"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StoryProject = typeof storyProjects.$inferSelect;
