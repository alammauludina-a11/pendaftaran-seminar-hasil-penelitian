// AI interpretation of the rule-based title analysis (Dashboard Analisis → Interpretasi AI).
// The AI never sees raw student data: it receives counts that the system already computed, plus a
// few titles (similar pairs, unique titles) without names or NIM. Everything it returns is checked
// against that summary, and theme counts are recomputed here so a wrong AI sum is never shown.
import { normalisasi, uraiJudul, type HasilAnalisisJudul, type JudulInput } from "@/lib/analisis-judul";

/** Bump when the prompt or schema changes, so cached interpretations are not reused. */
export const VERSI_PROMPT = "2026-10-03.1";
/** Below this many titles there is not enough material for a meaningful interpretation. */
export const MIN_JUDUL = 10;
const MAKS_PASANGAN_MIRIP = 15;

export type RingkasanAI = {
  angkatan: string;
  jumlahJudul: number;
  jumlahTopik: number;
  jumlahKembar: number;
  jumlahMirip: number;
  topTopik: { topik: string; jumlahJudul: number }[];
  topikBersama: { pasangan: [string, string]; jumlahJudul: number }[];
  objek: { nama: string; jumlahJudul: number }[];
  lokasi: { nama: string; jumlahJudul: number }[];
  perKonsentrasi: { konsentrasi: string; jumlahJudul: number; topikTeratas: string[]; objekTeratas: string[] }[];
  judulMirip: { nomor: number; tingkatSistem: "kembar" | "mirip"; skor: number; judulA: string; judulB: string; konsentrasiA: string | null; konsentrasiB: string | null; topikSama: string[] }[];
  judulUnik: { judul: string; topik: string[] }[];
  pembanding: { angkatan: string; jumlahJudul: number; topTopik: { topik: string; jumlahJudul: number }[] } | null;
};

export type Interpretasi = {
  ringkasanEksekutif: string[];
  tema: { nama: string; topik: string[]; jumlahJudul: number; catatan: string }[];
  temuan: { judul: string; penjelasan: string; bukti: string; jenis: "info" | "perhatian" }[];
  penilaianJudulMirip: { nomor: number; judulA: string; judulB: string; tingkat: "substansial" | "permukaan"; alasan: string }[];
  kesesuaianKonsentrasi: { konsentrasi: string; catatan: string }[];
  celahTopik: { konsentrasi: string; saran: string; alasan: string }[];
  rekomendasi: { admin: string[]; pimpinanProdi: string[] };
};

/** Builds the data sent to the AI. No names or NIM: only counts, topics and a few titles. */
export function susunRingkasanAI(angkatan: string, hasil: HasilAnalisisJudul, pembanding?: { angkatan: string; hasil: HasilAnalisisJudul }): RingkasanAI {
  return {
    angkatan,
    jumlahJudul: hasil.jumlahJudul,
    jumlahTopik: hasil.jumlahTopik,
    jumlahKembar: hasil.jumlahKembar,
    jumlahMirip: hasil.jumlahMirip,
    topTopik: hasil.topTopik.map(t => ({ topik: t.nama, jumlahJudul: t.jumlah })),
    topikBersama: hasil.topikBersama.map(p => ({ pasangan: p.pasangan, jumlahJudul: p.jumlah })),
    objek: hasil.objek.map(o => ({ nama: o.nama, jumlahJudul: o.jumlah })),
    lokasi: hasil.lokasi.map(o => ({ nama: o.nama, jumlahJudul: o.jumlah })),
    perKonsentrasi: hasil.perKonsentrasi.map(k => ({
      konsentrasi: k.konsentrasi,
      jumlahJudul: k.jumlahJudul,
      topikTeratas: k.topTopik.map(t => `${t.nama} (${t.jumlah})`),
      objekTeratas: k.objek.map(t => `${t.nama} (${t.jumlah})`),
    })),
    judulMirip: hasil.judulMirip.slice(0, MAKS_PASANGAN_MIRIP).map((p, i) => ({
      nomor: i + 1,
      tingkatSistem: p.kembar ? "kembar" : "mirip",
      skor: p.skor,
      judulA: p.a.judul,
      judulB: p.b.judul,
      konsentrasiA: p.a.konsentrasi,
      konsentrasiB: p.b.konsentrasi,
      topikSama: p.topikSama,
    })),
    judulUnik: hasil.judulUnik.map(u => ({ judul: u.judul, topik: u.topik })),
    pembanding: pembanding
      ? {
          angkatan: pembanding.angkatan,
          jumlahJudul: pembanding.hasil.jumlahJudul,
          topTopik: pembanding.hasil.topTopik.map(t => ({ topik: t.nama, jumlahJudul: t.jumlah })),
        }
      : null,
  };
}

export function buatPrompt(ringkasan: RingkasanAI): string {
  return `Peran: Anda analis akademik yang menyusun bahan pertimbangan bagi admin, Kaprodi, dan Sekprodi
Program Studi Akuntansi tentang pola judul tugas akhir (Seminar Hasil Penelitian) satu angkatan.

Data di bawah SUDAH DIHITUNG oleh sistem dari judul yang disetujui. Tugas Anda menafsirkan, bukan menghitung ulang.
Setiap judul sudah diurai menjadi "topik" (frasa inti), "objek" (setelah kata "pada") dan "lokasi" (setelah kata "di").
Judul bisa berasal dari penelitian kuantitatif maupun kualitatif; jangan memakai istilah "variabel".

ATURAN
1. Setiap angka yang Anda sebut harus ada di data. Jangan membuat, memperkirakan, atau menjumlahkan angka baru.
2. Bedakan fakta dan pendapat. Fakta berasal dari data. Celah topik dan rekomendasi adalah saran, tulis sebagai saran.
3. "tema": kelompokkan topik ke 3–6 tema besar menurut makna (misalnya tata kelola, kualitas pelaporan laba).
   Gunakan HANYA topik dari daftar topTopik dan tulis persis sama. Jangan isi jumlah judul; sistem yang menghitungnya.
4. "penilaianJudulMirip": untuk setiap pasangan di judulMirip, sebut nomornya dan nilai apakah tumpang tindihnya
   "substansial" (fokus kajian dan objek sama) atau "permukaan" (pola kalimat, topik umum, atau objek sama, tetapi
   fokus kajian berbeda). Beri alasan satu kalimat.
5. "kesesuaianKonsentrasi": tulis hanya bila ada hal yang layak dicermati, misalnya topik atau objek yang tampak jauh
   dari bidang konsentrasinya. Boleh kosong.
6. "celahTopik": tema yang lazim untuk suatu konsentrasi tetapi tidak atau jarang muncul di data. Maksimal 4.
7. "rekomendasi.admin": tindakan operasional (misalnya mengecek pasangan judul kembar). "rekomendasi.pimpinanProdi":
   pertimbangan kebijakan akademik untuk Kaprodi/Sekprodi. Masing-masing maksimal 4.
8. Jangan menilai atau menyalahkan dosen pembimbing, mahasiswa, atau konsentrasi tertentu. Bahas pola, bukan orang.
   Jangan menilai kualitas atau kelayakan judul individu.
9. Bila "pembanding" berisi data angkatan sebelumnya, bahas pergeseran topik di "temuan".
10. "ringkasanEksekutif": tepat 3 poin, masing-masing satu kalimat, bisa dibaca dalam 30 detik.
11. Tulis dalam bahasa Indonesia yang formal dan lugas, seperti memo internal prodi. Kalimat pendek, tanpa jargon statistik.

DATA
${JSON.stringify(ringkasan, null, 2)}`;
}

const teks = { type: "string" } as const;
const daftarTeks = { type: "array", items: teks } as const;

/** JSON schema the model must follow (passed as responseJsonSchema). */
export const SKEMA_INTERPRETASI = {
  type: "object",
  properties: {
    ringkasanEksekutif: daftarTeks,
    tema: {
      type: "array",
      items: { type: "object", properties: { nama: teks, topik: daftarTeks, catatan: teks }, required: ["nama", "topik", "catatan"] },
    },
    temuan: {
      type: "array",
      items: {
        type: "object",
        properties: { judul: teks, penjelasan: teks, bukti: teks, jenis: { type: "string", enum: ["info", "perhatian"] } },
        required: ["judul", "penjelasan", "bukti", "jenis"],
      },
    },
    penilaianJudulMirip: {
      type: "array",
      items: {
        type: "object",
        properties: { nomor: { type: "integer" }, tingkat: { type: "string", enum: ["substansial", "permukaan"] }, alasan: teks },
        required: ["nomor", "tingkat", "alasan"],
      },
    },
    kesesuaianKonsentrasi: {
      type: "array",
      items: { type: "object", properties: { konsentrasi: teks, catatan: teks }, required: ["konsentrasi", "catatan"] },
    },
    celahTopik: {
      type: "array",
      items: { type: "object", properties: { konsentrasi: teks, saran: teks, alasan: teks }, required: ["konsentrasi", "saran", "alasan"] },
    },
    rekomendasi: {
      type: "object",
      properties: { admin: daftarTeks, pimpinanProdi: daftarTeks },
      required: ["admin", "pimpinanProdi"],
    },
  },
  required: ["ringkasanEksekutif", "tema", "temuan", "penilaianJudulMirip", "kesesuaianKonsentrasi", "celahTopik", "rekomendasi"],
};

const str = (v: unknown, maks = 600) => (typeof v === "string" ? v.trim().slice(0, maks) : "");
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strs = (v: unknown, maksItem: number) => arr(v).map(x => str(x)).filter(Boolean).slice(0, maksItem);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

/**
 * Validates the model output against the summary it was given: unknown topics and pair numbers are
 * dropped, list lengths are capped, and theme counts are recomputed from the titles themselves.
 */
export function rapikanInterpretasi(mentah: unknown, ringkasan: RingkasanAI, daftarJudul: JudulInput[]): Interpretasi {
  const raw = obj(mentah);

  // Theme topics must be real topics; match case-insensitively but show the system's label
  const labelTopik = new Map(ringkasan.topTopik.map(t => [normalisasi(t.topik), t.topik]));
  const topikPerJudul = daftarJudul.map(j => new Set(uraiJudul(j.judul).topik));
  const tema = arr(raw.tema)
    .map(t => {
      const o = obj(t);
      const topik = [...new Set(strs(o.topik, 20).map(x => labelTopik.get(normalisasi(x))).filter((x): x is string => !!x))];
      const kunci = topik.map(normalisasi);
      const jumlahJudul = topikPerJudul.filter(set => kunci.some(k => set.has(k))).length;
      return { nama: str(o.nama, 80), topik, jumlahJudul, catatan: str(o.catatan) };
    })
    .filter(t => t.nama && t.topik.length > 0)
    .slice(0, 6)
    .sort((a, b) => b.jumlahJudul - a.jumlahJudul);

  const pasangan = new Map(ringkasan.judulMirip.map(p => [p.nomor, p]));
  const sudah = new Set<number>();
  const penilaianJudulMirip = arr(raw.penilaianJudulMirip)
    .map(p => obj(p))
    .filter(p => {
      const n = Number(p.nomor);
      if (!pasangan.has(n) || sudah.has(n)) return false;
      sudah.add(n);
      return true;
    })
    .map(p => {
      const ref = pasangan.get(Number(p.nomor))!;
      return {
        nomor: ref.nomor,
        judulA: ref.judulA,
        judulB: ref.judulB,
        tingkat: (p.tingkat === "substansial" ? "substansial" : "permukaan") as "substansial" | "permukaan",
        alasan: str(p.alasan, 300),
      };
    })
    .sort((a, b) => a.nomor - b.nomor);

  const rek = obj(raw.rekomendasi);
  return {
    ringkasanEksekutif: strs(raw.ringkasanEksekutif, 3),
    tema,
    temuan: arr(raw.temuan)
      .map(t => obj(t))
      .map(t => ({
        judul: str(t.judul, 120),
        penjelasan: str(t.penjelasan),
        bukti: str(t.bukti, 300),
        jenis: (t.jenis === "perhatian" ? "perhatian" : "info") as "info" | "perhatian",
      }))
      .filter(t => t.judul && t.penjelasan)
      .slice(0, 6),
    penilaianJudulMirip,
    kesesuaianKonsentrasi: arr(raw.kesesuaianKonsentrasi)
      .map(k => obj(k))
      .map(k => ({ konsentrasi: str(k.konsentrasi, 80), catatan: str(k.catatan) }))
      .filter(k => k.konsentrasi && k.catatan)
      .slice(0, 6),
    celahTopik: arr(raw.celahTopik)
      .map(c => obj(c))
      .map(c => ({ konsentrasi: str(c.konsentrasi, 80), saran: str(c.saran, 200), alasan: str(c.alasan, 300) }))
      .filter(c => c.saran)
      .slice(0, 4),
    rekomendasi: { admin: strs(rek.admin, 4), pimpinanProdi: strs(rek.pimpinanProdi, 4) },
  };
}

/** Previous angkatan (by number) that has enough titles to compare with, if any. */
export function cariPembanding(angkatan: string, semua: Record<string, unknown[]>): string | null {
  const urut = Object.keys(semua)
    .filter(a => (semua[a]?.length ?? 0) >= MIN_JUDUL)
    .sort((a, b) => a.localeCompare(b, "id", { numeric: true }));
  const sebelum = urut.filter(a => a.localeCompare(angkatan, "id", { numeric: true }) < 0);
  return sebelum[sebelum.length - 1] ?? null;
}
