ALTER TABLE `spells` ADD `in_game_effect` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `spells` ADD `sensory_effect` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `spells` ADD `duration` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `spells` ADD `duration_unit` text DEFAULT 'round' NOT NULL;--> statement-breakpoint
ALTER TABLE `spells` ADD `targets` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `spells` ADD `tags` text DEFAULT '[]' NOT NULL;