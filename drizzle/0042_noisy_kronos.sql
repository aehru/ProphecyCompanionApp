ALTER TABLE `actual_state` ADD `initiative_usage` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `round` integer DEFAULT 0 NOT NULL;