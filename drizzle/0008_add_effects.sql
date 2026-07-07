CREATE TABLE `effects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`target` text DEFAULT 'all' NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	`duration_unit` text DEFAULT 'round' NOT NULL,
	`duration_remaining` integer DEFAULT 0 NOT NULL,
	`expired` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
