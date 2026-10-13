import { before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db, siapkanDb, kosongkan, buatUser, buatPeriode, buatPendaftaran } from "./helpers";
import { pendaftaran } from "../src/db/schema";
import { transaksi } from "../src/db";
import { ubahVerifikasi } from "../src/lib/verifikasi";

before(siapkanDb);
beforeEach(kosongkan);

async function pendaftaranBaru() {
  const p = await buatPeriode();
  const userId = await buatUser({ nama: "Mahasiswa", role: "mahasiswa" });
  return (await buatPendaftaran({ userId, periodeId: p.id })).id;
}

const verifikasi = (id: number, status: string, note?: string) => transaksi(tx => ubahVerifikasi(tx, id, { status, note }));
const simpanan = async (id: number) => (await db.select().from(pendaftaran).where(eq(pendaftaran.id, id)))[0];

describe("verifikasi: penolakan wajib disertai catatan", () => {
  it("tolak tanpa catatan (atau hanya spasi) → 400, data tidak berubah", async () => {
    const id = await pendaftaranBaru();
    for (const note of [undefined, "", "   "]) {
      const hasil = await verifikasi(id, "ditolak", note);
      assert.deepEqual(hasil, { error: "Catatan penolakan wajib diisi agar mahasiswa tahu yang perlu diperbaiki.", status: 400 });
    }
    assert.equal((await simpanan(id)).statusVerifikasi, "menunggu");
  });

  it("tolak dengan catatan → status dan catatan tersimpan, ada entri log", async () => {
    const id = await pendaftaranBaru();
    const hasil = await verifikasi(id, "ditolak", "  Berkas persetujuan dospem belum ditandatangani.  ");
    assert.ok("log" in hasil && hasil.log.aksi === "verifikasi.ditolak");
    const p = await simpanan(id);
    assert.equal(p.statusVerifikasi, "ditolak");
    assert.equal(p.catatanAdmin, "Berkas persetujuan dospem belum ditandatangani.");
  });

  it("catatan lebih dari 500 karakter → 400", async () => {
    const id = await pendaftaranBaru();
    const hasil = await verifikasi(id, "ditolak", "x".repeat(501));
    assert.ok("error" in hasil && hasil.status === 400);
  });

  it("setujui tanpa catatan tetap boleh", async () => {
    const id = await pendaftaranBaru();
    const hasil = await verifikasi(id, "disetujui");
    assert.ok("log" in hasil);
    assert.equal((await simpanan(id)).statusVerifikasi, "disetujui");
  });
});

describe("verifikasi: status sama tidak ditulis dan tidak dicatat", () => {
  it("klik ganda Setujui → permintaan kedua unchanged, tanpa entri log", async () => {
    const id = await pendaftaranBaru();
    const pertama = await verifikasi(id, "disetujui");
    assert.ok("log" in pertama);
    const kedua = await verifikasi(id, "disetujui");
    assert.deepEqual(kedua, { unchanged: true });
  });

  it("status sama tapi catatan berubah → tetap disimpan dan dicatat", async () => {
    const id = await pendaftaranBaru();
    await verifikasi(id, "ditolak", "Catatan lama");
    assert.deepEqual(await verifikasi(id, "ditolak", "Catatan lama"), { unchanged: true });
    const ubah = await verifikasi(id, "ditolak", "Catatan baru");
    assert.ok("log" in ubah);
    assert.equal((await simpanan(id)).catatanAdmin, "Catatan baru");
  });

  it("pendaftaran yang sudah final: permintaan yang tidak mengubah apa pun tidak menjadi error", async () => {
    const id = await pendaftaranBaru();
    await verifikasi(id, "disetujui");
    await db.update(pendaftaran).set({ isFinalized: true, isReleased: true }).where(eq(pendaftaran.id, id));
    assert.deepEqual(await verifikasi(id, "disetujui"), { unchanged: true });
    const tolak = await verifikasi(id, "ditolak", "Coba tolak");
    assert.ok("error" in tolak && tolak.status === 400);
  });
});

// Batal moderasi (alasan wajib) is covered in tests/batal-moderasi.test.ts
