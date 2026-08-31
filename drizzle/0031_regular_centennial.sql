ALTER TABLE `enchants` ADD `cast_score` integer;--> statement-breakpoint
ALTER TABLE `enchants` ADD `difficulty` integer;--> statement-breakpoint
ALTER TABLE `spells` ADD `known` integer DEFAULT true NOT NULL;