// PDF part of scripts/backup.ts, without side effects so it can be tested. A PDF that can't be fetched or doesn't
// match its sha256 is reported as a warning and skipped: the data backup is what must never fail silently,
// and a missing upload (e.g. HTTP 404 on the server) must not stop every later PDF from being backed up.
import { createHash } from "node:crypto";
import { readdirSync } from "node:fs";
import path from "node:path";

export type PdfGagal = { id: string; pendaftaranIds: number[]; alasan: string };

/** Registrations (by id) that point to each uploaded file, from the backed up `pendaftaran` rows. */
export function pendaftaranPerFile(rows: Record<string, unknown>[]): Map<string, number[]> {
  const peta = new Map<string, number[]>();
  for (const r of rows) {
    for (const kolom of ["file_bukti_kolokium", "file_approval_dospem"]) {
      const url = r[kolom];
      if (typeof url !== "string" || !url.startsWith("/api/files/")) continue;
      const id = url.slice("/api/files/".length);
      peta.set(id, [...(peta.get(id) ?? []), Number(r.id)]);
    }
  }
  return peta;
}

export async function backupPdf(opts: {
  pdfDir: string;
  fileIds: string[];
  /** sha256 per file id from the files table (null for legacy rows) */
  hash: Map<string, string | null>;
  /** Rows { id, data } of the files table for a batch of ids (data = legacy base64, empty when on disk) */
  ambilBatch: (ids: string[]) => Promise<{ id: string; data: string | null }[]>;
  /** Downloads a file stored on the server's disk; throws on failure (e.g. HTTP 404) */
  unduh: (id: string) => Promise<Buffer>;
  /** Writes a verified PDF (atomically) */
  simpan: (file: string, isi: Buffer) => void;
  pendaftaranIds?: Map<string, number[]>;
}) {
  const { pdfDir, fileIds, hash, ambilBatch, unduh, simpan } = opts;
  const sudahAda = new Set(readdirSync(pdfDir).filter(f => f.endsWith(".pdf")).map(f => f.slice(0, -4)));
  const baru = fileIds.filter(id => !sudahAda.has(id));
  const gagal: PdfGagal[] = [];
  let tersimpan = 0;
  const catat = (id: string, alasan: string) => gagal.push({ id, pendaftaranIds: opts.pendaftaranIds?.get(id) ?? [], alasan });

  for (let i = 0; i < baru.length; i += 20) {
    const batch = baru.slice(i, i + 20);
    for (const r of await ambilBatch(batch)) {
      let isi: Buffer;
      try {
        // Legacy files still carry base64 in the database; moved files are downloaded from the app's disk
        isi = r.data ? Buffer.from(r.data, "base64") : await unduh(r.id);
      } catch (e) {
        catat(r.id, e instanceof Error ? e.message : String(e));
        continue;
      }
      const diharapkan = hash.get(r.id);
      if (diharapkan && createHash("sha256").update(isi).digest("hex") !== diharapkan) {
        catat(r.id, "isi tidak cocok dengan sha256-nya (tidak disimpan)");
        continue;
      }
      simpan(path.join(pdfDir, `${r.id}.pdf`), isi);
      tersimpan++;
    }
  }
  return { baru: tersimpan, total: sudahAda.size + tersimpan, gagal };
}
