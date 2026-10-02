CREATE TABLE `xp_awards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`chosen_valeur` text NOT NULL,
	`danger` integer DEFAULT 0 NOT NULL,
	`decouverte` integer DEFAULT 0 NOT NULL,
	`magie` integer DEFAULT 0 NOT NULL,
	`implication` integer DEFAULT 0 NOT NULL,
	`initiatives` integer DEFAULT 0 NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
