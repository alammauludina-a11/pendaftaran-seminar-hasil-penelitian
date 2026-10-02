// Uploaded files live on disk in UPLOAD_DIR (a persistent volume in production), not in the database.
// The `files` table keeps the metadata: storage key, size and sha256. Legacy rows still carry base64 `data`.
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { db, type Executor } from "@/db";
import { files } from "@/db/schema";

export const uploadDir = () => path.resolve(process.env.UPLOAD_DIR || "uploads");

// Keys are "<file id>.pdf"; anything else (e.g. "../") is refused, so a key can never point outside UPLOAD_DIR
const KEY = /^[A-Za-z0-9_-]+\.pdf$/;
function lokasi(key: string) {
  if (!KEY.test(key)) throw new Error(`Storage key tidak valid: ${key}`);
  return path.join(uploadDir(), key);
}

export const sha256 = (isi: Buffer) => createHash("sha256").update(isi).digest("hex");

/** Writes the file (via a temporary file, so a crash never leaves half a PDF) and returns its metadata. */
export async function simpanFile(id: string, isi: Buffer) {
  const storageKey = `${id}.pdf`;
  const file = lokasi(storageKey);
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(`${file}.tmp`, isi);
  await rename(`${file}.tmp`, file);
  return { storageKey, size: isi.length, sha256: sha256(isi) };
}

export async function bacaFile(storageKey: string) {
  return readFile(lokasi(storageKey));
}

export async function hapusFile(storageKey: string) {
  await rm(lokasi(storageKey), { force: true });
}

/** Content of a file row: from disk when it has a storage key, otherwise the legacy base64 column. */
export async function isiFile(row: { id: string; storageKey: string | null }, ex: Executor = db): Promise<Buffer | null> {
  if (row.storageKey) {
    try {
      return await bacaFile(row.storageKey);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      // Not on disk (e.g. a database restored elsewhere): fall back to the base64 copy if it is still there
    }
  }
  const [r] = await ex.select({ data: files.data }).from(files).where(eq(files.id, row.id)).limit(1);
  return r?.data ? Buffer.from(r.data, "base64") : null;
}

export async function statusPenyimpanan() {
  const [s] = await db.select({
    total: sql<number>`count(*)`,
    diDisk: sql<number>`count(${files.storageKey})`,
    masihAdaBase64: sql<number>`sum(${files.data} != '')`,
  }).from(files);
  return {
    total: Number(s.total),
    diDisk: Number(s.diDisk),
    belumDipindah: Number(s.total) - Number(s.diDisk),
    masihAdaBase64: Number(s.masihAdaBase64 ?? 0),
  };
}

/**
 * Step 1 of the move: writes up to `batas` legacy files to disk and records their key, size and sha256.
 * The base64 copy stays in the database until `kosongkanBase64` has verified the file on disk.
 */
export async function pindahkanKeDisk(batas = 50) {
  const rows = await db.select({ id: files.id, data: files.data }).from(files)
    .where(and(isNull(files.storageKey), ne(files.data, ""))).limit(batas);
  let dipindah = 0;
  for (const r of rows) {
    const isi = Buffer.from(r.data, "base64");
    const meta = await simpanFile(r.id, isi);
    if (sha256(await bacaFile(meta.storageKey)) !== meta.sha256) throw new Error(`File ${r.id} rusak setelah ditulis ke disk`);
    await db.update(files).set(meta).where(and(eq(files.id, r.id), isNull(files.storageKey)));
    dipindah++;
  }
  return { dipindah, sisa: (await statusPenyimpanan()).belumDipindah };
}

/**
 * Step 2: empties the base64 copy of files that are on disk, but only after re-reading the file from disk
 * and matching its sha256. Files that are missing or differ are reported and keep their base64 copy.
 */
export async function kosongkanBase64(batas = 100) {
  const rows = await db.select({ id: files.id, storageKey: files.storageKey, sha256: files.sha256 }).from(files)
    .where(and(isNotNull(files.storageKey), ne(files.data, ""))).limit(batas);
  let dikosongkan = 0;
  const bermasalah: string[] = [];
  for (const r of rows) {
    try {
      if (sha256(await bacaFile(r.storageKey!)) !== r.sha256) { bermasalah.push(`${r.id} (hash beda)`); continue; }
    } catch {
      bermasalah.push(`${r.id} (tidak ada di disk)`);
      continue;
    }
    await db.update(files).set({ data: "" }).where(eq(files.id, r.id));
    dikosongkan++;
  }
  return { dikosongkan, bermasalah, sisa: (await statusPenyimpanan()).masihAdaBase64 };
}
