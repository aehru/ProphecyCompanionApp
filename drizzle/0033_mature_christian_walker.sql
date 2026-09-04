CREATE TABLE `traits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`kind` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`rarity` text DEFAULT 'commun' NOT NULL,
	`cost` integer DEFAULT 0 NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`in_game_effect` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`preset_id` text,
	`preset_revision` text,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
