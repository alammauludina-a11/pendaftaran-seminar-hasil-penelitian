import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buatPemantauan, ringkasPemantauan, urutkanPemantauan, type BarisPemantauan } from "../src/lib/pemantauan";

const periodes = [
  { id: 1, jenisSeminar: "kolokium", angkatan: "60" },
  { id: 2, jenisSeminar: "hasil_penelitian", angkatan: "60" },
  { id: 3, jenisSeminar: "hasil_penelitian", angkatan: "60" },
  { id: 4, jenisSeminar: "kolokium", angkatan: "61" },
];

let nextId = 1;
const daftar = (userId: string, periodeId: number, extra: Record<string, unknown> = {}) => ({
  id: nextId++,
  userId,
  periodeId,
  jenisSeminar: periodeId === 1 || periodeId === 4 ? "kolokium" : "hasil_penelitian",
  name: `Mhs ${userId}`,
  nim: `J${userId}`,
  title: `Judul ${userId}`,
  status: "disetujui" as const,
  ...extra,
});

describe("buatPemantauan", () => {
  it("memakai peserta kolokium angkatan yang sama sebagai acuan", () => {
    const rows = buatPemantauan(periodes[1], periodes, [
      daftar("a", 1),
      daftar("b", 1),
      daftar("c", 4), // angkatan lain
      daftar("a", 2, { status: "menunggu" }),
    ]);
    assert.deepEqual(rows.map(r => [r.userId, r.statusHasil]), [["b", "belum"], ["a", "menunggu"]]);
  });

  it("menandai pendaftar seminar hasil yang tidak tercatat di kolokium", () => {
    const rows = buatPemantauan(periodes[1], periodes, [daftar("a", 1), daftar("x", 2)]);
    const x = rows.find(r => r.userId === "x")!;
    assert.equal(x.statusKolokium, null);
    assert.equal(ringkasPemantauan(rows).tanpaKolokium, 1);
  });

  it("menghitung pendaftaran di periode lain angkatan yang sama sebagai sudah daftar", () => {
    const rows = buatPemantauan(periodes[1], periodes, [daftar("a", 1), daftar("a", 3, { isFinalized: true })]);
    assert.equal(rows[0].statusHasil, "final");
    assert.equal(rows[0].diPeriodeLain, true);
  });

  it("mengutamakan pendaftaran di periode aktif dan yang paling maju", () => {
    const rows = buatPemantauan(periodes[1], periodes, [
      daftar("a", 1, { status: "ditolak" }),
      daftar("a", 1),
      daftar("a", 3, { isReleased: true, isFinalized: true }),
      daftar("a", 2, { status: "ditolak" }),
      daftar("a", 2, { status: "menunggu" }),
    ]);
    assert.equal(rows[0].statusKolokium, "disetujui");
    assert.equal(rows[0].statusHasil, "menunggu");
    assert.equal(rows[0].diPeriodeLain, false);
  });

  it("menghitung yang ditolak sebagai belum daftar", () => {
    const rows = buatPemantauan(periodes[1], periodes, [
      daftar("a", 1), daftar("b", 1), daftar("c", 1),
      daftar("a", 2, { status: "ditolak" }), daftar("b", 2),
    ]);
    assert.deepEqual(ringkasPemantauan(rows), { total: 3, sudah: 1, belum: 2, ditolak: 1, tanpaKolokium: 0 });
  });
});

describe("urutkanPemantauan", () => {
  const baris = (nama: string, extra: Partial<BarisPemantauan> = {}): BarisPemantauan => ({
    userId: nama, nim: `J${nama}`, nama, judul: null, dospem: null, dospem2: null,
    statusKolokium: "disetujui", tanggalKolokium: null, statusHasil: "belum", diPeriodeLain: false, ...extra,
  });

  it("mengurutkan teks naik dan turun, nilai kosong selalu di akhir", () => {
    const rows = [baris("Budi", { judul: "Zebra" }), baris("Ani"), baris("Citra", { judul: "apel" })];
    assert.deepEqual(urutkanPemantauan(rows, "judul", "asc").map(r => r.nama), ["Citra", "Budi", "Ani"]);
    assert.deepEqual(urutkanPemantauan(rows, "judul", "desc").map(r => r.nama), ["Budi", "Citra", "Ani"]);
    assert.deepEqual(urutkanPemantauan(rows, "nama", "desc").map(r => r.nama), ["Citra", "Budi", "Ani"]);
  });

  it("mengurutkan kolokium menurut status lalu tanggal", () => {
    const rows = [
      baris("A", { tanggalKolokium: "05 Agt 2026" }),
      baris("B", { tanggalKolokium: "20 Mar 2026" }),
      baris("C", { statusKolokium: null }),
      baris("D", { tanggalKolokium: "12 Agustus 2025" }),
    ];
    assert.deepEqual(urutkanPemantauan(rows, "kolokium", "asc").map(r => r.nama), ["C", "D", "B", "A"]);
  });

  it("mengurutkan status sesuai urutan progres", () => {
    const rows = [baris("A", { statusHasil: "dirilis" }), baris("B", { statusHasil: "menunggu" }), baris("C")];
    assert.deepEqual(urutkanPemantauan(rows, "status", "desc").map(r => r.nama), ["A", "B", "C"]);
  });
});
