import { before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { db, siapkanDb, kosongkan, seninDepan } from "./helpers";
import { slotWaktu } from "../src/db/schema";
import { autoGenerateSlots } from "../src/lib/slot-generator";
import { isValidSlotTime } from "../src/lib/slot-rules";

describe("autoGenerateSlots", () => {
  before(siapkanDb);
  beforeEach(kosongkan);

  it("membuat 8 slot per hari Senin–Sabtu dan melewati hari Minggu", async () => {
    // Senin s/d Minggu: 6 hari kerja × 8 slot (08–16, tanpa 12.00)
    await autoGenerateSlots(seninDepan(), seninDepan(6));
    const slots = await db.select().from(slotWaktu);
    assert.equal(slots.length, 48);
    for (const s of slots) {
      assert.equal(isValidSlotTime(s.waktuMulai), true, `slot ${s.waktuMulai.toISOString()} tidak valid`);
      assert.equal(s.waktuSelesai.getTime() - s.waktuMulai.getTime(), 50 * 60 * 1000, "durasi slot 50 menit");
    }
  });

  it("tidak membuat slot ganda saat dijalankan ulang", async () => {
    await autoGenerateSlots(seninDepan(), seninDepan(1));
    await autoGenerateSlots(seninDepan(), seninDepan(1));
    const slots = await db.select().from(slotWaktu);
    assert.equal(slots.length, 16);
    assert.equal(new Set(slots.map(s => s.waktuMulai.getTime())).size, 16);
  });

  it("tidak melakukan apa pun tanpa tanggal", async () => {
    await autoGenerateSlots("", "");
    assert.equal((await db.select().from(slotWaktu)).length, 0);
  });
});
