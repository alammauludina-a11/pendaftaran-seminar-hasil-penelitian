import { before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { siapkanDb, kosongkan, buatUser, buatPeriode, buatPendaftaran } from "./helpers";
import { dosenLainDunia, pembahasDitolak } from "../src/lib/jadwal";

before(siapkanDb);
beforeEach(kosongkan);

// One real and one test seminar (student + registration), and one real and one test dosen
async function duaDunia() {
  const asli = await buatPeriode({ angkatan: "AKN 60" });
  const uji = await buatPeriode({ angkatan: "UJICOBA-ADMIN" });
  const mhsAsli = await buatUser({ nama: "Mahasiswa Asli", role: "mahasiswa", nipNim: "J0401201001" });
  const mhsUji = await buatUser({ nama: "Mahasiswa Uji 1", role: "mahasiswa", nipNim: "UJICOBA-M1" });
  return {
    seminarAsli: (await buatPendaftaran({ userId: mhsAsli, periodeId: asli.id })).id,
    seminarUji: (await buatPendaftaran({ userId: mhsUji, periodeId: uji.id })).id,
    dosenAsli: await buatUser({ nama: "Dr. Asli", role: "dosen", nipNim: "198001012005011001" }),
    dosenUji: await buatUser({ nama: "Dosen Uji 4", role: "dosen", nipNim: "UJICOBA-D4" }),
  };
}

describe("dosenLainDunia (penetapan moderator oleh admin)", () => {
  it("menolak dosen asli pada seminar uji", async () => {
    const d = await duaDunia();
    assert.equal(await dosenLainDunia(d.dosenAsli, d.seminarUji), "Dosen asli tidak dapat ditetapkan pada seminar data uji coba.");
  });

  it("menolak dosen uji pada seminar asli", async () => {
    const d = await duaDunia();
    assert.equal(await dosenLainDunia(d.dosenUji, d.seminarAsli), "Dosen uji coba tidak dapat ditetapkan pada seminar mahasiswa asli.");
  });

  it("menerima dosen dari dunia yang sama", async () => {
    const d = await duaDunia();
    assert.equal(await dosenLainDunia(d.dosenAsli, d.seminarAsli), null);
    assert.equal(await dosenLainDunia(d.dosenUji, d.seminarUji), null);
  });
});

describe("pembahasDitolak (Kelola Pembahas oleh admin)", () => {
  it("menolak mahasiswa uji sebagai pembahas seminar asli dan sebaliknya", async () => {
    const d = await duaDunia();
    const keUji = await pembahasDitolak([{ id: d.seminarAsli, pembahas: "Mahasiswa Uji 2 (UJICOBA-M2)" }]);
    assert.match(keUji ?? "", /Mahasiswa Uji 2 \(UJICOBA-M2\)/);
    const keAsli = await pembahasDitolak([{ id: d.seminarUji, pembahas: "Mahasiswa Uji 2 (UJICOBA-M2),Budi (J0401201002)" }]);
    assert.match(keAsli ?? "", /Budi \(J0401201002\)/);
    assert.doesNotMatch(keAsli ?? "", /UJICOBA-M2/);
  });

  it("menerima pembahas sedunia, kosong, atau teks lama tanpa NIM", async () => {
    const d = await duaDunia();
    assert.equal(await pembahasDitolak([
      { id: d.seminarAsli, pembahas: "Budi (J0401201002)" },
      { id: d.seminarUji, pembahas: "Mahasiswa Uji 2 (UJICOBA-M2)" },
      { id: d.seminarAsli, pembahas: null },
      { id: d.seminarAsli, pembahas: "Dr. Irma, M.Si" },
    ]), null);
  });
});
