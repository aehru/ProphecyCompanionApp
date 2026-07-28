CREATE TABLE `enchants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`target_type` text NOT NULL,
	`target_id` integer NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`source_spell_name` text,
	`source_spell_id` integer,
	`effect` text DEFAULT '' NOT NULL,
	`uses_max` integer DEFAULT 1 NOT NULL,
	`uses_current` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_spell_id`) REFERENCES `spells`(`id`) ON UPDATE no action ON DELETE set null
);
