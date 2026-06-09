CREATE TABLE `skills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`attribut` text DEFAULT '' NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
