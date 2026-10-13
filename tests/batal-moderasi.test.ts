import { before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db, siapkanDb, kosongkan, buatUser, buatPeriode, buatPendaftaran, buatKelas, jadikanModerator } from "./helpers";
import { moderator } from "../src/db/schema";
import { pengajuanBatalModerasi } from "../src/lib/moderasi";
import { ambilPendaftaranAdmin } from "../src/lib/admin-pendaftaran";

before(siapkanDb);
beforeEach(kosongkan);

async function moderasi() {
  const p = await buatPeriode();
  const kelas = await buatKelas(p.id);
  const userId = await buatUser({ nama: "Mahasiswa", role: "mahasiswa" });
  const dosenId = await buatUser({ nama: "Dosen Moderator", role: "dosen" });
  const reg = await buatPendaftaran({ userId, periodeId: p.id, statusVerifikasi: "disetujui", kelasSeminarId: kelas.id });
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
