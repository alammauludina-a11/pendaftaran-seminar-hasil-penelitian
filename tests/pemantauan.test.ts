import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buatPemantauan, ringkasPemantauan, urutkanPemantauan, barisExcelPemantauan, kolomExcelPemantauanKosong, type BarisPemantauan } from "../src/lib/pemantauan";

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
  it("menandai judul dan dosbing yang diambil dari pendaftaran kolokium", () => {
    const rows = buatPemantauan(periodes[1], periodes, [
      daftar("a", 1), daftar("b", 1), daftar("b", 2, { title: "Judul baru" }),
    ], []);
    const a = rows.find(r => r.userId === "a")!, b = rows.find(r => r.userId === "b")!;
    assert.deepEqual([a.judul, a.dariKolokium], ["Judul a", true]);
    assert.deepEqual([b.judul, b.dariKolokium], ["Judul baru", false]);
  });

  it("memakai peserta kolokium angkatan yang sama sebagai acuan", () => {
    const rows = buatPemantauan(periodes[1], periodes, [
      daftar("a", 1),
      daftar("b", 1),
      daftar("c", 4), // angkatan lain
      daftar("a", 2, { status: "menunggu" }),
    ], []);
    assert.deepEqual(rows.map(r => [r.userId, r.status]), [["b", "belum"], ["a", "menunggu"]]);
  });

  it("menandai pendaftar seminar hasil yang tidak tercatat di kolokium", () => {
    const rows = buatPemantauan(periodes[1], periodes, [daftar("a", 1), daftar("x", 2)], []);
    const x = rows.find(r => r.userId === "x")!;
    assert.equal(x.statusKolokium, null);
    assert.equal(ringkasPemantauan(rows).tidakDiAcuan, 1);
  });

  it("menghitung pendaftaran di periode lain angkatan yang sama sebagai sudah daftar", () => {
    const rows = buatPemantauan(periodes[1], periodes, [daftar("a", 1), daftar("a", 3, { isFinalized: true })], []);
    assert.equal(rows[0].status, "final");
    assert.equal(rows[0].diPeriodeLain, true);
  });

  it("mengutamakan pendaftaran di periode aktif dan yang paling maju", () => {
    const rows = buatPemantauan(periodes[1], periodes, [
      daftar("a", 1, { status: "ditolak" }),
      daftar("a", 1),
      daftar("a", 3, { isReleased: true, isFinalized: true }),
      daftar("a", 2, { status: "ditolak" }),
      daftar("a", 2, { status: "menunggu" }),
    ], []);
    assert.equal(rows[0].statusKolokium, "disetujui");
    assert.equal(rows[0].status, "menunggu");
    assert.equal(rows[0].diPeriodeLain, false);
  });

  it("menghitung yang ditolak sebagai belum daftar", () => {
    const rows = buatPemantauan(periodes[1], periodes, [
      daftar("a", 1), daftar("b", 1), daftar("c", 1),
      daftar("a", 2, { status: "ditolak" }), daftar("b", 2),
    ], []);
    assert.deepEqual(ringkasPemantauan(rows), { total: 3, sudah: 1, belum: 2, ditolak: 1, tidakDiAcuan: 0 });
  });
});

describe("buatPemantauan untuk kolokium", () => {
  const master = [
    { id: "a", nim: "J1", name: "Ani", angkatan: "60", prodi: "AKN" },
    { id: "b", nim: "J2", name: "Budi", angkatan: "60", prodi: "AKN" },
    { id: "c", nim: "J3", name: "Citra", angkatan: "61", prodi: "AKN" },
  ];

  it("memakai data master angkatan yang sama sebagai acuan (60 = AKN 60)", () => {
    const ps = periodes.map(p => ({ ...p, angkatan: `AKN ${p.angkatan}` }));
    const rows = buatPemantauan(ps[0], ps, [daftar("a", 1, { status: "menunggu" })], master);
    assert.deepEqual(rows.map(r => [r.nama, r.status]), [["Budi", "belum"], ["Ani", "menunggu"]]);
    assert.equal(rows[0].prodi, "AKN");
  });

  it("menandai pendaftar kolokium yang tidak ada di master angkatan tersebut", () => {
    const rows = buatPemantauan(periodes[0], periodes, [daftar("c", 1), daftar("x", 1, { status: "ditolak" })], master);
    const c = rows.find(r => r.userId === "c")!;
    assert.equal(c.diAcuan, false);
    assert.equal(c.nama, "Citra");
    assert.deepEqual(ringkasPemantauan(rows), { total: 4, sudah: 1, belum: 3, ditolak: 1, tidakDiAcuan: 2 });
  });
});

describe("urutkanPemantauan", () => {
  const baris = (nama: string, extra: Partial<BarisPemantauan> = {}): BarisPemantauan => ({
    userId: nama, nim: `J${nama}`, nama, prodi: null, statusMahasiswa: "Aktif", judul: null, dospem: null, dospem2: null, dariKolokium: false,
    statusKolokium: "disetujui", tanggalKolokium: null, status: "belum", diPeriodeLain: false, diAcuan: true, ...extra,
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
    const rows = [baris("A", { status: "dirilis" }), baris("B", { status: "menunggu" }), baris("C")];
    assert.deepEqual(urutkanPemantauan(rows, "status", "desc").map(r => r.nama), ["A", "B", "C"]);
  });
});

describe("barisExcelPemantauan", () => {
  const master = [
    { id: "a", nim: "J1", name: "Ani", angkatan: "60", prodi: "AKN", status: "Aktif" },
    { id: "b", nim: "J2", name: "Budi", angkatan: "60", prodi: "AKN", status: "Cuti" },
  ];

  it("menyusun kolom kolokium: prodi dan status mahasiswa, tanpa kolom kolokium", () => {
    const rows = buatPemantauan(periodes[0], periodes, [daftar("a", 1, { dospem: "Dr. X" })], master);
    const excel = barisExcelPemantauan(rows, true);
    assert.deepEqual(Object.keys(excel[0]), [
      "No", "NIM", "Nama", "Prodi", "Status Mahasiswa", "Judul", "Dosen Pembimbing 1", "Dosen Pembimbing 2", "Status Seminar Kolokium",
    ]);
    assert.equal(excel[0]["Status Mahasiswa"], "Cuti");
    assert.equal(excel[0]["Status Seminar Kolokium"], "Belum daftar");
    assert.equal(excel[1]["Status Seminar Kolokium"], "Disetujui");
  });

  it("tanpa kolom judul dan dosbing bila semua baris belum daftar kolokium", () => {
    const rows = buatPemantauan(periodes[0], periodes, [], master);
    assert.deepEqual(Object.keys(barisExcelPemantauan(rows, true)[0]), ["No", "NIM", "Nama", "Prodi", "Status Mahasiswa", "Status Seminar Kolokium"]);
  });

  it("kolom untuk daftar kosong sama dengan kolom yang selalu ada", () => {
    const rows = buatPemantauan(periodes[0], periodes, [], master);
    assert.deepEqual(Object.keys(barisExcelPemantauan(rows, true)[0]), kolomExcelPemantauanKosong(true));
    const hasil = buatPemantauan(periodes[1], periodes, [daftar("a", 1, { title: null })], []);
    assert.deepEqual(Object.keys(barisExcelPemantauan(hasil, false)[0]), kolomExcelPemantauanKosong(false));
  });

  it("menyusun kolom seminar hasil dengan sumber judul dan status kolokium", () => {
    const rows = buatPemantauan(periodes[1], periodes, [daftar("a", 1, { date: "05 Agt 2026" })], []);
    assert.deepEqual(barisExcelPemantauan(rows, false)[0], {
      No: 1, NIM: "Ja", Nama: "Mhs a", Judul: "Judul a", "Sumber Judul & Dosbing": "Saat kolokium (bisa berubah)",
      Kolokium: "05 Agt 2026", "Status Seminar Hasil": "Belum daftar",
    });
  });
});
