CREATE TABLE `shields` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`damage` text DEFAULT '' NOT NULL,
	`prerequisites` text DEFAULT '' NOT NULL,
	`creation_difficulty` integer DEFAULT 0 NOT NULL,
	`creation_time` real DEFAULT 0 NOT NULL,
	`special` text DEFAULT '' NOT NULL,
	`defense_max` integer DEFAULT 0 NOT NULL,
	`defense_current` integer DEFAULT 0 NOT NULL,
	`encombrement_malus` integer DEFAULT 0 NOT NULL,
	`equipped` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `armor` ADD `category` text DEFAULT 'Armures légères' NOT NULL;--> statement-breakpoint
ALTER TABLE `armor` ADD `prerequisites` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `armor` ADD `creation_difficulty` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `armor` ADD `creation_time` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `armor` ADD `special` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `armor` ADD `encombrement_malus` integer DEFAULT 0 NOT NULL;