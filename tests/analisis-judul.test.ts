import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analisisJudul, kemiripanJaccard, rapikanLabel, tokenisasi, uraiJudul, type JudulInput } from "../src/lib/analisis-judul";

const judul = (id: number, teks: string, konsentrasi = "Audit"): JudulInput => ({ id, judul: teks, konsentrasi, nama: `Mhs ${id}`, nim: `J0${id}` });

describe("uraiJudul", () => {
  it("mengurai judul kuantitatif menjadi topik, objek dan lokasi", () => {
    assert.deepEqual(
      uraiJudul("Studi Empiris Pengaruh Ukuran Perusahaan terhadap Nilai Perusahaan pada Perusahaan Asuransi di Indeks LQ45"),
      { topik: ["ukuran perusahaan", "nilai perusahaan"], objek: "asuransi", lokasi: "indeks lq45" }
    );
  });

  it("membuang peran moderasi dan memecah topik yang digabung dengan 'dan'", () => {
    assert.deepEqual(
      uraiJudul("Pengaruh Debt to Equity Ratio dan Ukuran Perusahaan terhadap Agresivitas Pajak dengan Likuiditas sebagai Moderasi pada Perusahaan Manufaktur yang Terdaftar di Bursa Efek Indonesia").topik,
      ["debt to equity ratio", "ukuran perusahaan", "agresivitas pajak", "likuiditas"]
    );
  });

  it("menangani judul kualitatif dan studi kasus tanpa variabel", () => {
    assert.deepEqual(
      uraiJudul("Analisis Penerapan PSAK 72 atas Pengakuan Pendapatan (Studi Kasus pada PT ABC)"),
      { topik: ["psak 72 atas pengakuan pendapatan"], objek: "pt abc", lokasi: null }
    );
    assert.deepEqual(
      uraiJudul("Akuntabilitas Pengelolaan Dana Desa di Desa Cibanteng"),
      { topik: ["akuntabilitas pengelolaan dana desa"], objek: null, lokasi: "desa cibanteng" }
    );
  });

  it("menangani judul perancangan sistem dan 'yang go public'", () => {
    assert.deepEqual(uraiJudul("Perancangan Sistem Informasi Persediaan Berbasis Web pada CV Maju").topik, ["sistem informasi persediaan berbasis web"]);
    assert.equal(uraiJudul("Pengaruh GCG terhadap Return Saham pada Perusahaan Perbankan yang Go Public").lokasi, "go public");
  });
});

describe("kemiripan", () => {
  it("menghitung Jaccard dari kata penting saja", () => {
    const a = tokenisasi("Pengaruh Likuiditas terhadap Keputusan Investasi pada Perusahaan Farmasi");
    const b = tokenisasi("Pengaruh Kualitas Laba terhadap Keputusan Investasi pada Perusahaan Farmasi");
    assert.deepEqual([...a].sort(), ["farmasi", "investasi", "keputusan", "likuiditas"]);
    assert.equal(kemiripanJaccard(a, b), 3 / 6);
  });

  it("menulis singkatan dengan huruf besar", () => {
    assert.equal(rapikanLabel("roe dan der pada perusahaan food and beverage"), "ROE dan DER pada Perusahaan Food and Beverage");
  });
});

describe("analisisJudul", () => {
  const data = [
    judul(1, "Pengaruh Likuiditas terhadap Nilai Perusahaan pada Perusahaan Farmasi di Bursa Efek Indonesia"),
    judul(2, "Pengaruh Likuiditas terhadap Nilai Perusahaan pada Perusahaan Farmasi di Bursa Efek Indonesia"),
    judul(3, "Analisis Pengaruh Likuiditas terhadap Nilai Perusahaan pada Perusahaan Farmasi di Indeks LQ45"),
    // Same object and location as 1, but a different topic: must not be flagged as similar
    judul(4, "Pengaruh Komite Audit terhadap Agresivitas Pajak pada Perusahaan Farmasi di Bursa Efek Indonesia", "Akuntansi Pajak"),
    judul(5, "Analisis Penerapan PSAK 72 pada PT ABC", "Akuntansi Keuangan"),
    judul(6, "   "),
  ];
  const hasil = analisisJudul(data);

  it("mengabaikan judul kosong dan menghitung topik", () => {
    assert.equal(hasil.jumlahJudul, 5);
    assert.equal(hasil.tidakTerurai, 0);
    assert.deepEqual(hasil.topTopik.slice(0, 2), [{ nama: "Likuiditas", jumlah: 3 }, { nama: "Nilai Perusahaan", jumlah: 3 }]);
  });

  it("menandai judul kembar dan mirip, tetapi tidak judul yang hanya sama objeknya", () => {
    assert.equal(hasil.jumlahKembar, 1);
    assert.equal(hasil.judulMirip[0].kembar, true);
    assert.deepEqual([hasil.judulMirip[0].a.id, hasil.judulMirip[0].b.id], [1, 2]);
    const pasanganDengan4 = hasil.judulMirip.filter(p => p.a.id === 4 || p.b.id === 4);
    assert.equal(pasanganDengan4.length, 0);
    assert.ok(hasil.judulMirip.some(p => !p.kembar && p.a.id === 1 && p.b.id === 3));
  });

  it("menandai pasangan yang topik dan objeknya sama, hanya beda lokasi", () => {
    const p13 = hasil.judulMirip.find(p => p.a.id === 1 && p.b.id === 3)!;
    assert.equal(p13.topikDanObjekSama, true);
    assert.equal(hasil.judulMirip[0].topikDanObjekSama, false, "pasangan kembar tidak diberi tanda ini");
    const lain = analisisJudul([
      judul(1, "Pengaruh Likuiditas terhadap Nilai Perusahaan pada Perusahaan Farmasi di Bursa Efek Indonesia"),
      judul(2, "Pengaruh Leverage terhadap Nilai Perusahaan pada Perusahaan Farmasi di Bursa Efek Indonesia"),
    ]);
    assert.equal(lain.judulMirip.every(p => !p.topikDanObjekSama), true);
  });

  it("menghitung topik bersama, objek, lokasi dan per konsentrasi", () => {
    assert.deepEqual(hasil.topikBersama[0], { pasangan: ["Likuiditas", "Nilai Perusahaan"], jumlah: 3 });
    assert.deepEqual(hasil.objek[0], { nama: "Farmasi", jumlah: 4 });
    assert.deepEqual(hasil.lokasi[0], { nama: "Bursa Efek Indonesia", jumlah: 3 });
    assert.equal(hasil.perKonsentrasi[0].konsentrasi, "Audit");
    assert.equal(hasil.perKonsentrasi[0].jumlahJudul, 3);
  });

  it("menempatkan judul dengan topik langka sebagai paling unik", () => {
    assert.match(hasil.judulUnik[0].judul, /PSAK 72|Komite Audit/);
  });
});
