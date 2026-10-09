import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { urutkanVerifikasi } from "../src/lib/urut-verifikasi";

const nama = (list: { name?: string | null }[]) => list.map(x => x.name);

describe("urutkanVerifikasi", () => {
  it("mengurutkan kelas secara alami dan menaruh yang kosong di akhir", () => {
    const list = [{ name: "A", kelas: "Kelas 10" }, { name: "B", kelas: null }, { name: "C", kelas: "Kelas 2" }];
    assert.deepEqual(nama(urutkanVerifikasi(list, "kelas", "asc")), ["C", "A", "B"]);
    assert.deepEqual(nama(urutkanVerifikasi(list, "kelas", "desc")), ["A", "C", "B"]);
  });

  it("mengurutkan jadwal menurut waktu sebenarnya, bukan teks tanggal", () => {
    const list = [
      { name: "A", waktuMulai: "2026-08-05T01:00:00.000Z" },
      { name: "B", waktuMulai: "2026-03-20T01:00:00.000Z" },
      { name: "C", waktuMulai: "2026-03-20T03:00:00.000Z" },
      { name: "D", waktuMulai: null },
    ];
    assert.deepEqual(nama(urutkanVerifikasi(list, "date", "asc")), ["B", "C", "A", "D"]);
  });

  it("mengurutkan status menunggu, disetujui, lalu ditolak", () => {
    const list = [{ name: "A", status: "ditolak" }, { name: "B", status: "disetujui" }, { name: "C", status: "menunggu" }];
    assert.deepEqual(nama(urutkanVerifikasi(list, "status", "asc")), ["C", "B", "A"]);
  });

  it("mengurutkan ruangan yang ditampilkan (disetujui, atau yang diajukan)", () => {
    const list = [
      { name: "A", statusRuangan: "disetujui", room: "RK B", ruanganDiajukan: "RK Z" },
      { name: "B", statusRuangan: "menunggu", room: "RK C", ruanganDiajukan: "RK A" },
      { name: "C", statusRuangan: "menunggu", room: null, ruanganDiajukan: null },
    ];
    assert.deepEqual(nama(urutkanVerifikasi(list, "room", "asc")), ["B", "A", "C"]);
  });

  it("mengurutkan NIM dan teks tanpa memedulikan huruf besar", () => {
    const list = [{ name: "budi", nim: "J3401220010" }, { name: "Ani", nim: "J3401220002" }, { name: "citra", nim: "J3401220100" }];
    assert.deepEqual(nama(urutkanVerifikasi(list, "nim", "asc")), ["Ani", "budi", "citra"]);
    assert.deepEqual(nama(urutkanVerifikasi(list, "name", "desc")), ["citra", "budi", "Ani"]);
  });
});
