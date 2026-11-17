CREATE TABLE `privileges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`caste` text NOT NULL,
	`family` text DEFAULT 'caste' NOT NULL,
	`dark_orders` integer DEFAULT false NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`cost` integer DEFAULT 0 NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`preset_id` text,
	`preset_revision` text,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
