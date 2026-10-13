import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { backupPdf, pendaftaranPerFile } from "../scripts/backup-pdf";

const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const pdf = (isi: string) => Buffer.from(`%PDF-1.4 ${isi}`);

function siapkan(dataServer: Record<string, Buffer>, legacy: Record<string, Buffer> = {}) {
  const pdfDir = mkdtempSync(path.join(tmpdir(), "backup-pdf-"));
  const diunduh: string[] = [];
  return {
    pdfDir,
    diunduh,
    ambilBatch: async (ids: string[]) => ids.map(id => ({ id, data: legacy[id] ? legacy[id].toString("base64") : "" })),
    unduh: async (id: string) => {
      diunduh.push(id);
      if (!dataServer[id]) throw new Error(`Gagal mengunduh PDF ${id} dari server: HTTP 404`);
      return dataServer[id];
    },
    simpan: (file: string, isi: Buffer) => writeFileSync(file, isi),
  };
}

describe("backupPdf: PDF yang hilang tidak menghentikan backup", () => {
  it("PDF 404 dicatat sebagai peringatan, PDF berikutnya tetap dicadangkan", async () => {
    const a = pdf("a"), c = pdf("c");
    const s = siapkan({ a, c });
    const hasil = await backupPdf({
      ...s,
      fileIds: ["a", "hilang", "c"],
      hash: new Map([["a", sha(a)], ["hilang", "x"], ["c", sha(c)]]),
      pendaftaranIds: new Map([["hilang", [523]]]),
    });
    assert.deepEqual(s.diunduh, ["a", "hilang", "c"]);
    assert.equal(hasil.baru, 2);
    assert.equal(hasil.total, 2);
    assert.deepEqual(hasil.gagal, [{ id: "hilang", pendaftaranIds: [523], alasan: "Gagal mengunduh PDF hilang dari server: HTTP 404" }]);
    assert.deepEqual(readdirSync(s.pdfDir).sort(), ["a.pdf", "c.pdf"]);
  });

  it("isi yang tidak cocok dengan sha256 tidak disimpan dan dicatat", async () => {
    const s = siapkan({ rusak: pdf("berbeda") });
    const hasil = await backupPdf({ ...s, fileIds: ["rusak"], hash: new Map([["rusak", sha(pdf("asli"))]]) });
    assert.equal(hasil.baru, 0);
    assert.match(hasil.gagal[0].alasan, /sha256/);
    assert.deepEqual(readdirSync(s.pdfDir), []);
  });

  it("PDF lama (base64 di database) tidak diunduh; yang sudah ada di folder dilewati", async () => {
    const lama = pdf("lama");
    const s = siapkan({}, { lama });
    writeFileSync(path.join(s.pdfDir, "sudah.pdf"), pdf("sudah"));
    const hasil = await backupPdf({ ...s, fileIds: ["sudah", "lama"], hash: new Map([["lama", sha(lama)]]) });
    assert.deepEqual(s.diunduh, []);
    assert.equal(hasil.baru, 1);
    assert.equal(hasil.total, 2);
    assert.deepEqual(hasil.gagal, []);
  });
});

describe("pendaftaranPerFile", () => {
  it("memetakan file ke pendaftaran yang merujuknya", () => {
    const peta = pendaftaranPerFile([
      { id: 523, file_bukti_kolokium: "/api/files/f1", file_approval_dospem: "/api/files/f2" },
      { id: 524, file_bukti_kolokium: null, file_approval_dospem: "/api/files/f2" },
      { id: 525, file_bukti_kolokium: "bukan-url", file_approval_dospem: null },
    ]);
    assert.deepEqual(peta.get("f1"), [523]);
    assert.deepEqual(peta.get("f2"), [523, 524]);
    assert.equal(peta.size, 2);
  });
});
