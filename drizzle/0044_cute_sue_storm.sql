ALTER TABLE `effects` ADD `item_id` integer REFERENCES items(id);--> statement-breakpoint
ALTER TABLE `items` ADD `bonus_target` text DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE `items` ADD `bonus_value` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shields` ADD `hit_bonus` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shields` ADD `damage_bonus` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `weapons` ADD `hit_bonus` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `weapons` ADD `damage_bonus` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `weapons` ADD `init_bonus` integer DEFAULT 0 NOT NULL;