CREATE TABLE `spells` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`complexity` integer DEFAULT 0 NOT NULL,
	`discipline` text DEFAULT 'sorcellerie' NOT NULL,
	`sphere` text DEFAULT 'sphereFeu' NOT NULL,
	`cost` integer DEFAULT 0 NOT NULL,
	`cast_time_amount` integer DEFAULT 1 NOT NULL,
	`cast_time_unit` text DEFAULT 'action' NOT NULL,
	`difficulty` integer DEFAULT 0 NOT NULL,
	`cle` text DEFAULT '' NOT NULL,
	`effect` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
