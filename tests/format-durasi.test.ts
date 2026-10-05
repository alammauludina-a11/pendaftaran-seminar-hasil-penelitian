import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatDurasi } from "../src/lib/format-durasi";

describe("formatDurasi", () => {
  it("memakai hari di bawah satu bulan dan bulan sesudahnya", () => {
    assert.equal(formatDurasi(0.4), "1 hari");
    assert.equal(formatDurasi(3), "3 hari");
    assert.equal(formatDurasi(29.4), "29 hari");
    assert.equal(formatDurasi(30), "1 bulan");
    assert.equal(formatDurasi(72), "2,4 bulan");
  });
});
