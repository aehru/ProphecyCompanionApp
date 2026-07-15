ALTER TABLE `characters` ADD `uuid` text;--> statement-breakpoint
CREATE UNIQUE INDEX `characters_uuid_unique` ON `characters` (`uuid`);