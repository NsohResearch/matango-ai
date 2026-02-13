CREATE TABLE `influencer_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`influencerId` int NOT NULL,
	`mediaId` int NOT NULL,
	`role` varchar(32) NOT NULL DEFAULT 'training',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `influencer_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_objects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kind` enum('image','video','audio') NOT NULL,
	`purpose` varchar(64) NOT NULL,
	`objectKey` varchar(512) NOT NULL,
	`contentType` varchar(128) NOT NULL,
	`bytes` bigint NOT NULL DEFAULT 0,
	`width` int,
	`height` int,
	`durationSec` int,
	`sha256` varchar(64),
	`url` text,
	`originalName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `media_objects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `video_gen_jobs_v2` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`influencerId` int,
	`scriptId` int,
	`scriptText` text,
	`provider` varchar(64) NOT NULL DEFAULT 'local',
	`status` enum('queued','running','succeeded','failed') NOT NULL DEFAULT 'queued',
	`progress` int NOT NULL DEFAULT 0,
	`error` text,
	`outputMediaId` int,
	`batchGroupId` varchar(64),
	`bgMusicMediaId` int,
	`lipSync` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `video_gen_jobs_v2_id` PRIMARY KEY(`id`)
);
