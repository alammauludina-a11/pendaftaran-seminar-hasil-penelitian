import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { akunSeDunia, isAkunUji, isPeriodeUji, pembahasLainDunia, periodeSeDunia } from "../src/lib/data-uji";
import {
  analisisPembahas, mahasiswaRencana, opsiModerasi, periksaRencana, rencanaPeriode,
} from "../scripts/uji-rencana";
import { DOSEN_SEMUA, DOSEN_UJI, alasanTolakTarget, bolehMenulis, isLogUji, type IdUji } from "../scripts/uji-shared";

const asli = { nipNim: "2201001" };
const uji = { nipNim: "UJICOBA-M1A" };

describe("data uji terpisah dari data asli", () => {
  it("mengenali akun uji dari prefix NIP/NIM", () => {
    assert.equal(isAkunUji(uji), true);
    assert.equal(isAkunUji(asli), false);
    assert.equal(isAkunUji({ nipNim: null }), false);
  });

  it("kedua label periode uji (UJICOBA dan UJICOBA-ADMIN) termasuk data uji", () => {
    assert.equal(isPeriodeUji({ angkatan: "UJICOBA" }), true);
    assert.equal(isPeriodeUji({ angkatan: "UJICOBA-ADMIN" }), true);
    assert.equal(isPeriodeUji({ angkatan: "AKN 60" }), false);
    assert.equal(isPeriodeUji({ angkatan: null }), false);
  });

  it("akun asli tidak melihat periode uji, akun uji hanya melihat periode uji", () => {
    assert.equal(periodeSeDunia(asli, { angkatan: "2022" }), true);
    assert.equal(periodeSeDunia(asli, { angkatan: "UJICOBA" }), false);
    assert.equal(periodeSeDunia(asli, { angkatan: "UJICOBA-ADMIN" }), false);
    assert.equal(periodeSeDunia(asli, { angkatan: null }), true);
    assert.equal(periodeSeDunia(uji, { angkatan: "UJICOBA-ADMIN" }), true);
    assert.equal(periodeSeDunia(uji, { angkatan: "2022" }), false);
  });

  it("mahasiswa hanya memilih dosen dari dunianya sendiri", () => {
    assert.equal(akunSeDunia(asli, { nipNim: "198001012005011001" }), true);
    assert.equal(akunSeDunia(asli, { nipNim: "UJICOBA-D1" }), false);
    assert.equal(akunSeDunia(uji, { nipNim: "UJICOBA-D1" }), true);
  });

  it("pembahasLainDunia mengembalikan pembahas dari dunia lain saja", () => {
    assert.deepEqual(pembahasLainDunia("Peserta Uji 2B (UJICOBA-M2B),Budi (J0401)", "UJICOBA-M1B"), ["Budi (J0401)"]);
    assert.deepEqual(pembahasLainDunia("Peserta Uji 2B (UJICOBA-M2B)", "J0402"), ["Peserta Uji 2B (UJICOBA-M2B)"]);
    assert.deepEqual(pembahasLainDunia("Dr. Irma", "J0402"), []);
    assert.deepEqual(pembahasLainDunia(null, "J0402"), []);
  });
});

describe("rencana data uji (scripts/uji-rencana.ts)", () => {
  const [peserta, admin] = rencanaPeriode(true);

  it("konsisten dengan aturan aplikasi, dengan dan tanpa skenario admin", () => {
    assert.deepEqual(periksaRencana(rencanaPeriode(false)), []);
    assert.deepEqual(periksaRencana(rencanaPeriode(true)), []);
  });

  it("username unik, semua bertanda UJICOBA, angkatan sesuai periodenya", () => {
    const akun = mahasiswaRencana(true);
    assert.equal(new Set(akun.map(a => a.username)).size, akun.length);
    assert.ok(akun.every(a => isAkunUji(a)));
    assert.equal(peserta.angkatan, "UJICOBA");
    assert.equal(admin.angkatan, "UJICOBA-ADMIN");
    for (const r of admin.pendaftaran) assert.equal(akun.find(a => a.username === r.mhs.username)?.angkatan, "UJICOBA-ADMIN");
    for (const r of peserta.pendaftaran) assert.equal(akun.find(a => a.username === r.mhs.username)?.angkatan, "UJICOBA");
  });

  it("setiap dosen peserta membimbing sedikit, punya cukup pilihan moderasi, dan satu bentrok dengan bimbingannya", () => {
    for (const [d, dosen] of DOSEN_UJI.entries()) {
      const o = opsiModerasi(peserta, d);
      assert.ok(o.membimbing.length <= 2, `${dosen.username} membimbing ${o.membimbing.length}`);
      assert.ok(o.bisaDipilih.length >= 4, `${dosen.username} hanya bisa memilih ${o.bisaDipilih.length}`);
      assert.equal(o.bentrokBimbingan.length, 1, `${dosen.username} bentrok bimbingan`);
      assert.ok(o.memoderatori.length >= 1, `${dosen.username} tidak punya moderasi untuk dibatalkan`);
    }
  });

  it("periode admin hanya memakai dosen pendukung; batal moderasi A5 oleh uji_dosen4", () => {
    const dipakai = new Set(admin.pendaftaran.flatMap(r => [...r.dospem, ...(r.moderator !== undefined ? [r.moderator] : [])]));
    assert.ok([...dipakai].every(d => d >= DOSEN_UJI.length));
    const batal = admin.pendaftaran.filter(r => r.batalModerator);
    assert.equal(batal.length, 1);
    assert.equal(DOSEN_SEMUA[batal[0].moderator!].username, "uji_dosen4");
  });

  it("A3: kelas tanpa pembahas dengan >=3 pasangan pembimbing, satu pemicu 'Dospem Sama', dan susunan tanpa peringatan", () => {
    assert.ok(admin.pendaftaran.filter(r => r.kelas === "B").every(r => !r.pembahas));
    const b = analisisPembahas(admin, "B");
    assert.ok(b.jumlahPasangan >= 3);
    assert.equal(b.pemicu.length, 1);
    assert.equal(b.susunanTanpaPeringatan, true);
  });

  it("A6: kelas A lengkap moderator, pembahas, dan ruangan, kecuali seminar yang moderasinya dibatalkan", () => {
    const kelasA = admin.pendaftaran.filter(r => r.kelas === "A");
    assert.equal(kelasA.length, admin.batasKelas);
    for (const r of kelasA) {
      assert.ok(r.ruangan && r.pembahas?.length, r.mhs.username);
      assert.ok(r.moderator !== undefined, r.mhs.username);
    }
    assert.equal(kelasA.filter(r => r.batalModerator).length, 1);
    assert.equal(kelasA.filter(r => r.dirilis).length, 1);
  });

  it("A4: dua pengajuan pindah ruangan, satu pada jadwal final", () => {
    const pindah = admin.pendaftaran.filter(r => r.pindahKe);
    assert.equal(pindah.length, 2);
    assert.equal(pindah.filter(r => r.dirilis).length, 1);
  });

  it("mendeteksi dosen yang terjadwal dua kali di jam yang sama", () => {
    const bentrok = { ...peserta, pendaftaran: [...peserta.pendaftaran, { ...peserta.pendaftaran[0], mhs: { ...peserta.pendaftaran[0].mhs, username: "x" } }] };
    assert.ok(periksaRencana([bentrok]).some(s => s.includes("bentrok")));
  });
});

describe("isLogUji (pembersihan Log Aktivitas Admin)", () => {
  const id: IdUji = { pendaftaran: new Set([10, 11]), periode: new Set([5]), kelas: new Set([7]), user: new Set(["u-uji"]) };
  const log = (x: Partial<{ targetTipe: string | null; targetId: string | null; deskripsi: string; detail: string | null }>) =>
    ({ targetTipe: null, targetId: null, deskripsi: "Menyimpan sesuatu", detail: null, ...x });

  it("mengenali baris log tentang data uji", () => {
    assert.equal(isLogUji(log({ targetTipe: "pendaftaran", targetId: "10" }), id), true);
    assert.equal(isLogUji(log({ targetTipe: "periode", targetId: "5" }), id), true);
    assert.equal(isLogUji(log({ targetTipe: "kelas", targetId: "99", detail: '{"periodeId":5}' }), id), true);
    assert.equal(isLogUji(log({ targetTipe: "dosen", targetId: "u-uji" }), id), true);
    assert.equal(isLogUji(log({ targetTipe: "pendaftaran", detail: '{"ids":[10,11]}' }), id), true);
    assert.equal(isLogUji(log({ deskripsi: "Menetapkan pembahas untuk Mahasiswa Uji 3 (UJICOBA-M3)" }), id), true);
  });

  it("tidak menyentuh log data asli, termasuk aksi massal yang ikut menyentuh data asli", () => {
    assert.equal(isLogUji(log({ targetTipe: "pendaftaran", targetId: "12" }), id), false);
    assert.equal(isLogUji(log({ targetTipe: "kelas", targetId: "7" }), { ...id, kelas: new Set() }), false);
    assert.equal(isLogUji(log({ targetTipe: "pendaftaran", detail: '{"ids":[10,12]}', deskripsi: "Merilis Mahasiswa Uji 1 (UJICOBA-M1)" }), id), false);
    assert.equal(isLogUji(log({ deskripsi: "Menghapus periode Seminar Hasil AKN 60" }), id), false);
  });
});

describe("pengaman produksi skrip uji (uji-buat / uji-hapus)", () => {
  const turso = "libsql://db-contoh.turso.io";

  it("database lokal (file:) boleh ditulis tanpa flag tambahan", async () => {
    assert.equal(alasanTolakTarget("file:./uji-data/uji.db", ["--jalankan"]), null);
    assert.equal(await bolehMenulis("file:./uji-data/uji.db", ["--jalankan"]), true);
  });

  it("target produksi tanpa --produksi ditolak", async () => {
    assert.match(alasanTolakTarget(turso, ["--jalankan"]) ?? "", /bukan database lokal.*--produksi/);
    assert.equal(await bolehMenulis(turso, ["--jalankan"]), false);
  });

  it("target produksi dengan --produksi tetap butuh ketik YA di terminal interaktif", async () => {
    assert.equal(alasanTolakTarget(turso, ["--jalankan", "--produksi"]), null);
    // Under the test runner stdin is not a terminal, so the typed confirmation can't happen: refused
    assert.equal(process.stdin.isTTY ?? false, false);
    assert.equal(await bolehMenulis(turso, ["--jalankan", "--produksi"]), false);
  });
});
