// Backup of the whole database to a folder on this computer. Only reads the database.
//
// - Data (every table, without the PDF contents) → data/data-YYYY-MM-DD.json.gz, read in one consistent snapshot.
//   Kept: the last 30 days, plus the copy of the 1st of each month for 12 months.
// - Uploaded PDFs → pdf/<file id>.pdf. Each file is downloaded once (uploads never change) and never deleted.
//   Legacy PDFs come from the database; PDFs on the server's disk via APP_URL + MAINTENANCE_TOKEN.
//   A PDF that can't be fetched (e.g. missing on the server) is a warning, listed at the end with its
//   registrations; the backup still succeeds. Only a failing data backup counts (and notifies) as GAGAL.
//
//   npx tsx --env-file=.env.local scripts/backup.ts
//
// Folder: ~/Backup Seminar (override with BACKUP_DIR). Restore with scripts/restore.ts.
import { createClient, type Client, type Row } from "@libsql/client";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { backupPdf, pendaftaranPerFile } from "./backup-pdf";

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(homedir(), "Backup Seminar");
const HARIAN = 30;
const BULANAN = 12;

let client: Client;

const toObject = (columns: string[], row: Row) => Object.fromEntries(columns.map((c, i) => [c, row[i]]));
const todayWIB = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });

/** Writes via a temporary file, so an interrupted backup never leaves a half-written file behind. */
function tulisAman(file: string, content: Buffer) {
  writeFileSync(`${file}.tmp`, content);
  renameSync(`${file}.tmp`, file);
}

async function backupData(dataDir: string) {
  // A read transaction gives one consistent snapshot of all tables, without blocking writes
  const tx = await client.transaction("read");
  try {
    const tables = (await tx.execute(
      "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name"
    )).rows.map(r => String(r.name));

    const isi: Record<string, Record<string, unknown>[]> = {};
    for (const t of tables) {
      // PDF contents are stored separately in pdf/; the files table keeps only its metadata here
      const kolom = t === "files"
        ? (await tx.execute(`pragma table_info("files")`)).rows.map(r => `"${r.name}"`).filter(c => c !== '"data"').join(", ")
        : "*";
      const res = await tx.execute(`select ${kolom} from "${t}"`);
      isi[t] = res.rows.map(r => toObject(res.columns, r));
    }

    const backup = { dibuat: new Date().toISOString(), tables: isi };
    const file = path.join(dataDir, `data-${todayWIB()}.json.gz`);
    tulisAman(file, gzipSync(JSON.stringify(backup)));

    // Check the written file can be read back and is complete
    const cek = JSON.parse(gunzipSync(readFileSync(file)).toString()) as typeof backup;
    for (const t of tables) {
      if (cek.tables[t]?.length !== isi[t].length) throw new Error(`Verifikasi gagal untuk tabel ${t}`);
    }
    return { file, isi };
  } finally {
    tx.close();
  }
}

/** Files stored on the server's disk (UPLOAD_DIR) are fetched through the token protected maintenance endpoint. */
async function unduhDariServer(id: string) {
  const appUrl = process.env.APP_URL, token = process.env.MAINTENANCE_TOKEN;
  if (!appUrl || !token) throw new Error("APP_URL dan MAINTENANCE_TOKEN dibutuhkan untuk mengunduh PDF yang tersimpan di server.");
  const res = await fetch(`${appUrl.replace(/\/$/, "")}/api/maintenance/files/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Gagal mengunduh PDF ${id} dari server: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Removes data copies older than 30 days, except the 1st of the month for the last 12 months. */
function rapikan(dataDir: string) {
  const hariIni = new Date(`${todayWIB()}T00:00:00Z`);
  const batasHarian = new Date(hariIni); batasHarian.setUTCDate(batasHarian.getUTCDate() - HARIAN);
  const batasBulanan = new Date(hariIni); batasBulanan.setUTCMonth(batasBulanan.getUTCMonth() - BULANAN);
  const dihapus: string[] = [];
  for (const f of readdirSync(dataDir)) {
    const m = f.match(/^data-(\d{4}-\d{2}-(\d{2}))\.json\.gz$/);
    if (!m) continue;
    const tanggal = new Date(`${m[1]}T00:00:00Z`);
    const simpan = tanggal > batasHarian || (m[2] === "01" && tanggal > batasBulanan);
    if (!simpan) { unlinkSync(path.join(dataDir, f)); dihapus.push(f); }
  }
  return dihapus;
}

function notifikasiGagal(pesan: string) {
  // Unattended runs: show a macOS notification so a failing backup doesn't go unnoticed
  if (process.platform !== "darwin") return;
  execFile("osascript", ["-e", `display notification ${JSON.stringify(pesan.slice(0, 200))} with title "Backup Seminar GAGAL"`]);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL tidak ada. Jalankan dengan --env-file=.env.local");
  client = createClient({ url: process.env.DATABASE_URL, authToken: process.env.DATABASE_AUTH_TOKEN });
  const dataDir = path.join(BACKUP_DIR, "data");
  const pdfDir = path.join(BACKUP_DIR, "pdf");
  for (const d of [dataDir, pdfDir]) if (!existsSync(d)) mkdirSync(d, { recursive: true });

  const mulai = Date.now();
  const { file, isi } = await backupData(dataDir);
  const pdf = await backupPdf({
    pdfDir,
    fileIds: (isi.files ?? []).map(f => String(f.id)),
    hash: new Map((isi.files ?? []).map(f => [String(f.id), f.sha256 as string | null])),
    ambilBatch: async (ids) => (await client.execute({
      sql: `select id, data from files where id in (${ids.map(() => "?").join(",")})`,
      args: ids,
    })).rows.map(r => ({ id: String(r.id), data: r.data ? String(r.data) : null })),
    unduh: unduhDariServer,
    simpan: tulisAman,
    pendaftaranIds: pendaftaranPerFile(isi.pendaftaran ?? []),
  });
  const dihapus = rapikan(dataDir);

  const ringkas = Object.entries(isi).map(([t, rows]) => `${t}=${rows.length}`).join(", ");
  console.log(`[${new Date().toISOString()}] Backup berhasil (${((Date.now() - mulai) / 1000).toFixed(1)} dtk)`);
  console.log(`  Data : ${file}`);
  console.log(`         ${ringkas}`);
  console.log(`  PDF  : ${pdf.baru} baru diunduh, total ${pdf.total} file di ${pdfDir}`);
  if (dihapus.length) console.log(`  Dirapikan: ${dihapus.join(", ")}`);
  if (pdf.gagal.length) {
    console.log(`  PERINGATAN: ${pdf.gagal.length} PDF tidak bisa dicadangkan (data tetap tersimpan dan terverifikasi):`);
    for (const g of pdf.gagal) {
      console.log(`    - ${g.id} (pendaftaran ${g.pendaftaranIds.join(", ") || "-"}): ${g.alasan}`);
    }
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(`[${new Date().toISOString()}] Backup GAGAL:`, e);
    notifikasiGagal(String(e?.message ?? e));
    setTimeout(() => process.exit(1), 500);
  }
);
