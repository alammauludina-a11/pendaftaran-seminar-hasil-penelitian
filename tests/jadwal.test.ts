import { before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { eq, isNotNull } from "drizzle-orm";
import {
  db, siapkanDb, kosongkan, seninDepan, jamWIB,
  buatUser, buatPeriode, buatSlot, buatPendaftaran, buatKelas, jadikanModerator,
} from "./helpers";
import { pendaftaran, kelasSeminar } from "../src/db/schema";
import { transaksi } from "../src/db";
import { formClassFromQueue, findDosenClash, isPembimbing, validasiSlot } from "../src/lib/jadwal";

before(siapkanDb);
beforeEach(kosongkan);

describe("formClassFromQueue", () => {
  async function antrean(periodeId: number, jumlah: number) {
    const ids: number[] = [];
    for (let i = 0; i < jumlah; i++) {
      const userId = await buatUser({ nama: `Mhs ${i}`, role: "mahasiswa" });
      ids.push((await buatPendaftaran({ userId, periodeId, statusVerifikasi: "disetujui" })).id);
    }
    return ids;
  }

  it("membentuk kelas sebanyak batas kelas, sisanya tetap di antrean", async () => {
    const p = await buatPeriode({ batasKelas: 3 });
    const ids = await antrean(p.id, 4);

    const a = await formClassFromQueue(p.id);
    assert.equal(a?.className, "A");
    assert.equal(a?.count, 3);
    const diKelasA = await db.select({ id: pendaftaran.id }).from(pendaftaran).where(eq(pendaftaran.kelasSeminarId, a!.kelas.id));
    assert.deepEqual(diKelasA.map(r => r.id).sort((x, y) => x - y), ids.slice(0, 3), "yang mendaftar lebih dulu masuk lebih dulu");

    const b = await formClassFromQueue(p.id);
    assert.equal(b?.className, "B");
    assert.equal(b?.count, 1);

    assert.equal(await formClassFromQueue(p.id), null, "antrean sudah kosong");
  });

  it("tidak membentuk kelas sebelum antrean mencapai minimal", async () => {
    const p = await buatPeriode({ batasKelas: 3 });
    await antrean(p.id, 2);
    assert.equal(await formClassFromQueue(p.id, { minStudents: 3 }), null);
    assert.equal((await db.select().from(kelasSeminar)).length, 0);
  });

  it("hanya mengambil pendaftaran yang disetujui di periode itu", async () => {
    const p = await buatPeriode();
    const lain = await buatPeriode({ angkatan: "61" });
    const u = await buatUser({ nama: "X", role: "mahasiswa" });
    await buatPendaftaran({ userId: u, periodeId: p.id, statusVerifikasi: "menunggu" });
    await buatPendaftaran({ userId: u, periodeId: p.id, statusVerifikasi: "ditolak" });
    await buatPendaftaran({ userId: u, periodeId: lain.id, statusVerifikasi: "disetujui" });
    assert.equal(await formClassFromQueue(p.id), null);
  });

  it("memakai nama kelas pertama yang belum terpakai", async () => {
    const p = await buatPeriode();
    await buatKelas(p.id, "A");
    await buatKelas(p.id, "C");
    await antrean(p.id, 1);
    assert.equal((await formClassFromQueue(p.id))?.className, "B");
  });

  it("dua pembentukan kelas bersamaan tidak memasukkan mahasiswa ke dua kelas", async () => {
    const p = await buatPeriode({ batasKelas: 3 });
    await antrean(p.id, 3);
    const hasil = await Promise.all([
      transaksi(tx => formClassFromQueue(p.id, {}, tx)),
      transaksi(tx => formClassFromQueue(p.id, {}, tx)),
    ]);
    assert.equal(hasil.filter(Boolean).length, 1, "hanya satu kelas terbentuk");
    assert.equal((await db.select().from(kelasSeminar)).length, 1);
    assert.equal((await db.select().from(pendaftaran).where(isNotNull(pendaftaran.kelasSeminarId))).length, 3);
  });
});

describe("findDosenClash", () => {
  async function seminar(opts: { jam: number; dospem1Id?: string; status?: "menunggu" | "disetujui" | "ditolak" }) {
    const slot = await buatSlot(seninDepan(), opts.jam);
    const userId = await buatUser({ nama: `Mhs jam ${opts.jam}`, role: "mahasiswa" });
    return buatPendaftaran({ userId, slotWaktuId: slot.id, dospem1Id: opts.dospem1Id, statusVerifikasi: opts.status ?? "disetujui" });
  }
  const cek = (dosenId: string, jam: number, excludePendaftaranId = -1) =>
    findDosenClash({ dosenId, dosenName: "Dosen", waktuMulai: jamWIB(seninDepan(), jam), excludePendaftaranId });

  it("mendeteksi dosen yang menjadi pembimbing di jam yang sama", async () => {
    const budi = await buatUser({ nama: "Pak Budi", role: "dosen" });
    await seminar({ jam: 9, dospem1Id: budi });
    assert.match((await cek(budi, 9)) ?? "", /pembimbing/);
  });

  it("mendeteksi dosen yang menjadi moderator di jam yang sama", async () => {
    const budi = await buatUser({ nama: "Pak Budi", role: "dosen" });
    const ani = await buatUser({ nama: "Bu Ani", role: "dosen" });
    const s = await seminar({ jam: 9, dospem1Id: ani });
    await jadikanModerator(s.id, budi);
    assert.match((await cek(budi, 9)) ?? "", /moderator/);
  });

  it("tidak bentrok di jam lain, di pendaftaran yang ditolak, atau di seminar yang sedang diproses", async () => {
    const budi = await buatUser({ nama: "Pak Budi", role: "dosen" });
    await seminar({ jam: 9, dospem1Id: budi });
    await seminar({ jam: 10, dospem1Id: budi, status: "ditolak" });
    const sendiri = await seminar({ jam: 11, dospem1Id: budi });
    assert.equal(await cek(budi, 10), null);
    assert.equal(await cek(budi, 11, sendiri.id), null);
    assert.equal(await cek(budi, 13), null);
  });

  it("membedakan dua dosen yang namanya sama (dicocokkan lewat ID)", async () => {
    const budiA = await buatUser({ nama: "Dr. Budi", role: "dosen" });
    const budiB = await buatUser({ nama: "Dr. Budi", role: "dosen" });
    await seminar({ jam: 9, dospem1Id: budiA });
    assert.equal(await cek(budiB, 9), null);
    assert.notEqual(await cek(budiA, 9), null);
  });
});

describe("isPembimbing", () => {
  it("benar untuk pembimbing 1 atau 2, salah untuk dosen lain", () => {
    const p = { dospem1Id: "a", dospem2Id: "b" };
    assert.equal(isPembimbing(p, "a"), true);
    assert.equal(isPembimbing(p, "b"), true);
    assert.equal(isPembimbing(p, "c"), false);
    assert.equal(isPembimbing({ dospem1Id: null, dospem2Id: null }, "a"), false);
  });
});

describe("validasiSlot", () => {
  const periode = { startDate: seninDepan(), endDate: seninDepan(5) };
  let budi = "";
  const opsi = (slotId: number, extra: Partial<Parameters<typeof validasiSlot>[0]> = {}) =>
    validasiSlot({ slotId, jenisSeminar: "hasil_penelitian", periode, dospem1Id: budi, dospem2Id: "", ...extra });

  beforeEach(async () => {
    budi = await buatUser({ nama: "Pak Budi", role: "dosen" });
  });

  it("menerima slot yang valid", async () => {
    const slot = await buatSlot(seninDepan(), 9);
    const hasil = await opsi(slot.id);
    assert.ok("waktuMulai" in hasil);
  });

  it("menolak slot yang tidak ada, jam istirahat, sudah lewat, atau di luar periode", async () => {
    assert.equal((await opsi(999999) as { status: number }).status, 404);

    const istirahat = await buatSlot(seninDepan(), 12);
    assert.equal((await opsi(istirahat.id) as { status: number }).status, 400);

    const lewat = await buatSlot("2020-03-02", 9);
    assert.equal((await opsi(lewat.id, { periode: { startDate: null, endDate: null } }) as { status: number }).status, 400);

    const luar = await buatSlot(seninDepan(7), 9);
    assert.match((await opsi(luar.id) as { error: string }).error, /di luar rentang/);
  });

  it("memblokir slot yang pendaftar sebelumnya masih menunggu kelas (jenis seminar sama)", async () => {
    const ani = await buatUser({ nama: "Bu Ani", role: "dosen" });
    const slot = await buatSlot(seninDepan(), 9);
    const u = await buatUser({ nama: "A", role: "mahasiswa" });
    const p = await buatPendaftaran({ userId: u, slotWaktuId: slot.id, dospem1Id: ani, jenisSeminar: "hasil_penelitian" });

    assert.equal((await opsi(slot.id) as { status: number }).status, 409);
    assert.ok("waktuMulai" in await opsi(slot.id, { jenisSeminar: "kolokium" }), "jenis seminar lain tidak terblokir");
    assert.ok("waktuMulai" in await opsi(slot.id, { excludePendaftaranId: p.id }), "pendaftaran sendiri diabaikan");

    // Setelah kelasnya terbentuk, jam yang sama boleh dipakai paralel (dengan pembimbing lain)
    const k = await buatKelas((await buatPeriode()).id);
    await db.update(pendaftaran).set({ kelasSeminarId: k.id }).where(eq(pendaftaran.id, p.id));
    assert.ok("waktuMulai" in await opsi(slot.id));
  });

  it("menolak jika pembimbing sudah terjadwal di jam yang sama sebagai pembimbing atau moderator", async () => {
    const ani = await buatUser({ nama: "Bu Ani", role: "dosen" });
    const joko = await buatUser({ nama: "Pak Joko", role: "dosen" });
    const slot = await buatSlot(seninDepan(), 9);
    const k = await buatKelas((await buatPeriode()).id);
    const u = await buatUser({ nama: "A", role: "mahasiswa" });
    const p = await buatPendaftaran({ userId: u, slotWaktuId: slot.id, dospem1Id: ani, kelasSeminarId: k.id });

    assert.equal((await opsi(slot.id, { dospem1Id: ani }) as { status: number }).status, 409);
    assert.equal((await opsi(slot.id, { dospem1Id: joko, dospem2Id: ani }) as { status: number }).status, 409);

    await jadikanModerator(p.id, budi);
    assert.equal((await opsi(slot.id, { dospem1Id: budi }) as { status: number }).status, 409);
    assert.ok("waktuMulai" in await opsi(slot.id, { dospem1Id: joko }));
  });

  it("tidak tertipu nama yang sama: dosen lain bernama sama tetap boleh", async () => {
    const budiLain = await buatUser({ nama: "Pak Budi", role: "dosen" });
    const slot = await buatSlot(seninDepan(), 9);
    const k = await buatKelas((await buatPeriode()).id);
    const u = await buatUser({ nama: "A", role: "mahasiswa" });
    await buatPendaftaran({ userId: u, slotWaktuId: slot.id, dospem1Id: budi, dospem1: "Pak Budi", kelasSeminarId: k.id });
    assert.ok("waktuMulai" in await opsi(slot.id, { dospem1Id: budiLain }));
  });
});
