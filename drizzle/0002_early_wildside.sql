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
ALTER TABLE `users` ADD `accountStatus` enum('ACTIVE','DEACTIVATED','SUSPENDED','SOFT_DELETED_90D','RETENTION_12M','HARD_DELETED') DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `deletedBy` int;--> statement-breakpoint
ALTER TABLE `users` ADD `deletionReason` text;--> statement-breakpoint
ALTER TABLE `users` ADD `recoveryDeadline` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `retentionUntil` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `hardDeletedAt` timestamp;