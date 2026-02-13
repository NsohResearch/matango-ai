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
