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
