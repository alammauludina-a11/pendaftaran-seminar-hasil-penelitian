import { before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db, siapkanDb, kosongkan, buatUser, buatPendaftaran } from "./helpers";
import { pendaftaran } from "../src/db/schema";
import { setujuiPengajuanRuangan } from "../src/lib/ruangan";

describe("setujuiPengajuanRuangan", () => {
  before(siapkanDb);
  beforeEach(kosongkan);

  async function pengajuan(extra: Partial<typeof pendaftaran.$inferInsert> = {}) {
    const userId = await buatUser({ nama: "Mhs", role: "mahasiswa" });
    return buatPendaftaran({
      userId, statusVerifikasi: "disetujui", ruanganDisetujui: "R1", ruanganDiajukan: "R2", statusRuangan: "menunggu", ...extra,
    });
  }

  it("langsung menyetujui bila jadwal belum final", async () => {
    const p = await pengajuan();
    const hasil = await setujuiPengajuanRuangan(p.id);
    assert.equal(hasil.status, "disetujui");
    assert.equal(hasil.status === "disetujui" && hasil.setelahFinal, false);
    const [row] = await db.select().from(pendaftaran).where(eq(pendaftaran.id, p.id));
    assert.equal(row.ruanganDisetujui, "R2");
    assert.equal(row.statusRuangan, "disetujui");
  });

  it("meminta konfirmasi untuk jadwal final, tanpa mengubah apa pun", async () => {
    const p = await pengajuan({ isFinalized: true, isReleased: true });
    const hasil = await setujuiPengajuanRuangan(p.id);
    assert.deepEqual(hasil, { status: "perlu_konfirmasi", dari: "R1", ke: "R2", dirilis: true });
    const [row] = await db.select().from(pendaftaran).where(eq(pendaftaran.id, p.id));
    assert.equal(row.ruanganDisetujui, "R1", "ruangan di pengumuman belum berubah");
  });

  it("mengubah ruangan jadwal final setelah dikonfirmasi, dan menandainya", async () => {
    const p = await pengajuan({ isFinalized: true, isReleased: true });
    const hasil = await setujuiPengajuanRuangan(p.id, { konfirmasiFinal: true });
    assert.equal(hasil.status, "disetujui");
    assert.equal(hasil.status === "disetujui" && hasil.setelahFinal, true);
    const [row] = await db.select().from(pendaftaran).where(eq(pendaftaran.id, p.id));
    assert.equal(row.ruanganDisetujui, "R2");
    assert.equal(row.isFinalized, true, "status final tetap");
  });

  it("menolak bila tidak ada pengajuan yang menunggu atau data tidak ada", async () => {
    const p = await pengajuan({ statusRuangan: "disetujui" });
    assert.equal((await setujuiPengajuanRuangan(p.id)).status, "gagal");
    const hasil = await setujuiPengajuanRuangan(999999);
    assert.equal(hasil.status === "gagal" && hasil.httpStatus, 404);
  });
});
