import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isValidSlotTime, isSundayIso, dosenTerjadwal } from "../src/lib/slot-rules";

const SENIN = "2027-03-01";
const MINGGU = "2027-03-07";
const jam = (iso: string, h: number, m = 0) => new Date(`${iso}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+07:00`);

describe("isValidSlotTime", () => {
  it("menerima jam 08.00 sampai 16.00 WIB", () => {
    for (const h of [8, 9, 10, 11, 13, 14, 15, 16]) {
      assert.equal(isValidSlotTime(jam(SENIN, h)), true, `jam ${h}`);
    }
  });

  it("menolak jam istirahat 12.00", () => {
    assert.equal(isValidSlotTime(jam(SENIN, 12)), false);
    assert.equal(isValidSlotTime(jam(SENIN, 12, 30)), false);
  });

  it("menolak di luar jam 08–16 WIB", () => {
    assert.equal(isValidSlotTime(jam(SENIN, 7)), false);
    assert.equal(isValidSlotTime(jam(SENIN, 17)), false);
  });

  it("menolak hari Minggu, tapi menerima Sabtu", () => {
    assert.equal(isValidSlotTime(jam(MINGGU, 9)), false);
    assert.equal(isValidSlotTime(jam("2027-03-06", 9)), true);
  });

  it("memakai waktu WIB, bukan zona waktu server", () => {
    // 01.00 UTC = 08.00 WIB (valid); 05.00 UTC = 12.00 WIB (istirahat)
    assert.equal(isValidSlotTime(new Date("2027-03-01T01:00:00Z")), true);
    assert.equal(isValidSlotTime(new Date("2027-03-01T05:00:00Z")), false);
  });

  it("menerima timestamp angka/string dan menolak input tidak valid", () => {
    assert.equal(isValidSlotTime(jam(SENIN, 9).getTime()), true);
    assert.equal(isValidSlotTime(jam(SENIN, 9).toISOString()), true);
    assert.equal(isValidSlotTime("bukan tanggal"), false);
  });
});

describe("isSundayIso", () => {
  it("mengenali hari Minggu", () => {
    assert.equal(isSundayIso(MINGGU), true);
    assert.equal(isSundayIso(SENIN), false);
  });
});

describe("dosenTerjadwal (sembunyikan slot jika dosen yang login sudah terjadwal)", () => {
  const DOSEN = "dosen-login";
  const reg = (r: Partial<{ dospem1Id: string; dospem2Id: string; moderatorId: string }>) => ({
    dospem1Id: null, dospem2Id: null, moderatorId: null, ...r,
  });

  it("menyembunyikan slot jika dosen menjadi pembimbing 1", () => {
    assert.equal(dosenTerjadwal([reg({ dospem1Id: DOSEN, dospem2Id: "lain" })], DOSEN), true);
  });

  it("menyembunyikan slot jika dosen menjadi pembimbing 2", () => {
    assert.equal(dosenTerjadwal([reg({ dospem1Id: "lain", dospem2Id: DOSEN })], DOSEN), true);
  });

  it("menyembunyikan slot jika dosen menjadi moderator", () => {
    assert.equal(dosenTerjadwal([reg({ dospem1Id: "lain", moderatorId: DOSEN })], DOSEN), true);
  });

  it("tetap menampilkan slot jika yang terjadwal dosen lain", () => {
    const regs = [reg({ dospem1Id: "dosen-a", dospem2Id: "dosen-b", moderatorId: "dosen-c" })];
    assert.equal(dosenTerjadwal(regs, DOSEN), false);
  });

  it("tetap menampilkan slot tanpa pendaftaran", () => {
    assert.equal(dosenTerjadwal([], DOSEN), false);
  });
});
