import { before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db, siapkanDb, kosongkan, buatUser, buatPeriode, buatPendaftaran, buatKelas, buatSlot, jadikanModerator } from "./helpers";
import { moderator } from "../src/db/schema";
import { pengajuanBatalModerasi, responBatalModerasi } from "../src/lib/moderasi";
import { ambilPendaftaranAdmin } from "../src/lib/admin-pendaftaran";

before(siapkanDb);
beforeEach(kosongkan);

async function moderasi(slotWaktuId?: number) {
  const p = await buatPeriode();
  const kelas = await buatKelas(p.id);
  const userId = await buatUser({ nama: "Mahasiswa", role: "mahasiswa" });
  const dosenId = await buatUser({ nama: "Dosen Moderator", role: "dosen" });
  const reg = await buatPendaftaran({ userId, periodeId: p.id, statusVerifikasi: "disetujui", kelasSeminarId: kelas.id, slotWaktuId });
  await jadikanModerator(reg.id, dosenId);
  return { pendaftaranId: reg.id, dosenId };
}

describe("batal moderasi: alasan wajib dan terlihat oleh admin", () => {
  it("ajukan tanpa alasan → 400, status batal tetap kosong", async () => {
    const m = await moderasi();
    for (const reason of [undefined, "", "  "]) {
      const hasil = await pengajuanBatalModerasi({ ...m, action: "ajukan", reason });
      assert.deepEqual(hasil, { error: "Alasan pembatalan wajib diisi.", status: 400 });
    }
    const [mod] = await db.select().from(moderator).where(eq(moderator.pendaftaranId, m.pendaftaranId));
    assert.equal(mod.batalStatus, null);
  });

  it("ajukan dengan alasan → tersimpan dan tampil di data admin", async () => {
    const m = await moderasi();
    const hasil = await pengajuanBatalModerasi({ ...m, action: "ajukan", reason: "  Ada rapat jurusan di jam yang sama.  " });
    assert.ok("message" in hasil);
    const baris = (await ambilPendaftaranAdmin()).find(r => r.id === m.pendaftaranId);
    assert.equal(baris?.moderatorBatalStatus, "menunggu");
    assert.equal(baris?.moderatorBatalReason, "Ada rapat jurusan di jam yang sama.");
  });

  it("alasan lebih dari 500 karakter → 400", async () => {
    const m = await moderasi();
    const hasil = await pengajuanBatalModerasi({ ...m, action: "ajukan", reason: "x".repeat(501) });
    assert.ok("error" in hasil && hasil.status === 400);
  });

  it("hanya moderatornya sendiri yang boleh mengajukan", async () => {
    const m = await moderasi();
    const lain = await buatUser({ nama: "Dosen Lain", role: "dosen" });
    const hasil = await pengajuanBatalModerasi({ ...m, dosenId: lain, action: "ajukan", reason: "Bentrok" });
    assert.ok("error" in hasil && hasil.status === 403);
  });

  it("menarik pengajuan tidak memerlukan alasan", async () => {
    const m = await moderasi();
    await pengajuanBatalModerasi({ ...m, action: "ajukan", reason: "Bentrok" });
    const tarik = await pengajuanBatalModerasi({ ...m, action: "batalkan_pengajuan", reason: "" });
    assert.ok("message" in tarik);
  });
});

describe("batal moderasi: setelah seminar berlangsung", () => {
  const tanggal = (selisihHari: number) => new Date(Date.now() + selisihHari * 86400000).toISOString().slice(0, 10);

  it("dosen tidak bisa mengajukan batal untuk seminar yang sudah lewat", async () => {
    const slot = await buatSlot(tanggal(-2), 9);
    const m = await moderasi(slot.id);
    const hasil = await pengajuanBatalModerasi({ ...m, action: "ajukan", reason: "Bentrok" });
    assert.deepEqual(hasil, { error: "Seminar ini sudah berlangsung, moderasi tidak dapat dibatalkan.", status: 400 });
  });

  it("admin tidak bisa menyetujui pengajuan yang menunggu setelah seminar lewat, moderator tetap ada", async () => {
    const slot = await buatSlot(tanggal(-2), 9);
    const m = await moderasi(slot.id);
    await db.update(moderator).set({ batalStatus: "menunggu", batalReason: "Bentrok" }).where(eq(moderator.pendaftaranId, m.pendaftaranId));
    const hasil = await responBatalModerasi({ pendaftaranId: m.pendaftaranId, action: "setujui" });
    assert.ok("error" in hasil && hasil.status === 400);
    const [mod] = await db.select().from(moderator).where(eq(moderator.pendaftaranId, m.pendaftaranId));
    assert.equal(mod.dosenId, m.dosenId);
    assert.equal(mod.batalStatus, "menunggu");
  });

  it("admin masih bisa menolak, dan dosen masih bisa menarik, setelah seminar lewat", async () => {
    const slot = await buatSlot(tanggal(-2), 9);
    const m = await moderasi(slot.id);
    await db.update(moderator).set({ batalStatus: "menunggu", batalReason: "Bentrok" }).where(eq(moderator.pendaftaranId, m.pendaftaranId));
    const tarik = await pengajuanBatalModerasi({ ...m, action: "batalkan_pengajuan", reason: "" });
    assert.ok("message" in tarik);
    await db.update(moderator).set({ batalStatus: "menunggu" }).where(eq(moderator.pendaftaranId, m.pendaftaranId));
    const tolak = await responBatalModerasi({ pendaftaranId: m.pendaftaranId, action: "tolak" });
    assert.ok("message" in tolak);
  });

  it("seminar yang belum mulai: pengajuan disetujui admin, slot moderator kosong", async () => {
    const slot = await buatSlot(tanggal(3), 9);
    const m = await moderasi(slot.id);
    await pengajuanBatalModerasi({ ...m, action: "ajukan", reason: "Bentrok" });
    const hasil = await responBatalModerasi({ pendaftaranId: m.pendaftaranId, action: "setujui" });
    assert.ok("message" in hasil);
    const sisa = await db.select().from(moderator).where(eq(moderator.pendaftaranId, m.pendaftaranId));
    assert.equal(sisa.length, 0);
  });
});
