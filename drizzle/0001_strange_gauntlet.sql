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
