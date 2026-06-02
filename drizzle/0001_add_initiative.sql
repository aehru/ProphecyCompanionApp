ALTER TABLE `actual_state` ADD `initiative_values` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `initiative_max` integer DEFAULT 0 NOT NULL;