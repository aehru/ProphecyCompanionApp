CREATE TABLE `custom_favors` (
	`id` text PRIMARY KEY NOT NULL,
	`dragon` text NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`in_game_effect` text DEFAULT '' NOT NULL,
	`roll` text DEFAULT '' NOT NULL,
	`difficulty` integer,
	`usages` text DEFAULT '' NOT NULL,
	`duration` text DEFAULT '' NOT NULL,
	`duration_unit` text,
	`preset_id` text,
	`created_at` integer NOT NULL
);
