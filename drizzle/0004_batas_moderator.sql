CREATE TABLE `pengecualian_moderator` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`periode_id` integer NOT NULL,
	`dosen_id` text NOT NULL,
	`tambahan` integer NOT NULL,
	FOREIGN KEY (`periode_id`) REFERENCES `periode`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`dosen_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pengecualian_moderator_periode_dosen_idx` ON `pengecualian_moderator` (`periode_id`,`dosen_id`);--> statement-breakpoint
ALTER TABLE `periode` ADD `batas_moderator` integer;