import { before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, siapkanDb } from "./helpers";
import { files } from "../src/db/schema";
import {
  bacaFile, isiFile, kosongkanBase64, pindahkanKeDisk, simpanFile, statusPenyimpanan, uploadDir,
} from "../src/lib/file-storage";

const pdf = (n = 3000) => Buffer.concat([Buffer.from("%PDF-1.7\n"), crypto.randomBytes(n)]);
async function fileLama(isi: Buffer) {
  const id = crypto.randomUUID();
  await db.insert(files).values({ id, name: "lama.pdf", mimeType: "application/pdf", data: isi.toString("base64") });
  return id;
}

describe("file-storage", () => {
  before(siapkanDb);
  beforeEach(async () => {
    await db.delete(files);
    await rm(uploadDir(), { recursive: true, force: true });
  });

  it("menyimpan dan membaca file dari disk beserta ukuran dan sha256", async () => {
    const isi = pdf();
    const meta = await simpanFile("abc-123", isi);
    assert.equal(meta.storageKey, "abc-123.pdf");
    assert.equal(meta.size, isi.length);
    assert.deepEqual(await bacaFile(meta.storageKey), isi);
  });

  it("menolak storage key yang bisa keluar dari folder upload", async () => {
    await assert.rejects(bacaFile("../../etc/passwd"), /tidak valid/);
    await assert.rejects(simpanFile("../luar", pdf()), /tidak valid/);
  });

  it("isiFile membaca dari disk, dan memakai base64 lama bila belum dipindah", async () => {
    const isi = pdf();
    const id = await fileLama(isi);
    assert.deepEqual(await isiFile({ id, storageKey: null }), isi);
    const meta = await simpanFile(id, isi);
    await db.update(files).set({ ...meta, data: "" }).where(eq(files.id, id));
    assert.deepEqual(await isiFile({ id, storageKey: meta.storageKey }), isi);
    assert.equal(await isiFile({ id: "tidak-ada", storageKey: null }), null);
  });

  it("memindahkan file lama ke disk tanpa menghapus base64, lalu mengosongkannya setelah diverifikasi", async () => {
    const isi = [pdf(1000), pdf(2000), pdf(3000)];
    const ids = [];
    for (const b of isi) ids.push(await fileLama(b));

    const satu = await pindahkanKeDisk(2);
    assert.deepEqual(satu, { dipindah: 2, sisa: 1 });
    assert.deepEqual(await pindahkanKeDisk(50), { dipindah: 1, sisa: 0 });
    assert.deepEqual(await statusPenyimpanan(), { total: 3, diDisk: 3, belumDipindah: 0, masihAdaBase64: 3 });

    for (const [i, id] of ids.entries()) assert.deepEqual(await bacaFile(`${id}.pdf`), isi[i]);

    const hasil = await kosongkanBase64();
    assert.equal(hasil.dikosongkan, 3);
    assert.equal(hasil.sisa, 0);
    for (const [i, id] of ids.entries()) assert.deepEqual(await isiFile({ id, storageKey: `${id}.pdf` }), isi[i]);
  });

  it("tidak mengosongkan base64 bila file di disk hilang atau berubah", async () => {
    const a = await fileLama(pdf());
    const b = await fileLama(pdf());
    await pindahkanKeDisk();
    await rm(path.join(uploadDir(), `${a}.pdf`));
    await writeFile(path.join(uploadDir(), `${b}.pdf`), "rusak");

    const hasil = await kosongkanBase64();
    assert.equal(hasil.dikosongkan, 0);
    assert.equal(hasil.bermasalah.length, 2);
    const rows = await db.select({ data: files.data }).from(files);
    assert.ok(rows.every(r => r.data !== ""), "base64 tetap ada sebagai cadangan");
    // isiFile tetap bisa menyajikan file yang hilang di disk dari base64
    assert.ok((await isiFile({ id: a, storageKey: `${a}.pdf` }))?.subarray(0, 5).equals(Buffer.from("%PDF-")));
  });
});
