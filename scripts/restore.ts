// Restores a backup made by scripts/backup.ts into the database at DATABASE_URL.
// Safety: only restores into an EMPTY database (it never overwrites existing data). The usual way:
// create a new database (e.g. a new Turso database), point DATABASE_URL at it, restore, check it,
// then switch the app to it.
//
//   DATABASE_URL=... DATABASE_AUTH_TOKEN=... npx tsx scripts/restore.ts "~/Backup Seminar/data/data-2026-10-02.json.gz"              → preview
//   DATABASE_URL=... DATABASE_AUTH_TOKEN=... npx tsx scripts/restore.ts "~/Backup Seminar/data/data-2026-10-02.json.gz" --jalankan   → restore
//
// The PDFs are read from the pdf/ folder next to the data/ folder of the backup.
import { createClient, type InStatement } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { gunzipSync } from "node:zlib";

const JALANKAN = process.argv.includes("--jalankan");
const fileArg = process.argv.slice(2).find(a => !a.startsWith("--"));

// Parents before children, so foreign keys are always satisfied
const URUTAN = [
  "users", "periode", "slot_waktu", "kelas_seminar", "pendaftaran", "moderator", "pengumuman", "files",
  "account", "session", "verification", "login_log", "login_gagal", "log_aktivitas",
];

type Backup = { dibuat: string; tables: Record<string, Record<string, unknown>[]> };

async function main() {
  if (!fileArg) throw new Error('Sebutkan file backup, contoh: "~/Backup Seminar/data/data-2026-10-02.json.gz"');
  const file = fileArg.replace(/^~(?=\/)/, homedir());
  const pdfDir = path.join(path.dirname(file), "..", "pdf");
  const backup = JSON.parse(gunzipSync(readFileSync(file)).toString()) as Backup;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL tujuan belum diisi.");
  console.log(`File backup     : ${file} (dibuat ${backup.dibuat})`);
  console.log(`Database tujuan : ${url.replace(/\/\/[^@/]*@/, "//").split("?")[0]}`);

  // The backup must not come from a newer version of the app than this code
  const lokal = new Set(readMigrationFiles({ migrationsFolder: "./drizzle" }).map(m => m.hash));
  const migrasiBackup = (backup.tables.__drizzle_migrations ?? []).map(m => String(m.hash));
  const asing = migrasiBackup.filter(h => !lokal.has(h));
  if (asing.length) throw new Error(`Backup berasal dari versi aplikasi yang lebih baru (${asing.length} migrasi tidak dikenal). Perbarui kode dulu.`);

  const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  const adaTabel = (await client.execute("select count(*) n from sqlite_master where type='table' and name='users'")).rows[0].n;
  if (Number(adaTabel) > 0) {
    const isi = Number((await client.execute("select count(*) n from users")).rows[0].n);
    if (isi > 0) throw new Error(`DIBATALKAN: database tujuan sudah berisi data (${isi} pengguna). Restore hanya ke database kosong.`);
  }

  const tables = [...URUTAN.filter(t => backup.tables[t]), ...Object.keys(backup.tables).filter(t => !URUTAN.includes(t) && t !== "__drizzle_migrations")];
  const fileIds = (backup.tables.files ?? []).map(f => String(f.id));
  const pdfHilang = fileIds.filter(id => !existsSync(path.join(pdfDir, `${id}.pdf`)));
  console.log(`Akan dipulihkan :`);
  for (const t of tables) console.log(`  - ${t}: ${backup.tables[t].length} baris`);
  console.log(`  - PDF: ${fileIds.length - pdfHilang.length} dari ${fileIds.length} file tersedia di ${pdfDir}`);
  if (pdfHilang.length) console.log(`    PERHATIAN: ${pdfHilang.length} PDF tidak ada di folder backup; isinya akan kosong.`);

  if (!JALANKAN) {
    console.log(`\nIni hanya pratinjau. Tambahkan --jalankan untuk memulihkan.`);
    return;
  }

  // Build the schema with the migrations of this code (also records them), then insert the rows
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });

  for (const t of tables) {
    const kolomTujuan = new Set((await client.execute(`pragma table_info("${t}")`)).rows.map(r => String(r.name)));
    const rows = backup.tables[t];
    const stmts: InStatement[] = rows.map(row => {
      const data = { ...row };
      if (t === "files") {
        const pdf = path.join(pdfDir, `${data.id}.pdf`);
        data.data = existsSync(pdf) ? readFileSync(pdf).toString("base64") : "";
      }
      const kolom = Object.keys(data);
      const tidakAda = kolom.filter(k => !kolomTujuan.has(k));
      if (tidakAda.length) throw new Error(`Kolom ${tidakAda.join(", ")} di tabel ${t} tidak ada di database tujuan.`);
      return {
        sql: `insert into "${t}" (${kolom.map(k => `"${k}"`).join(", ")}) values (${kolom.map(() => "?").join(", ")})`,
        args: kolom.map(k => data[k] as string | number | null),
      };
    });
    for (let i = 0; i < stmts.length; i += 50) await client.batch(stmts.slice(i, i + 50), "write");
    const n = Number((await client.execute(`select count(*) n from "${t}"`)).rows[0].n);
    if (n !== rows.length) throw new Error(`Jumlah baris ${t} tidak cocok: ${n} dari ${rows.length}`);
  }
  console.log(`\nRestore selesai. Semua tabel cocok dengan backup.`);
}

main().then(() => process.exit(0), (e) => { console.error(e?.message ?? e); process.exit(1); });
