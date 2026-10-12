import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { akunSeDunia, isAkunUji, periodeSeDunia } from "../src/lib/data-uji";
import { mahasiswaRencana, periksaRencana, rencanaPeriode } from "../scripts/uji-rencana";

const asli = { nipNim: "2201001" };
const uji = { nipNim: "UJICOBA-M1A" };

describe("data uji terpisah dari data asli", () => {
  it("mengenali akun uji dari prefix NIP/NIM", () => {
    assert.equal(isAkunUji(uji), true);
    assert.equal(isAkunUji(asli), false);
    assert.equal(isAkunUji({ nipNim: null }), false);
  });

  it("akun asli tidak melihat periode UJICOBA, akun uji hanya melihat periode UJICOBA", () => {
    assert.equal(periodeSeDunia(asli, { angkatan: "2022" }), true);
    assert.equal(periodeSeDunia(asli, { angkatan: "UJICOBA" }), false);
    assert.equal(periodeSeDunia(asli, { angkatan: null }), true);
    assert.equal(periodeSeDunia(uji, { angkatan: "UJICOBA" }), true);
    assert.equal(periodeSeDunia(uji, { angkatan: "2022" }), false);
  });

  it("mahasiswa hanya memilih dosen dari dunianya sendiri", () => {
    assert.equal(akunSeDunia(asli, { nipNim: "198001012005011001" }), true);
    assert.equal(akunSeDunia(asli, { nipNim: "UJICOBA-D1" }), false);
    assert.equal(akunSeDunia(uji, { nipNim: "UJICOBA-D1" }), true);
  });
});

describe("rencana data uji (scripts/uji-rencana.ts)", () => {
  it("konsisten dengan aturan aplikasi, dengan dan tanpa skenario admin", () => {
    assert.deepEqual(periksaRencana(rencanaPeriode(false)), []);
    assert.deepEqual(periksaRencana(rencanaPeriode(true)), []);
  });

  it("username unik dan semua bertanda UJICOBA", () => {
    const akun = mahasiswaRencana(true);
    assert.equal(new Set(akun.map(a => a.username)).size, akun.length);
    assert.ok(akun.every(a => isAkunUji(a)));
  });

  it("mendeteksi dosen yang terjadwal dua kali di jam yang sama", () => {
    const [p] = rencanaPeriode(false);
    const bentrok = { ...p, pendaftaran: [...p.pendaftaran, { ...p.pendaftaran[0], mhs: { ...p.pendaftaran[0].mhs, username: "x" } }] };
    assert.ok(periksaRencana([bentrok]).some(s => s.includes("bentrok")));
  });
});
