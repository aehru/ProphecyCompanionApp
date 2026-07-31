PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_campaigns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text,
	`name` text DEFAULT '' NOT NULL,
	`role` text NOT NULL,
	`gm_token` text,
	`server_url` text,
	`share_npcs` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_campaigns`("id", "code", "name", "role", "gm_token", "server_url", "share_npcs", "created_at") SELECT "id", "code", "name", "role", "gm_token", "server_url", "share_npcs", "created_at" FROM `campaigns`;--> statement-breakpoint
DROP TABLE `campaigns`;--> statement-breakpoint
ALTER TABLE `__new_campaigns` RENAME TO `campaigns`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `campaigns_code_unique` ON `campaigns` (`code`);