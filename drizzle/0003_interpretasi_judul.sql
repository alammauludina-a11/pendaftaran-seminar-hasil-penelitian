CREATE TABLE `interpretasi_judul` (
	`id` text PRIMARY KEY NOT NULL,
	`angkatan` text NOT NULL,
	`kunci_data` text NOT NULL,
	`versi_prompt` text NOT NULL,
	`model` text NOT NULL,
	`pembanding` text,
	`hasil` text NOT NULL,
	`dibuat_oleh_id` text,
	`dibuat_oleh_nama` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `interpretasi_judul_angkatan_idx` ON `interpretasi_judul` (`angkatan`,`created_at`);