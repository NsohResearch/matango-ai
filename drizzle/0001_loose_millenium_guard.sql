ALTER TABLE `users` ADD `onboardingStep` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `planStatus` enum('active','trial','past_due','cancelled','none') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `billingCycle` enum('monthly','yearly') DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeSubscriptionId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `planIntentTier` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `planIntentCycle` varchar(16);--> statement-breakpoint
ALTER TABLE `users` ADD `planIntentPriceId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `planIntentOrigin` varchar(64);