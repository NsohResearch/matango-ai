CREATE TABLE `aao_activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`influencerId` int,
	`activityType` enum('content_generation','content_publishing','engagement_response','analytics_processing','lead_capture','campaign_optimization','brand_brain_update','video_rendering','image_generation','scheduling','other') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`metadata` json,
	`status` enum('started','in_progress','completed','failed') NOT NULL DEFAULT 'started',
	`errorMessage` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`durationMs` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aao_activity_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aao_daily_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` timestamp NOT NULL,
	`contentGenerated` int NOT NULL DEFAULT 0,
	`contentPublished` int NOT NULL DEFAULT 0,
	`engagementsHandled` int NOT NULL DEFAULT 0,
	`leadsCapture` int NOT NULL DEFAULT 0,
	`analyticsProcessed` int NOT NULL DEFAULT 0,
	`videosRendered` int NOT NULL DEFAULT 0,
	`imagesGenerated` int NOT NULL DEFAULT 0,
	`totalActiveMinutes` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aao_daily_stats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aao_deployments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` int NOT NULL,
	`videoAssetId` int,
	`scriptId` int,
	`destination` enum('publish_track','download_only','draft','schedule') NOT NULL,
	`scheduledFor` timestamp,
	`targetPlatforms` json,
	`status` enum('queued','processing','published','failed','cancelled') NOT NULL DEFAULT 'queued',
	`notes` text,
	`publishResults` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aao_deployments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ab_test_variants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`abTestId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`isControl` boolean NOT NULL DEFAULT false,
	`content` json,
	`trafficPercentage` int NOT NULL DEFAULT 50,
	`impressions` int NOT NULL DEFAULT 0,
	`clicks` int NOT NULL DEFAULT 0,
	`conversions` int NOT NULL DEFAULT 0,
	`engagements` int NOT NULL DEFAULT 0,
	`conversionRate` int NOT NULL DEFAULT 0,
	`engagementRate` int NOT NULL DEFAULT 0,
	`isWinner` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ab_test_variants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ab_tests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`influencerId` int,
	`campaignId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`testType` enum('caption','image','cta','timing','audience') NOT NULL,
	`status` enum('draft','running','paused','completed','archived') NOT NULL DEFAULT 'draft',
	`trafficSplit` json,
	`targetMetric` enum('engagement','clicks','conversions','reach','impressions') NOT NULL DEFAULT 'engagement',
	`confidenceLevel` int NOT NULL DEFAULT 95,
	`minSampleSize` int NOT NULL DEFAULT 100,
	`startDate` timestamp,
	`endDate` timestamp,
	`winnerVariantId` int,
	`autoOptimize` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ab_tests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `account_deletion_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','confirmed','cancelled','expired') NOT NULL DEFAULT 'pending',
	`typedPhraseOk` boolean NOT NULL DEFAULT false,
	`emailMatchOk` boolean NOT NULL DEFAULT false,
	`reauthOk` boolean NOT NULL DEFAULT false,
	`mfaOk` boolean NOT NULL DEFAULT false,
	`acknowledgedConsequences` boolean NOT NULL DEFAULT false,
	`acknowledged90DayRecovery` boolean NOT NULL DEFAULT false,
	`acknowledged12MonthRetention` boolean NOT NULL DEFAULT false,
	`confirmationMethod` enum('password','oauth_reauth','mfa'),
	`alternativeChosen` enum('none','pause_billing_30d','pause_billing_60d','pause_billing_90d','downgrade_plan','deactivate_account') NOT NULL DEFAULT 'none',
	`expiresAt` timestamp NOT NULL,
	`confirmedAt` timestamp,
	`cancelledAt` timestamp,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `account_deletion_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `account_lifecycle_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int,
	`action` enum('account_created','account_activated','account_deactivated','account_suspended','account_unsuspended','billing_paused','billing_resumed','plan_downgraded','plan_upgraded','deletion_requested','deletion_confirmed','deletion_cancelled','soft_deleted','restored_from_soft_delete','moved_to_retention','restored_from_retention','hard_deleted') NOT NULL,
	`fromStatus` enum('ACTIVE','DEACTIVATED','SUSPENDED','SOFT_DELETED_90D','RETENTION_12M','HARD_DELETED'),
	`toStatus` enum('ACTIVE','DEACTIVATED','SUSPENDED','SOFT_DELETED_90D','RETENTION_12M','HARD_DELETED'),
	`triggeredBy` enum('user','admin','system','support') NOT NULL,
	`triggeredByUserId` int,
	`reason` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`deviceFingerprint` varchar(255),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `account_lifecycle_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminUserId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`targetType` varchar(50),
	`targetId` int,
	`metadata` json,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`description` text,
	`permissions` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_roles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `admin_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`roleId` int NOT NULL,
	`mfaEnabled` boolean NOT NULL DEFAULT false,
	`mfaSecret` varchar(255),
	`status` enum('active','suspended','pending') NOT NULL DEFAULT 'pending',
	`lastLoginAt` timestamp,
	`lastLoginIp` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_users_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `ai_provider_tiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(50) NOT NULL,
	`requestsPerMinute` int NOT NULL,
	`requestsPerDay` int NOT NULL,
	`maxConcurrent` int NOT NULL DEFAULT 1,
	`features` json,
	`monthlyPriceCents` int NOT NULL DEFAULT 0,
	`isDefault` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_provider_tiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_providers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(50) NOT NULL,
	`description` text,
	`providerType` enum('video_generation','image_generation','audio_generation','text_generation','multi_modal') NOT NULL,
	`logoUrl` text,
	`websiteUrl` text,
	`docsUrl` text,
	`baseApiUrl` text,
	`authType` enum('api_key','oauth2','bearer_token') NOT NULL DEFAULT 'api_key',
	`capabilities` json,
	`pricingModel` enum('per_second','per_generation','per_token','subscription','credits') NOT NULL DEFAULT 'per_generation',
	`estimatedCostPerUnit` int NOT NULL DEFAULT 0,
	`costUnit` varchar(50) NOT NULL DEFAULT 'generation',
	`isBuiltIn` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`isPremium` boolean NOT NULL DEFAULT false,
	`defaultRateLimit` int NOT NULL DEFAULT 60,
	`defaultDailyLimit` int NOT NULL DEFAULT 1000,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_providers_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_providers_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `ai_usage_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`credentialId` int NOT NULL,
	`providerId` int NOT NULL,
	`jobId` int,
	`jobKind` enum('image','video','audio','text') NOT NULL,
	`operation` varchar(100) NOT NULL,
	`modelId` varchar(100),
	`inputTokens` int NOT NULL DEFAULT 0,
	`outputTokens` int NOT NULL DEFAULT 0,
	`durationSeconds` int NOT NULL DEFAULT 0,
	`creditsUsed` int NOT NULL DEFAULT 0,
	`estimatedCostCents` int NOT NULL DEFAULT 0,
	`status` enum('pending','success','failed','rate_limited') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`responseMetadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_usage_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analytics_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`influencerId` int NOT NULL,
	`date` timestamp NOT NULL,
	`followers` int NOT NULL DEFAULT 0,
	`followersGain` int NOT NULL DEFAULT 0,
	`likes` int NOT NULL DEFAULT 0,
	`views` int NOT NULL DEFAULT 0,
	`engagementRate` int NOT NULL DEFAULT 0,
	`postsCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analytics_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int,
	`assetId` int,
	`eventType` enum('impression','click','engagement','conversion','lead','booked_call') NOT NULL,
	`source` varchar(100),
	`platform` varchar(50),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auto_insights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`insightType` enum('winning_angle','underperforming_persona','channel_recommendation','hook_refresh','claim_revision','next_best_action') NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text NOT NULL,
	`actionable` text,
	`relatedCampaignId` int,
	`relatedPersonaId` int,
	`confidence` int NOT NULL DEFAULT 0,
	`isActioned` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auto_insights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `billing_pause_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pauseDuration` enum('30d','60d','90d') NOT NULL,
	`pauseStartDate` timestamp NOT NULL,
	`pauseEndDate` timestamp NOT NULL,
	`stripeSubscriptionId` varchar(255),
	`stripePauseCollectionBehavior` enum('keep_as_draft','mark_uncollectible','void') NOT NULL DEFAULT 'keep_as_draft',
	`status` enum('scheduled','active','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`reason` text,
	`resumedAt` timestamp,
	`cancelledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `billing_pause_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `business_dna` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`createdByUserId` int,
	`productName` varchar(200) NOT NULL,
	`brandName` varchar(200),
	`websiteUrl` text,
	`category` varchar(100),
	`tagline` text,
	`icpPersonas` json,
	`keyOutcomes` json,
	`differentiators` json,
	`claimsProofMapping` json,
	`objectionHandling` json,
	`brandTone` enum('authoritative','playful','contrarian','friendly','professional','casual') NOT NULL DEFAULT 'professional',
	`voiceRules` json,
	`forbiddenPhrases` json,
	`channelPriorities` json,
	`autoEnrichedData` json,
	`isComplete` boolean NOT NULL DEFAULT false,
	`completionScore` int NOT NULL DEFAULT 0,
	`brandStatus` enum('draft','active','archived') NOT NULL DEFAULT 'active',
	`tags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `business_dna_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`assetType` enum('linkedin_post','linkedin_carousel','x_thread','x_post','tiktok_script','ig_reel_script','landing_page','email_welcome','email_nurture','ad_meta','ad_linkedin','ad_google') NOT NULL,
	`content` text NOT NULL,
	`headline` text,
	`cta` text,
	`imageUrl` text,
	`videoUrl` text,
	`metadata` json,
	`status` enum('draft','approved','scheduled','published','paused') NOT NULL DEFAULT 'draft',
	`scheduledFor` timestamp,
	`publishedAt` timestamp,
	`utmSource` varchar(100),
	`utmMedium` varchar(100),
	`utmCampaign` varchar(100),
	`utmContent` varchar(100),
	`impressions` int NOT NULL DEFAULT 0,
	`clicks` int NOT NULL DEFAULT 0,
	`engagements` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_scenes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`sceneOrder` int NOT NULL,
	`prompt` text NOT NULL,
	`caption` text,
	`imageUrl` text,
	`platform` enum('instagram','tiktok','twitter','youtube'),
	`scheduledFor` timestamp,
	`status` enum('pending','generating','completed','published') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaign_scenes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`influencerId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`status` enum('draft','preview','generating','completed','scheduled') NOT NULL DEFAULT 'draft',
	`totalScenes` int NOT NULL DEFAULT 0,
	`completedScenes` int NOT NULL DEFAULT 0,
	`scheduledStartDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `character_training_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`personaId` int,
	`trainingImages` json NOT NULL,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`progress` int NOT NULL DEFAULT 0,
	`modelId` varchar(100),
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `character_training_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`influencerId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_workspaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`whiteLabelId` int NOT NULL,
	`organizationId` int NOT NULL,
	`clientName` varchar(100) NOT NULL,
	`clientEmail` varchar(320),
	`clientLogoUrl` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`accessToken` varchar(64),
	`lastAccessAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_workspaces_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `collaborators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`influencerId` int NOT NULL,
	`userId` int NOT NULL,
	`invitedByUserId` int NOT NULL,
	`role` enum('owner','editor','viewer') NOT NULL DEFAULT 'viewer',
	`status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
	`inviteEmail` varchar(320),
	`inviteToken` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`acceptedAt` timestamp,
	CONSTRAINT `collaborators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`name` varchar(100) NOT NULL,
	`description` text,
	`category` enum('product','lifestyle','fashion','fitness','travel','food','beauty','tech','custom') NOT NULL,
	`promptTemplate` text NOT NULL,
	`stylePreset` enum('realistic','anime','artistic','3d') NOT NULL DEFAULT 'realistic',
	`characterWeight` int NOT NULL DEFAULT 80,
	`keepOutfit` boolean NOT NULL DEFAULT false,
	`isPublic` boolean NOT NULL DEFAULT false,
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creator_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`assetType` enum('image','video','audio','font','template') NOT NULL,
	`url` text NOT NULL,
	`thumbnailUrl` text,
	`fileSize` int,
	`mimeType` varchar(100),
	`duration` int,
	`width` int,
	`height` int,
	`category` varchar(100),
	`tags` json,
	`isFavorite` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creator_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creator_avatars` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`avatarType` enum('ai_generated','uploaded','stock','custom') NOT NULL DEFAULT 'ai_generated',
	`imageUrl` text NOT NULL,
	`thumbnailUrl` text,
	`videoUrl` text,
	`style` enum('realistic','cartoon','anime','3d','illustrated') NOT NULL DEFAULT 'realistic',
	`gender` enum('male','female','neutral'),
	`lipSyncModelId` varchar(255),
	`tags` json,
	`isFavorite` boolean NOT NULL DEFAULT false,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creator_avatars_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creator_export_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int NOT NULL,
	`format` enum('mp4','webm','mov','gif') NOT NULL DEFAULT 'mp4',
	`resolution` enum('720p','1080p','4k') NOT NULL DEFAULT '1080p',
	`quality` enum('draft','standard','high','ultra') NOT NULL DEFAULT 'standard',
	`frameRate` int NOT NULL DEFAULT 30,
	`status` enum('queued','processing','completed','failed','cancelled') NOT NULL DEFAULT 'queued',
	`progress` int NOT NULL DEFAULT 0,
	`outputUrl` text,
	`thumbnailUrl` text,
	`fileSize` int,
	`duration` int,
	`errorMessage` text,
	`retryCount` int NOT NULL DEFAULT 0,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creator_export_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creator_folders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`parentId` int,
	`name` varchar(255) NOT NULL,
	`color` varchar(7),
	`icon` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creator_folders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creator_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`folderId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`thumbnailUrl` text,
	`aspectRatio` enum('16:9','9:16','1:1','4:5') NOT NULL DEFAULT '16:9',
	`resolution` enum('720p','1080p','4k') NOT NULL DEFAULT '1080p',
	`frameRate` int NOT NULL DEFAULT 30,
	`totalDuration` int NOT NULL DEFAULT 0,
	`status` enum('draft','editing','rendering','completed','archived') NOT NULL DEFAULT 'draft',
	`tags` json,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creator_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creator_scene_elements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sceneId` int NOT NULL,
	`elementType` enum('text','image','shape','video','audio','sticker') NOT NULL,
	`x` int NOT NULL DEFAULT 0,
	`y` int NOT NULL DEFAULT 0,
	`width` int NOT NULL DEFAULT 100,
	`height` int NOT NULL DEFAULT 100,
	`rotation` int NOT NULL DEFAULT 0,
	`zIndex` int NOT NULL DEFAULT 0,
	`content` text,
	`style` json,
	`animation` json,
	`startTime` int NOT NULL DEFAULT 0,
	`endTime` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creator_scene_elements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creator_scenes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`title` varchar(255),
	`order` int NOT NULL,
	`duration` int NOT NULL DEFAULT 5000,
	`backgroundType` enum('color','image','video','gradient') NOT NULL DEFAULT 'color',
	`backgroundValue` text,
	`avatarId` int,
	`avatarPosition` json,
	`script` text,
	`voiceId` int,
	`audioUrl` text,
	`transitionType` enum('none','fade','dissolve','slide_left','slide_right','zoom') NOT NULL DEFAULT 'fade',
	`transitionDuration` int NOT NULL DEFAULT 500,
	`animation` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creator_scenes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creator_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`thumbnailUrl` text,
	`category` enum('product_demo','social_ad','explainer','testimonial','tutorial','announcement','promo','story','custom') NOT NULL DEFAULT 'custom',
	`templateData` json,
	`sceneCount` int NOT NULL DEFAULT 1,
	`duration` int NOT NULL DEFAULT 0,
	`tags` json,
	`isSystem` boolean NOT NULL DEFAULT false,
	`isPremium` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creator_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creator_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`periodMonth` varchar(7) NOT NULL,
	`projectsCreated` int NOT NULL DEFAULT 0,
	`scenesCreated` int NOT NULL DEFAULT 0,
	`exportsCompleted` int NOT NULL DEFAULT 0,
	`storageUsedMb` int NOT NULL DEFAULT 0,
	`renderMinutesUsed` int NOT NULL DEFAULT 0,
	`aiGenerationsUsed` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creator_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creator_voices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`provider` enum('elevenlabs','openai','azure','google','custom') NOT NULL DEFAULT 'elevenlabs',
	`providerId` varchar(255) NOT NULL,
	`gender` enum('male','female','neutral') NOT NULL DEFAULT 'neutral',
	`language` varchar(10) NOT NULL DEFAULT 'en',
	`accent` varchar(50),
	`style` enum('professional','casual','energetic','calm','narrative','conversational') NOT NULL DEFAULT 'professional',
	`previewUrl` text,
	`isSystem` boolean NOT NULL DEFAULT false,
	`isPremium` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creator_voices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `custom_email_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`whiteLabelId` int NOT NULL,
	`templateType` enum('welcome','password_reset','team_invite','post_published','milestone','weekly_report','payment_receipt','subscription_renewal') NOT NULL,
	`subject` varchar(255) NOT NULL,
	`htmlContent` text NOT NULL,
	`textContent` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_email_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `data_export_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`requestType` enum('export','delete') NOT NULL,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`downloadUrl` text,
	`expiresAt` timestamp,
	`processedBy` int,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `data_export_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_sequence_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sequenceId` int NOT NULL,
	`stepOrder` int NOT NULL,
	`delayDays` int NOT NULL DEFAULT 0,
	`subject` varchar(200) NOT NULL,
	`preheader` varchar(200),
	`body` text NOT NULL,
	`ctaText` varchar(100),
	`ctaUrl` text,
	`sent` int NOT NULL DEFAULT 0,
	`opened` int NOT NULL DEFAULT 0,
	`clicked` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_sequence_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_sequences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int,
	`name` varchar(200) NOT NULL,
	`sequenceType` enum('welcome','nurture','onboarding','re_engagement') NOT NULL DEFAULT 'welcome',
	`isActive` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_sequences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feature_flag_overrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`featureFlagId` int NOT NULL,
	`userId` int NOT NULL,
	`state` boolean NOT NULL,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feature_flag_overrides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feature_flags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`defaultState` boolean NOT NULL DEFAULT false,
	`rules` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `feature_flags_id` PRIMARY KEY(`id`),
	CONSTRAINT `feature_flags_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `impersonation_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminUserId` int NOT NULL,
	`targetUserId` int NOT NULL,
	`justification` text NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `impersonation_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `influencer_content` (
	`id` int AUTO_INCREMENT NOT NULL,
	`influencerId` int NOT NULL,
	`imageUrl` text NOT NULL,
	`prompt` text,
	`contentType` enum('avatar','post','story') NOT NULL DEFAULT 'post',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `influencer_content_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `influencer_generations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`influencerId` int NOT NULL,
	`prompt` text NOT NULL,
	`negativePrompt` text,
	`aspectRatio` enum('1:1','4:3','3:4','16:9','9:16','21:9','3:2','2:3') NOT NULL DEFAULT '1:1',
	`resolution` enum('512','768','1024','1536','2048') NOT NULL DEFAULT '1024',
	`stylePreset` varchar(100),
	`seed` int,
	`guidanceScale` decimal(4,2) DEFAULT '7.50',
	`steps` int DEFAULT 30,
	`consistencyWeight` int DEFAULT 80,
	`keepOutfit` boolean DEFAULT false,
	`imageUrls` json,
	`thumbnailUrl` text,
	`status` enum('pending','generating','completed','failed') NOT NULL DEFAULT 'pending',
	`creditsUsed` int NOT NULL DEFAULT 1,
	`generationTime` int,
	`errorMessage` text,
	`isFavorite` boolean NOT NULL DEFAULT false,
	`isPublic` boolean NOT NULL DEFAULT false,
	`tags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `influencer_generations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `influencer_personas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`personaType` enum('founder','practitioner','analyst','custom') NOT NULL DEFAULT 'custom',
	`styleGuide` text,
	`vocabulary` json,
	`tabooList` json,
	`hookPatterns` json,
	`ctaPatterns` json,
	`avatarUrl` text,
	`referenceImages` json,
	`characterWeight` int NOT NULL DEFAULT 80,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `influencer_personas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `influencer_presets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`influencerId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`prompt` text,
	`negativePrompt` text,
	`aspectRatio` varchar(20),
	`resolution` varchar(20),
	`stylePreset` varchar(100),
	`consistencyWeight` int,
	`keepOutfit` boolean,
	`guidanceScale` decimal(4,2),
	`steps` int,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `influencer_presets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `influencer_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`influencerId` int NOT NULL,
	`characterWeight` int NOT NULL DEFAULT 80,
	`keepOutfit` boolean NOT NULL DEFAULT false,
	`defaultStyle` enum('realistic','anime','artistic','3d') NOT NULL DEFAULT 'realistic',
	`referenceImages` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `influencer_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `influencer_settings_influencerId_unique` UNIQUE(`influencerId`)
);
--> statement-breakpoint
CREATE TABLE `influencer_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` enum('lifestyle','fashion','fitness','tech','gaming','beauty','food','travel','business','entertainment','education','other') NOT NULL DEFAULT 'lifestyle',
	`thumbnailUrl` text NOT NULL,
	`previewImages` json,
	`gender` enum('male','female','non_binary','other'),
	`ageRange` enum('young_adult','adult','middle_aged','senior'),
	`stylePreset` varchar(100),
	`basePrompt` text,
	`modelId` varchar(255),
	`createdBy` varchar(100) NOT NULL DEFAULT 'Matango',
	`isPremium` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `influencer_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `influencer_training_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`influencerId` int,
	`name` varchar(255) NOT NULL,
	`creationMethod` enum('image_upload','text_prompt','template') NOT NULL,
	`status` enum('pending','uploading','processing','training','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`progress` int NOT NULL DEFAULT 0,
	`referenceImages` json,
	`textPrompt` text,
	`gender` enum('male','female','non_binary','other'),
	`ageRange` enum('young_adult','adult','middle_aged','senior'),
	`ethnicity` varchar(100),
	`bodyType` varchar(100),
	`hairStyle` varchar(100),
	`hairColor` varchar(50),
	`eyeColor` varchar(50),
	`skinTone` varchar(50),
	`facialFeatures` text,
	`distinctiveFeatures` text,
	`stylePreset` enum('photorealistic','anime','cartoon','3d_render','illustration','oil_painting','watercolor','pixel_art','comic_book','fashion','cinematic') DEFAULT 'photorealistic',
	`consistencyWeight` int NOT NULL DEFAULT 80,
	`keepOutfit` boolean NOT NULL DEFAULT false,
	`styleBias` int NOT NULL DEFAULT 50,
	`brandBrainId` int,
	`modelId` varchar(255),
	`trainingCreditsUsed` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `influencer_training_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `influencers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`age` int,
	`bio` text,
	`personality` text,
	`avatarUrl` text,
	`tags` json,
	`stats` json,
	`isPublic` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `influencers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `job_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobType` enum('image_generation','video_generation','post_publish','analytics_sync','email_send') NOT NULL,
	`userId` int,
	`status` enum('pending','processing','completed','failed','dead_letter') NOT NULL DEFAULT 'pending',
	`priority` int NOT NULL DEFAULT 5,
	`payload` json,
	`result` json,
	`errorMessage` text,
	`attempts` int NOT NULL DEFAULT 0,
	`maxAttempts` int NOT NULL DEFAULT 3,
	`scheduledFor` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `job_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kah_chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` int,
	`role` enum('user','assistant','tool','system') NOT NULL,
	`content` text NOT NULL,
	`metadata` json,
	`contextType` enum('general','script_help','video_help','marketing_advice','platform_guidance','troubleshooting') NOT NULL DEFAULT 'general',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kah_chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `landing_pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int,
	`name` varchar(200) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`headline` text NOT NULL,
	`subheadline` text,
	`bullets` json,
	`ctaText` varchar(100),
	`ctaUrl` text,
	`faq` json,
	`heroImageUrl` text,
	`templateId` varchar(50),
	`customCss` text,
	`isPublished` boolean NOT NULL DEFAULT false,
	`views` int NOT NULL DEFAULT 0,
	`conversions` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `landing_pages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`campaignId` int,
	`assetId` int,
	`email` varchar(320) NOT NULL,
	`name` varchar(200),
	`company` varchar(200),
	`role` varchar(100),
	`source` varchar(100),
	`utmSource` varchar(100),
	`utmMedium` varchar(100),
	`utmCampaign` varchar(100),
	`stage` enum('new','contacted','qualified','proposal','negotiation','won','lost') NOT NULL DEFAULT 'new',
	`notes` text,
	`lastContactedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','marketer','viewer') NOT NULL DEFAULT 'viewer',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `memberships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `moderation_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`contentType` enum('image','video','script','post','profile') NOT NULL,
	`contentId` int NOT NULL,
	`contentUrl` text,
	`reason` varchar(200) NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`status` enum('pending','approved','rejected','escalated') NOT NULL DEFAULT 'pending',
	`reviewerId` int,
	`reviewNotes` text,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `moderation_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `music_tracks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`artist` varchar(255),
	`genre` enum('ambient','corporate','upbeat','cinematic','electronic','acoustic','hip_hop','pop','rock','classical','jazz','other') NOT NULL DEFAULT 'ambient',
	`mood` enum('happy','energetic','calm','inspiring','dramatic','mysterious','romantic','sad','neutral') NOT NULL DEFAULT 'neutral',
	`url` text NOT NULL,
	`previewUrl` text,
	`duration` int NOT NULL,
	`bpm` int,
	`isPremium` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `music_tracks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`emailEnabled` boolean NOT NULL DEFAULT true,
	`scheduledPostPublished` boolean NOT NULL DEFAULT true,
	`followerMilestones` boolean NOT NULL DEFAULT true,
	`weeklyReport` boolean NOT NULL DEFAULT true,
	`teamInvitations` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_preferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('post_published','milestone','team_invite','weekly_report') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`emailSent` boolean NOT NULL DEFAULT false,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `oauth_health_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`platform` enum('instagram','tiktok','youtube','linkedin','twitter') NOT NULL,
	`eventType` enum('token_refresh_success','token_refresh_failure','api_error','rate_limit','connection_lost') NOT NULL,
	`details` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `oauth_health_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`logoUrl` text,
	`plan` enum('free','basic','agency','agency_plus') NOT NULL DEFAULT 'free',
	`assetsUsedThisMonth` int NOT NULL DEFAULT 0,
	`assetsLimit` int NOT NULL DEFAULT 20,
	`activeBrandId` int,
	`maxBrands` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `platform_announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`type` enum('info','warning','maintenance','feature') NOT NULL DEFAULT 'info',
	`targetPlans` json,
	`showBanner` boolean NOT NULL DEFAULT false,
	`sendEmail` boolean NOT NULL DEFAULT false,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `platform_announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `policy_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`type` enum('blocklist','allowlist','pattern','keyword') NOT NULL,
	`pattern` text NOT NULL,
	`action` enum('flag','block','warn','auto_reject') NOT NULL DEFAULT 'flag',
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `policy_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_collaborators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','editor','viewer') NOT NULL DEFAULT 'viewer',
	`canEdit` boolean NOT NULL DEFAULT false,
	`canDelete` boolean NOT NULL DEFAULT false,
	`canInvite` boolean NOT NULL DEFAULT false,
	`canExport` boolean NOT NULL DEFAULT true,
	`invitedBy` int,
	`invitedAt` timestamp,
	`acceptedAt` timestamp,
	`status` enum('pending','accepted','declined','removed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_collaborators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_presence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`isOnline` boolean NOT NULL DEFAULT true,
	`currentSceneId` int,
	`cursorPosition` json,
	`selectedElementId` int,
	`displayName` varchar(100),
	`avatarUrl` text,
	`cursorColor` varchar(7),
	`lastActiveAt` timestamp NOT NULL DEFAULT (now()),
	`sessionStartedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_presence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `provider_rate_limits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`providerId` int NOT NULL,
	`windowStart` timestamp NOT NULL,
	`requestCount` int NOT NULL DEFAULT 0,
	`dailyDate` timestamp NOT NULL,
	`dailyRequestCount` int NOT NULL DEFAULT 0,
	`minuteLimit` int NOT NULL,
	`dailyLimit` int NOT NULL,
	`cooldownUntil` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `provider_rate_limits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stripeSessionId` varchar(255),
	`stripePaymentIntentId` varchar(255),
	`plan` enum('starter','pro','lifetime') NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'usd',
	`status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`email` varchar(320) NOT NULL,
	`company` varchar(200) NOT NULL,
	`companySize` varchar(50),
	`phone` varchar(50),
	`message` text,
	`status` enum('new','contacted','qualified','converted','closed') NOT NULL DEFAULT 'new',
	`source` varchar(100) NOT NULL DEFAULT 'agency_plus_pricing',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`influencerId` int NOT NULL,
	`userId` int NOT NULL,
	`platform` enum('instagram','tiktok','twitter','youtube') NOT NULL,
	`contentUrl` text,
	`caption` text,
	`scheduledFor` timestamp NOT NULL,
	`status` enum('scheduled','published','failed','cancelled') NOT NULL DEFAULT 'scheduled',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`publishedAt` timestamp,
	CONSTRAINT `scheduled_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `social_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` enum('instagram','facebook','youtube','tiktok','linkedin') NOT NULL,
	`platformUserId` varchar(255),
	`platformUsername` varchar(255),
	`accessToken` text,
	`refreshToken` text,
	`tokenExpiresAt` timestamp,
	`scopes` json,
	`profilePictureUrl` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastSyncAt` timestamp,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `social_connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `social_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduledPostId` int,
	`socialConnectionId` int NOT NULL,
	`userId` int NOT NULL,
	`influencerId` int,
	`platform` enum('instagram','facebook','youtube','tiktok','linkedin') NOT NULL,
	`platformPostId` varchar(255),
	`postType` enum('image','video','carousel','story','reel','short') NOT NULL DEFAULT 'image',
	`caption` text,
	`mediaUrls` json,
	`status` enum('pending','publishing','published','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`publishedAt` timestamp,
	`metrics` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `social_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `support_ticket_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`senderId` int NOT NULL,
	`senderType` enum('user','admin','system') NOT NULL,
	`message` text NOT NULL,
	`attachments` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `support_ticket_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`assignedAdminId` int,
	`subject` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`category` enum('billing','technical','feature_request','bug_report','account','other') NOT NULL DEFAULT 'other',
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`status` enum('open','in_progress','waiting_customer','resolved','closed') NOT NULL DEFAULT 'open',
	`slaDeadline` timestamp,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `support_tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_influencers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`genderPresentation` varchar(50),
	`ageAppearance` varchar(50),
	`ethnicity` varchar(100),
	`aesthetic` text,
	`personaDescription` text,
	`voiceTraits` json,
	`behavioralConstraints` json,
	`cameraRules` json,
	`avatarUrl` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_influencers_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_influencers_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `template_marketplace_listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`sellerId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`longDescription` text,
	`previewVideoUrl` text,
	`thumbnailUrl` text,
	`screenshots` json,
	`pricingType` enum('free','paid','subscription') NOT NULL DEFAULT 'free',
	`price` int NOT NULL DEFAULT 0,
	`currency` varchar(3) NOT NULL DEFAULT 'usd',
	`category` enum('social_media','youtube','ads','tutorials','presentations','explainers','testimonials','promos','stories','other') NOT NULL DEFAULT 'other',
	`tags` json,
	`downloads` int NOT NULL DEFAULT 0,
	`rating` int NOT NULL DEFAULT 0,
	`reviewCount` int NOT NULL DEFAULT 0,
	`status` enum('draft','pending_review','approved','rejected','suspended') NOT NULL DEFAULT 'draft',
	`isFeatured` boolean NOT NULL DEFAULT false,
	`isVerified` boolean NOT NULL DEFAULT false,
	`rejectionReason` text,
	`approvedAt` timestamp,
	`approvedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `template_marketplace_listings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `template_purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`buyerId` int NOT NULL,
	`sellerId` int NOT NULL,
	`price` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'usd',
	`stripePaymentIntentId` varchar(255),
	`status` enum('pending','completed','refunded','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `template_purchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `template_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`userId` int NOT NULL,
	`rating` int NOT NULL,
	`title` varchar(255),
	`content` text,
	`isVerifiedPurchase` boolean NOT NULL DEFAULT false,
	`isHelpful` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `template_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_limits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`influencersLimit` int NOT NULL DEFAULT 1,
	`imagesPerMonth` int NOT NULL DEFAULT 3,
	`videosPerMonth` int NOT NULL DEFAULT 0,
	`brandsLimit` int NOT NULL DEFAULT 1,
	`customDomainsLimit` int NOT NULL DEFAULT 0,
	`teamMembersLimit` int NOT NULL DEFAULT 1,
	`storageGb` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_limits_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_limits_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `unified_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`businessDnaId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`angle` text NOT NULL,
	`angleRationale` text,
	`targetIcp` varchar(100),
	`status` enum('draft','generating','review','approved','scheduled','live','completed','paused') NOT NULL DEFAULT 'draft',
	`startDate` timestamp,
	`endDate` timestamp,
	`impressions` int NOT NULL DEFAULT 0,
	`clicks` int NOT NULL DEFAULT 0,
	`conversions` int NOT NULL DEFAULT 0,
	`leadsGenerated` int NOT NULL DEFAULT 0,
	`learnings` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `unified_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `usage_counters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`periodMonth` varchar(7) NOT NULL,
	`imagesGenerated` int NOT NULL DEFAULT 0,
	`videosGenerated` int NOT NULL DEFAULT 0,
	`postsPublished` int NOT NULL DEFAULT 0,
	`storageUsedMb` int NOT NULL DEFAULT 0,
	`apiCalls` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `usage_counters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_ai_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`providerId` int NOT NULL,
	`encryptedApiKey` text NOT NULL,
	`keyHint` varchar(20),
	`isValid` boolean NOT NULL DEFAULT false,
	`lastValidatedAt` timestamp,
	`validationError` text,
	`totalRequests` int NOT NULL DEFAULT 0,
	`totalCreditsUsed` int NOT NULL DEFAULT 0,
	`lastUsedAt` timestamp,
	`customRateLimit` int,
	`customDailyLimit` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_ai_credentials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin','super_admin') NOT NULL DEFAULT 'user',
	`credits` int NOT NULL DEFAULT 0,
	`plan` enum('free','starter','pro','lifetime','basic','agency','agency_plus') NOT NULL DEFAULT 'free',
	`tenantStatus` enum('active','suspended','read_only') NOT NULL DEFAULT 'active',
	`suspensionReason` text,
	`suspendedBy` int,
	`suspendedAt` timestamp,
	`accountStatus` enum('ACTIVE','DEACTIVATED','SUSPENDED','SOFT_DELETED_90D','RETENTION_12M','HARD_DELETED') NOT NULL DEFAULT 'ACTIVE',
	`deletedAt` timestamp,
	`deletedBy` int,
	`deletionReason` text,
	`recoveryDeadline` timestamp,
	`retentionUntil` timestamp,
	`hardDeletedAt` timestamp,
	`onboardingCompleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `video_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orgId` int,
	`brandId` int,
	`influencerId` int,
	`campaignId` int,
	`videoJobId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`url` text NOT NULL,
	`thumbnailUrl` text,
	`duration` int NOT NULL,
	`resolution` varchar(20),
	`aspectRatio` enum('16:9','9:16','1:1','4:5') NOT NULL DEFAULT '16:9',
	`fileSize` int,
	`format` varchar(20) NOT NULL DEFAULT 'mp4',
	`hasWatermark` boolean NOT NULL DEFAULT false,
	`version` int NOT NULL DEFAULT 1,
	`parentAssetId` int,
	`tags` json,
	`metadata` json,
	`isPublished` boolean NOT NULL DEFAULT false,
	`publishedAt` timestamp,
	`viewCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `video_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `video_credits_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orgId` int,
	`videoJobId` int,
	`action` enum('preview','generate','upscale','extend','restyle','lip_sync','motion_sync') NOT NULL,
	`creditsUsed` int NOT NULL,
	`durationSeconds` int,
	`resolution` varchar(20),
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `video_credits_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `video_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int,
	`userId` int NOT NULL,
	`brandId` int,
	`influencerId` int,
	`campaignId` int,
	`type` enum('imageToVideo','textToVideo','videoRestyle','lipSync','motionSync','characterSwap','storyPreview','finalRender') NOT NULL,
	`title` varchar(255),
	`prompt` text,
	`params` json,
	`status` enum('queued','running','completed','failed','cancelled') NOT NULL DEFAULT 'queued',
	`progress` int NOT NULL DEFAULT 0,
	`creditsEstimated` int NOT NULL DEFAULT 0,
	`creditsConsumed` int NOT NULL DEFAULT 0,
	`previewUrl` text,
	`outputUrl` text,
	`thumbnailUrl` text,
	`duration` int,
	`errorMessage` text,
	`retryCount` int NOT NULL DEFAULT 0,
	`maxRetries` int NOT NULL DEFAULT 3,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `video_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `video_scenes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`videoJobId` int NOT NULL,
	`order` int NOT NULL,
	`title` varchar(255),
	`prompt` text,
	`duration` int NOT NULL DEFAULT 5,
	`aspectRatio` enum('16:9','9:16','1:1','4:5') NOT NULL DEFAULT '16:9',
	`transitionType` enum('none','fade','dissolve','wipe','slide') NOT NULL DEFAULT 'fade',
	`transitionDuration` int NOT NULL DEFAULT 500,
	`voiceoverText` text,
	`voiceId` varchar(100),
	`musicTrackId` varchar(100),
	`musicVolume` int NOT NULL DEFAULT 50,
	`inputImageUrl` text,
	`inputVideoUrl` text,
	`outputUrl` text,
	`thumbnailUrl` text,
	`status` enum('pending','generating','completed','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `video_scenes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `video_scripts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`systemInfluencerId` int,
	`userId` int,
	`name` varchar(200) NOT NULL,
	`slug` varchar(100),
	`scriptType` enum('master','tiktok','youtube_shorts','instagram_reels','agency','custom') NOT NULL DEFAULT 'custom',
	`durationSeconds` int,
	`scenes` json,
	`fullScript` text,
	`deliveryNotes` json,
	`isPublished` boolean NOT NULL DEFAULT false,
	`isSystemScript` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `video_scripts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `video_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` enum('product_demo','day_in_life','vlog','tutorial','testimonial','social_ad','explainer','announcement','behind_scenes','custom') NOT NULL DEFAULT 'custom',
	`thumbnailUrl` text,
	`previewUrl` text,
	`aspectRatio` enum('16:9','9:16','1:1','4:5') NOT NULL DEFAULT '16:9',
	`duration` int NOT NULL DEFAULT 30,
	`sceneCount` int NOT NULL DEFAULT 1,
	`scenes` json,
	`tags` json,
	`isPremium` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `video_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `voice_library` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`providerId` varchar(100) NOT NULL,
	`provider` enum('elevenlabs','openai','azure','google','custom') NOT NULL DEFAULT 'elevenlabs',
	`gender` enum('male','female','neutral') NOT NULL DEFAULT 'neutral',
	`language` varchar(10) NOT NULL DEFAULT 'en',
	`accent` varchar(50),
	`style` enum('professional','casual','energetic','calm','authoritative','friendly','narrative') NOT NULL DEFAULT 'professional',
	`previewUrl` text,
	`isPremium` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `voice_library_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` varchar(50) NOT NULL,
	`eventId` varchar(255) NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`status` enum('received','processed','failed','retrying') NOT NULL DEFAULT 'received',
	`payload` json,
	`errorMessage` text,
	`retryCount` int NOT NULL DEFAULT 0,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhook_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `white_label_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`brandName` varchar(100),
	`logoUrl` text,
	`faviconUrl` text,
	`primaryColor` varchar(7),
	`secondaryColor` varchar(7),
	`accentColor` varchar(7),
	`customDomain` varchar(255),
	`customDomainVerified` boolean NOT NULL DEFAULT false,
	`customDomainVerificationToken` varchar(64),
	`hideMatangoBranding` boolean NOT NULL DEFAULT false,
	`customFooterText` text,
	`customSupportEmail` varchar(320),
	`customTermsUrl` text,
	`customPrivacyUrl` text,
	`emailFromName` varchar(100),
	`emailReplyTo` varchar(320),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `white_label_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `white_label_settings_organizationId_unique` UNIQUE(`organizationId`)
);
--> statement-breakpoint
CREATE TABLE `workflow_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(120) NOT NULL,
	`entityType` varchar(80) NOT NULL,
	`entityId` int,
	`sessionId` int,
	`details` json NOT NULL,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workflow_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_generation_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` int NOT NULL,
	`jobKind` enum('image','video','script','audio') NOT NULL,
	`status` enum('queued','running','succeeded','failed','canceled','dead_letter') NOT NULL DEFAULT 'queued',
	`progress` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`inputJson` json NOT NULL,
	`outputAssetId` int,
	`forgeJobId` varchar(120),
	`attemptCount` int NOT NULL DEFAULT 0,
	`maxAttempts` int NOT NULL DEFAULT 5,
	`nextRunAt` timestamp NOT NULL DEFAULT (now()),
	`leaseToken` varchar(80),
	`leaseExpiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflow_generation_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_influencer_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(140) NOT NULL,
	`dateOfBirth` timestamp,
	`ageRange` enum('unknown','10_12','13_15','16_17','18_24','25_34','35_44','45_plus') NOT NULL DEFAULT 'unknown',
	`isUnder10` boolean NOT NULL DEFAULT false,
	`avatarUrl` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflow_influencer_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_media_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` int NOT NULL,
	`brandId` int,
	`assetType` enum('reference_image','generated_image','generated_video','audio','poster','thumbnail') NOT NULL,
	`s3Key` varchar(1024) NOT NULL,
	`url` text,
	`mimeType` varchar(120) NOT NULL,
	`width` int,
	`height` int,
	`durationSeconds` int,
	`sizeBytes` int,
	`metadata` json,
	`status` enum('uploading','processing','ready','failed') NOT NULL DEFAULT 'ready',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workflow_media_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_scripts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` int NOT NULL,
	`platform` enum('tiktok','instagram','youtube','ads','linkedin','other') NOT NULL,
	`language` varchar(20) NOT NULL DEFAULT 'en',
	`tone` varchar(40) NOT NULL DEFAULT 'confident',
	`contentJson` json NOT NULL,
	`fullScript` text,
	`estimatedDurationSeconds` int,
	`status` enum('draft','approved','used') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflow_scripts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`brandId` int,
	`organizationId` int,
	`title` varchar(200) NOT NULL,
	`description` text,
	`status` enum('draft','active','completed','archived') NOT NULL DEFAULT 'draft',
	`currentStep` enum('script_generation','image_generation','video_generation','review','deployment') NOT NULL DEFAULT 'script_generation',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflow_sessions_id` PRIMARY KEY(`id`)
);
