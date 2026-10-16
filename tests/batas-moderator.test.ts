import { before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { db, siapkanDb, kosongkan, buatUser, buatPeriode, buatPendaftaran, jadikanModerator } from "./helpers";
import { periode } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { ambilBatasModerator, bacaAngkaIsian, batasTercapai, infoBatasModerator, simpanPengecualian } from "../src/lib/batas-moderator";

before(siapkanDb);
beforeEach(kosongkan);

/** A dosen moderating `jumlah` seminars in a periode with the given limit. */
async function dosenDenganModerasi(batasModerator: number | null, jumlah: number) {
  const p = await buatPeriode({ batasModerator });
  const dosenId = await buatUser({ nama: "Dosen", role: "dosen" });
  for (let i = 0; i < jumlah; i++) {
    const mhs = await buatUser({ nama: `Mahasiswa ${i}`, role: "mahasiswa" });
    const reg = await buatPendaftaran({ userId: mhs, periodeId: p.id, statusVerifikasi: "disetujui" });
    await jadikanModerator(reg.id, dosenId);
  }
  return { periodeId: p.id, dosenId };
}

describe("batas moderator per periode", () => {
  it("tanpa batas → tidak pernah tercapai", async () => {
    const { periodeId, dosenId } = await dosenDenganModerasi(null, 5);
    const info = await infoBatasModerator(dosenId, periodeId);
    assert.deepEqual(info, { batas: null, tambahan: 0, terpakai: 5 });
    assert.equal(batasTercapai(info), false);
  });

  it("tercapai saat jumlah moderasi sama dengan batas", async () => {
    const { periodeId, dosenId } = await dosenDenganModerasi(2, 1);
    assert.equal(batasTercapai(await infoBatasModerator(dosenId, periodeId)), false);
    const mhs = await buatUser({ nama: "Mahasiswa X", role: "mahasiswa" });
    const reg = await buatPendaftaran({ userId: mhs, periodeId, statusVerifikasi: "disetujui" });
    await jadikanModerator(reg.id, dosenId);
    assert.equal(batasTercapai(await infoBatasModerator(dosenId, periodeId)), true);
  });

  it("moderasi di periode lain tidak dihitung", async () => {
    const { dosenId } = await dosenDenganModerasi(1, 3);
    const lain = await buatPeriode({ angkatan: "61", batasModerator: 1 });
    const info = await infoBatasModerator(dosenId, lain.id);
    assert.equal(info.terpakai, 0);
    assert.equal(batasTercapai(info), false);
  });

  it("pengecualian menambah batas, dan bisa dihapus lagi", async () => {
    const { periodeId, dosenId } = await dosenDenganModerasi(2, 3);
    assert.equal(batasTercapai(await infoBatasModerator(dosenId, periodeId)), true);

    await simpanPengecualian(periodeId, dosenId, 2);
    assert.equal(batasTercapai(await infoBatasModerator(dosenId, periodeId)), false);
    await simpanPengecualian(periodeId, dosenId, 1); // update, not a second row
    assert.deepEqual(await ambilBatasModerator(periodeId), { batas: 2, pengecualian: { [dosenId]: 1 } });
    assert.equal(batasTercapai(await infoBatasModerator(dosenId, periodeId)), true);

    await simpanPengecualian(periodeId, dosenId, null);
    assert.deepEqual(await ambilBatasModerator(periodeId), { batas: 2, pengecualian: {} });
  });

  it("menghapus periode ikut menghapus pengecualiannya", async () => {
    const { periodeId, dosenId } = await dosenDenganModerasi(1, 0);
    await simpanPengecualian(periodeId, dosenId, 3);
    await db.delete(periode).where(eq(periode.id, periodeId));
    assert.equal(await ambilBatasModerator(periodeId), null);
  });

  it("isian angka: kosong menghapus, selain bilangan bulat dalam rentang ditolak", () => {
    assert.deepEqual(bacaAngkaIsian(""), { ok: true, angka: null });
    assert.deepEqual(bacaAngkaIsian(null), { ok: true, angka: null });
    assert.deepEqual(bacaAngkaIsian(0), { ok: true, angka: 0 });
    assert.deepEqual(bacaAngkaIsian("4"), { ok: true, angka: 4 });
    for (const salah of [-1, 1.5, "abc", 1000, undefined]) assert.equal(bacaAngkaIsian(salah).ok, false);
    assert.equal(bacaAngkaIsian(0, 1).ok, false);
  });
});
