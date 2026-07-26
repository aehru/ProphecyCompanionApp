PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_weapons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`damage` text DEFAULT '' NOT NULL,
	`prerequisites` text DEFAULT '' NOT NULL,
	`creation_difficulty` integer DEFAULT 0 NOT NULL,
	`creation_time` real DEFAULT 0 NOT NULL,
	`init_melee` integer DEFAULT 0 NOT NULL,
	`init_corps_a_corps` integer DEFAULT 0 NOT NULL,
	`special` text DEFAULT '' NOT NULL,
	`range_effective` text,
	`range_max` text,
	`hands` integer DEFAULT 1 NOT NULL,
	`equipped_hand` text,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_weapons`("id", "character_id", "name", "damage", "prerequisites", "creation_difficulty", "creation_time", "init_melee", "init_corps_a_corps", "special", "range_effective", "range_max", "hands", "equipped_hand") SELECT "id", "character_id", "name", "damage", "prerequisites", "creation_difficulty", "creation_time", "init_melee", "init_corps_a_corps", "special", "range_effective", "range_max", "hands", "equipped_hand" FROM `weapons`;--> statement-breakpoint
DROP TABLE `weapons`;--> statement-breakpoint
ALTER TABLE `__new_weapons` RENAME TO `weapons`;--> statement-breakpoint
PRAGMA foreign_keys=ON;