CREATE TABLE `armor` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`defense_max` integer DEFAULT 0 NOT NULL,
	`defense_current` integer DEFAULT 0 NOT NULL,
	`equipped` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
