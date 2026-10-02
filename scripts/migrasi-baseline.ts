// One-time step when switching from `drizzle-kit push` to migrations on a database that already has all tables.
// Marks drizzle/0000_baseline.sql as already applied (without running it), so `npm run db:migrate`
// only runs migrations created after the baseline.
//
//   npx tsx --env-file=.env.local scripts/migrasi-baseline.ts              → only shows what would happen
//   npx tsx --env-file=.env.local scripts/migrasi-baseline.ts --jalankan   → records the baseline
import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { db } from "../src/db";

const JALANKAN = process.argv.includes("--jalankan");

async function main() {
  const url = (process.env.DATABASE_URL || "file:./sqlite.db").replace(/\/\/[^@/]*@/, "//").split("?")[0];
  console.log(`Database tujuan : ${url}`);

  const [baseline] = readMigrationFiles({ migrationsFolder: "./drizzle" });
  if (!baseline) throw new Error("drizzle/0000_baseline.sql tidak ditemukan.");

  // The baseline only describes tables that must already exist; refuse on an empty/partial database
  const tables = (await db.all<{ name: string }>(sql`select name from sqlite_master where type = 'table'`)).map(t => t.name);
  const wajib = ["users", "periode", "pendaftaran", "kelas_seminar", "moderator", "log_aktivitas"];
  const kurang = wajib.filter(t => !tables.includes(t));
  if (kurang.length) {
    console.log(`\nDIBATALKAN: tabel ${kurang.join(", ")} belum ada. Database kosong cukup dijalankan dengan: npm run db:migrate`);
    return;
  }

  if (tables.includes("__drizzle_migrations")) {
    const rows = await db.all<{ hash: string }>(sql`select hash from __drizzle_migrations`);
    if (rows.some(r => r.hash === baseline.hash)) {
      console.log(`\nBaseline sudah tercatat. Tidak ada yang perlu dilakukan.`);
      return;
    }
    if (rows.length) {
      console.log(`\nDIBATALKAN: __drizzle_migrations sudah berisi ${rows.length} migrasi lain. Periksa manual.`);
      return;
    }
  }

  console.log(`Akan dilakukan  : membuat tabel __drizzle_migrations (jika belum ada) dan mencatat 0000_baseline sebagai sudah dijalankan.`);
  console.log(`                  Tabel dan data lain tidak diubah.`);
  if (!JALANKAN) {
    console.log(`\nIni hanya pratinjau. Tambahkan --jalankan untuk mencatat baseline.`);
    return;
  }

  // Same table definition the Drizzle migrator creates
  await db.run(sql`CREATE TABLE IF NOT EXISTS __drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)`);
  await db.run(sql`INSERT INTO __drizzle_migrations ("hash", "created_at") VALUES (${baseline.hash}, ${baseline.folderMillis})`);
  console.log(`\nBaseline tercatat. Mulai sekarang ubah skema lewat: npm run db:generate lalu npm run db:migrate`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
