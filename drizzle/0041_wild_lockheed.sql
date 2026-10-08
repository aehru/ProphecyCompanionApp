CREATE TABLE `custom_manoeuvres` (
	`id` text PRIMARY KEY NOT NULL,
	`context` text DEFAULT 'melee' NOT NULL,
	`family` text DEFAULT 'manoeuvre' NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`difficulty` text DEFAULT '' NOT NULL,
	`dodge` text DEFAULT '' NOT NULL,
	`parry` text DEFAULT '' NOT NULL,
	`damage` text DEFAULT '' NOT NULL,
	`roll` text DEFAULT '' NOT NULL,
	`in_game_effect` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`preset_id` text,
	`created_at` integer NOT NULL
);
