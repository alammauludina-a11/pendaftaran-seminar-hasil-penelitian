import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analisisJudul, type JudulInput } from "../src/lib/analisis-judul";
import { buatPrompt, cariPembanding, rapikanInterpretasi, susunRingkasanAI } from "../src/lib/interpretasi-judul";

const judul = (id: number, teks: string, konsentrasi = "Audit"): JudulInput => ({ id, judul: teks, konsentrasi, nama: `Budi Rahasia ${id}`, nim: `J04142300${id}` });
const daftar = [
  judul(1, "Pengaruh Likuiditas terhadap Nilai Perusahaan pada Perusahaan Farmasi di Bursa Efek Indonesia"),
  judul(2, "Pengaruh Likuiditas terhadap Nilai Perusahaan pada Perusahaan Farmasi di Bursa Efek Indonesia"),
  judul(3, "Pengaruh Komite Audit terhadap Agresivitas Pajak pada Perusahaan BUMN di Indeks LQ45", "Akuntansi Pajak"),
  judul(4, "Peran Good Corporate Governance dalam Meningkatkan Nilai Perusahaan pada Perusahaan Perbankan di Indonesia"),
];
const ringkasan = susunRingkasanAI("AKN 60", analisisJudul(daftar, { batas: 30 }));

describe("susunRingkasanAI", () => {
  it("tidak memuat nama atau NIM mahasiswa", () => {
    const json = JSON.stringify(ringkasan);
    assert.doesNotMatch(json, /Budi Rahasia|J04142300/);
    assert.doesNotMatch(buatPrompt(ringkasan), /Budi Rahasia|J04142300/);
  });

  it("memberi nomor pada pasangan judul mirip", () => {
    assert.equal(ringkasan.judulMirip[0].nomor, 1);
    assert.equal(ringkasan.judulMirip[0].tingkatSistem, "kembar");
  });
});

describe("rapikanInterpretasi", () => {
  const mentah = {
    ringkasanEksekutif: ["Poin 1", "Poin 2", "Poin 3", "Poin 4 berlebih"],
    tema: [
      // AI writes a wrong count and an invented topic; both must be corrected
      { nama: "Nilai Perusahaan", topik: ["nilai perusahaan", "Topik Karangan AI"], jumlahJudul: 99, catatan: "Dominan" },
      { nama: "Tema Kosong", topik: ["Tidak Ada di Data"], catatan: "x" },
      { nama: "Tata Kelola", topik: ["Good Corporate Governance", "Komite Audit"], catatan: "Tata kelola" },
    ],
    temuan: [{ judul: "Temuan", penjelasan: "Isi", bukti: "3 judul", jenis: "aneh" }],
    penilaianJudulMirip: [
      { nomor: 1, tingkat: "substansial", alasan: "Sama persis" },
      { nomor: 1, tingkat: "permukaan", alasan: "Duplikat nomor" },
      { nomor: 42, tingkat: "substansial", alasan: "Nomor tidak ada" },
    ],
    kesesuaianKonsentrasi: [{ konsentrasi: "", catatan: "tanpa nama" }],
    celahTopik: [1, 2, 3, 4, 5].map(i => ({ konsentrasi: "Audit", saran: `Saran ${i}`, alasan: "x" })),
    rekomendasi: { admin: ["Cek judul kembar"], pimpinanProdi: "bukan array" },
  };
  const hasil = rapikanInterpretasi(mentah, ringkasan, daftar);

  it("membatasi ringkasan eksekutif menjadi 3 poin", () => {
    assert.deepEqual(hasil.ringkasanEksekutif, ["Poin 1", "Poin 2", "Poin 3"]);
  });

  it("hanya memakai topik yang ada di data dan menghitung ulang jumlah judul tema", () => {
    const nilai = hasil.tema.find(t => t.nama === "Nilai Perusahaan")!;
    assert.deepEqual(nilai.topik, ["Nilai Perusahaan"]);
    assert.equal(nilai.jumlahJudul, 3);
    assert.equal(hasil.tema.find(t => t.nama === "Tata Kelola")!.jumlahJudul, 2);
    assert.equal(hasil.tema.some(t => t.nama === "Tema Kosong"), false);
  });

  it("membuang nomor pasangan yang tidak ada atau ganda, dan melampirkan judulnya", () => {
    assert.equal(hasil.penilaianJudulMirip.length, 1);
    assert.equal(hasil.penilaianJudulMirip[0].tingkat, "substansial");
    assert.equal(hasil.penilaianJudulMirip[0].judulA, daftar[0].judul);
  });

  it("menormalkan nilai yang tidak sesuai skema", () => {
    assert.equal(hasil.temuan[0].jenis, "info");
    assert.equal(hasil.kesesuaianKonsentrasi.length, 0);
    assert.equal(hasil.celahTopik.length, 4);
    assert.deepEqual(hasil.rekomendasi, { admin: ["Cek judul kembar"], pimpinanProdi: [] });
  });

  it("tidak gagal bila jawaban AI bukan objek", () => {
    const kosong = rapikanInterpretasi("teks biasa", ringkasan, daftar);
    assert.deepEqual(kosong.tema, []);
    assert.deepEqual(kosong.ringkasanEksekutif, []);
  });
});

describe("cariPembanding", () => {
  const isi = (n: number) => Array.from({ length: n });
  it("memilih angkatan sebelumnya yang datanya cukup", () => {
    const semua = { "AKN 58": isi(20), "AKN 59": isi(5), "AKN 60": isi(30), "AKN 100": isi(40) };
    assert.equal(cariPembanding("AKN 60", semua), "AKN 58");
    assert.equal(cariPembanding("AKN 100", semua), "AKN 60");
    assert.equal(cariPembanding("AKN 58", semua), null);
  });
});
