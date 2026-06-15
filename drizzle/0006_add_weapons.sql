CREATE TABLE `weapons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`damage` text DEFAULT '' NOT NULL,
	`prerequisites` text DEFAULT '' NOT NULL,
	`creation_difficulty` integer DEFAULT 0 NOT NULL,
	`creation_time` integer DEFAULT 0 NOT NULL,
	`init_melee` integer DEFAULT 0 NOT NULL,
	`init_corps_a_corps` integer DEFAULT 0 NOT NULL,
	`special` text DEFAULT '' NOT NULL,
	`range_effective` text,
	`range_max` text,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
