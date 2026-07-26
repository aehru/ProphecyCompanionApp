CREATE TABLE `magic_reserves` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`nom` text DEFAULT '' NOT NULL,
	`max` integer DEFAULT 0 NOT NULL,
	`current` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
