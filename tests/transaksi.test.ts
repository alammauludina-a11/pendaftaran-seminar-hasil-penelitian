import { before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db, siapkanDb, kosongkan, buatUser } from "./helpers";
import { pendaftaran } from "../src/db/schema";
import { transaksi } from "../src/db";

describe("transaksi", () => {
  before(siapkanDb);
  beforeEach(kosongkan);

  it("membatalkan semua perubahan jika terjadi error di tengah", async () => {
    const userId = await buatUser({ nama: "A", role: "mahasiswa" });
    await assert.rejects(transaksi(async (tx) => {
      await tx.insert(pendaftaran).values({ userId });
      throw new Error("gagal di tengah");
    }), /gagal di tengah/);
    assert.equal((await db.select().from(pendaftaran)).length, 0);
  });

  it("request serentak yang cek-lalu-simpan hanya menghasilkan satu data", async () => {
    const userId = await buatUser({ nama: "A", role: "mahasiswa" });
    const hasil = await Promise.all(Array.from({ length: 30 }, () => transaksi(async (tx) => {
      const ada = await tx.select().from(pendaftaran).where(eq(pendaftaran.userId, userId));
      await new Promise(r => setTimeout(r, 2)); // beri kesempatan request lain menyela
      if (ada.length > 0) return "ditolak";
      await tx.insert(pendaftaran).values({ userId });
      return "berhasil";
    })));
    assert.equal(hasil.filter(h => h === "berhasil").length, 1);
    assert.equal((await db.select().from(pendaftaran)).length, 1);
  });

  it("transaksi berikutnya tetap jalan setelah ada transaksi yang gagal", async () => {
    const userId = await buatUser({ nama: "A", role: "mahasiswa" });
    await transaksi(async () => { throw new Error("x"); }).catch(() => {});
    await transaksi(tx => tx.insert(pendaftaran).values({ userId }));
    assert.equal((await db.select().from(pendaftaran)).length, 1);
  });
});
