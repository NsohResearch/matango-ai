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
