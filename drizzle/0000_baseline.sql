CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`expires_at` integer,
	`password` text,
	`plain_password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`mime_type` text NOT NULL,
	`data` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `kelas_seminar` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nama_kelas` text NOT NULL,
	`periode_id` integer,
	`slot_waktu_id` integer,
	`date` text,
	`room` text,
	`kuota_terisi` integer DEFAULT 0 NOT NULL,
	`kapasitas_max` integer DEFAULT 31 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`periode_id`) REFERENCES `periode`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`slot_waktu_id`) REFERENCES `slot_waktu`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `log_aktivitas` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text,
	`actor_nama` text,
	`kategori` text NOT NULL,
	`aksi` text NOT NULL,
	`deskripsi` text NOT NULL,
	`target_tipe` text,
	`target_id` text,
	`detail` text,
	`ip_address` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `log_aktivitas_created_at_idx` ON `log_aktivitas` (`created_at`);--> statement-breakpoint
CREATE TABLE `login_gagal` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`user_id` text,
	`alasan` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `login_gagal_created_at_idx` ON `login_gagal` (`created_at`);--> statement-breakpoint
CREATE TABLE `login_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `login_log_user_id_idx` ON `login_log` (`user_id`);--> statement-breakpoint
CREATE INDEX `login_log_created_at_idx` ON `login_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `moderator` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pendaftaran_id` integer NOT NULL,
	`dosen_id` text NOT NULL,
	`dipilih_pada` integer NOT NULL,
	`assigned_by_role` text DEFAULT 'dosen' NOT NULL,
	`batal_status` text,
	`batal_reason` text,
	FOREIGN KEY (`pendaftaran_id`) REFERENCES `pendaftaran`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`dosen_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `moderator_pendaftaran_id_unique` ON `moderator` (`pendaftaran_id`);--> statement-breakpoint
CREATE TABLE `pendaftaran` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`jenis_seminar` text DEFAULT 'hasil_penelitian' NOT NULL,
	`user_id` text NOT NULL,
	`periode_id` integer,
	`slot_waktu_id` integer,
	`judul_penelitian` text,
	`konsentrasi` text,
	`dospem1` text,
	`dospem2` text,
	`tanggal_kolokium` text,
	`file_bukti_kolokium` text,
	`file_approval_dospem` text,
	`status_verifikasi` text DEFAULT 'menunggu' NOT NULL,
	`catatan_admin` text,
	`ruangan_disetujui` text,
	`ruangan_diajukan` text,
	`status_ruangan` text DEFAULT 'menunggu' NOT NULL,
	`pembahas` text,
	`is_finalized` integer DEFAULT false NOT NULL,
	`is_released` integer DEFAULT false NOT NULL,
	`kelas_seminar_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`periode_id`) REFERENCES `periode`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`slot_waktu_id`) REFERENCES `slot_waktu`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `pengumuman` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`aktif` integer DEFAULT false NOT NULL,
	`dirilis_pada` integer
);
--> statement-breakpoint
CREATE TABLE `periode` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`jenis_seminar` text DEFAULT 'hasil_penelitian' NOT NULL,
	`angkatan` text NOT NULL,
	`start_date` text,
	`end_date` text,
	`registration_end_date` text,
	`is_open` integer DEFAULT false NOT NULL,
	`batas_kelas` integer DEFAULT 31 NOT NULL,
	`is_draft` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `slot_waktu` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`waktu_mulai` integer NOT NULL,
	`waktu_selesai` integer NOT NULL,
	`tersedia` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`username` text,
	`display_username` text,
	`role` text NOT NULL,
	`name` text NOT NULL,
	`nama` text NOT NULL,
	`nip_nim` text NOT NULL,
	`prodi` text,
	`status_aktif` text,
	`angkatan` text,
	`jabatan` text,
	`status_dosen` text,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_nip_nim_unique` ON `users` (`nip_nim`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
