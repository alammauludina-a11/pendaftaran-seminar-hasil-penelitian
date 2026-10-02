ALTER TABLE `pendaftaran` ADD `dospem1_id` text REFERENCES users(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `pendaftaran` ADD `dospem2_id` text REFERENCES users(id) ON DELETE set null;--> statement-breakpoint
-- Backfill from the stored names; only names that match exactly one dosen are linked
UPDATE `pendaftaran` SET `dospem1_id` = (SELECT `id` FROM `users` WHERE `role` = 'dosen' AND `nama` = `pendaftaran`.`dospem1`)
WHERE `dospem1` IS NOT NULL AND (SELECT count(*) FROM `users` WHERE `role` = 'dosen' AND `nama` = `pendaftaran`.`dospem1`) = 1;--> statement-breakpoint
UPDATE `pendaftaran` SET `dospem2_id` = (SELECT `id` FROM `users` WHERE `role` = 'dosen' AND `nama` = `pendaftaran`.`dospem2`)
WHERE `dospem2` IS NOT NULL AND (SELECT count(*) FROM `users` WHERE `role` = 'dosen' AND `nama` = `pendaftaran`.`dospem2`) = 1;
