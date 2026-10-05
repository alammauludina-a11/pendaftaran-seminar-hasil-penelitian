// Rule-based analysis of research titles (Dashboard Analisis → Analisis Judul Penelitian).
// Works for any kind of title (quantitative, qualitative, system design) because it never assumes
// "variables": every title is reduced to topics (the core phrases), an object ("pada ...") and a
// location/scope ("di ..."). Pure functions only, so it can run on the server and in tests.

export type JudulInput = {
  id: number;
  judul: string;
  konsentrasi: string | null;
  nama: string | null;
  nim: string | null;
};

export type UraianJudul = { topik: string[]; objek: string | null; lokasi: string | null };

export type Hitungan = { nama: string; jumlah: number };

export type PasanganMirip = {
  skor: number;
  kembar: boolean;
  topikSama: string[];
  a: Omit<JudulInput, "konsentrasi"> & { konsentrasi: string | null };
  b: Omit<JudulInput, "konsentrasi"> & { konsentrasi: string | null };
};

export type HasilAnalisisJudul = {
  jumlahJudul: number;
  jumlahTopik: number;
  tidakTerurai: number;
  jumlahKembar: number;
  jumlahMirip: number;
  topTopik: Hitungan[];
  topikBersama: { pasangan: [string, string]; jumlah: number }[];
  objek: Hitungan[];
  lokasi: Hitungan[];
  judulMirip: PasanganMirip[];
  judulUnik: { judul: string; topik: string[]; skor: number }[];
  perKonsentrasi: { konsentrasi: string; jumlahJudul: number; topTopik: Hitungan[]; objek: Hitungan[] }[];
};

/** Titles at least this similar (and sharing a topic) are listed as "mirip". */
export const AMBANG_MIRIP = 0.6;

// Opening words that describe the form of the study, not its content. Removed repeatedly,
// so "Studi Empiris Pengaruh ..." loses both "studi empiris" and "pengaruh".
const PEMBUKA = [
  "analisis faktor faktor yang mempengaruhi", "analisis faktor yang mempengaruhi",
  "faktor faktor yang mempengaruhi", "faktor yang mempengaruhi",
  "analisis pengaruh", "analisis penerapan", "analisis implementasi", "analisis peran",
  "evaluasi penerapan", "evaluasi implementasi", "evaluasi",
  "studi empiris", "studi kasus", "studi komparatif", "tinjauan atas", "tinjauan",
  "perancangan dan implementasi", "rancang bangun", "perancangan", "pengembangan",
  "implementasi", "penerapan", "pengaruh", "peran", "determinan", "analisis",
];
const POLA_PEMBUKA = new RegExp(`^(?:${PEMBUKA.join("|")})\\s+`);

// Connectors that separate topics inside the core of a title.
const PENGHUBUNG = /\s+(?:terhadap|dalam meningkatkan|dalam mencegah|dalam|melalui|dengan|serta|dan)\s+/;
// Trailing role markers: "... dengan Likuiditas sebagai Moderasi" → topic "likuiditas"
const PERAN_AKHIR = /\s+sebagai\s+(?:variabel\s+)?(?:moderasi|moderating|mediasi|intervening|pemoderasi|kontrol)$/;
const AKHIR_KOSONG = /\s+(?:studi kasus|studi empiris)$/;

// Words ignored when comparing two titles: grammar plus the opening words above
const STOPWORD = new Set(
  ("pada terhadap dan yang di dengan sebagai dalam untuk dari atau ke oleh serta melalui atas tahun " +
    "studi empiris kasus analisis pengaruh evaluasi penerapan peran meningkatkan faktor mempengaruhi " +
    "moderasi mediasi variabel perusahaan terdaftar").split(" ")
);

// Acronyms and small words for display labels
const SINGKATAN = new Set(
  ("roe roa roi der dar npm nim car ldr bopo eps per pbv gcg csr esg sdm bumn bumd lq45 jii idx bei psak sak etap emkm " +
    "ifrs umkm ppn pph spt npwp ti tik sia erp pt cv tbk ojk bpk apbd apbn bos").split(" ")
);
const KATA_KECIL = new Set("dan and of the di pada yang terhadap untuk dalam dengan atas".split(" "));

export function normalisasi(teks: string): string {
  return teks.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** Display label for a normalized phrase: Title Case, acronyms upper case, small words lower case. */
export function rapikanLabel(frasa: string): string {
  return frasa
    .split(" ")
    .map((kata, i) => {
      if (SINGKATAN.has(kata)) return kata.toUpperCase();
      if (i > 0 && KATA_KECIL.has(kata)) return kata;
      return kata.charAt(0).toUpperCase() + kata.slice(1);
    })
    .join(" ");
}

export function tokenisasi(judul: string): Set<string> {
  return new Set(normalisasi(judul).split(" ").filter(w => w.length > 1 && !STOPWORD.has(w)));
}

export function kemiripanJaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let sama = 0;
  for (const w of a) if (b.has(w)) sama++;
  return sama / (a.size + b.size - sama);
}

/** Splits a title into topics, object ("pada ...") and location/scope ("di ..."). Keys are normalized. */
export function uraiJudul(judul: string): UraianJudul {
  let t = normalisasi(judul);
  let objek: string | null = null;
  let lokasi: string | null = null;

  // "... yang go public" / "... yang terdaftar di BEI" describe the scope, not a topic
  const goPublic = t.match(/\s+yang go public$/);
  if (goPublic) {
    lokasi = "go public";
    t = t.slice(0, goPublic.index);
  }

  const pada = t.lastIndexOf(" pada ");
  const di = t.lastIndexOf(" di ");
  if (di >= 0 && di > pada) {
    lokasi = t.slice(di + 4).trim();
    t = t.slice(0, di);
  }
  if (pada >= 0) {
    objek = t.slice(pada + 6).replace(/\s+yang (?:terdaftar|tercatat)$/, "").replace(/^perusahaan\s+/, "").trim() || null;
    t = t.slice(0, pada);
  }

  t = t.replace(AKHIR_KOSONG, "");
  while (POLA_PEMBUKA.test(t)) t = t.replace(POLA_PEMBUKA, "");

  const topik = t
    .split(PENGHUBUNG)
    .map(s => s.replace(PERAN_AKHIR, "").trim())
    .filter(s => s.length > 1 && !STOPWORD.has(s));

  return { topik: [...new Set(topik)], objek, lokasi };
}

function hitung(items: (string | null)[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) if (it) m.set(it, (m.get(it) ?? 0) + 1);
  return m;
}

function teratas(m: Map<string, number>, n: number): Hitungan[] {
  return [...m]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([nama, jumlah]) => ({ nama: rapikanLabel(nama), jumlah }));
}

export function analisisJudul(daftar: JudulInput[], opsi: { batas?: number } = {}): HasilAnalisisJudul {
  const batas = opsi.batas ?? 15;
  const items = daftar.filter(d => d.judul?.trim());
  const urai = items.map(d => ({ ...d, ...uraiJudul(d.judul) }));
  const N = urai.length;

  const topikCount = hitung(urai.flatMap(u => u.topik));
  const tidakTerurai = urai.filter(u => u.topik.length === 0).length;

  // Topics that appear together in one title
  const pasanganCount = new Map<string, number>();
  for (const u of urai) {
    const s = [...u.topik].sort();
    for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) {
      const key = `${s[i]}\u0000${s[j]}`;
      pasanganCount.set(key, (pasanganCount.get(key) ?? 0) + 1);
    }
  }
  const topikBersama = [...pasanganCount]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([key, jumlah]) => {
      const [a, b] = key.split("\u0000");
      return { pasangan: [rapikanLabel(a), rapikanLabel(b)] as [string, string], jumlah };
    });

  // Identical and similar titles. Similarity compares topics + object only: the location is just the
  // sample scope, so "X terhadap Y pada Farmasi" at BEI and at LQ45 count as the same study. A shared
  // topic is also required, so titles that only share the same object are not flagged.
  const tokens = urai.map(u => tokenisasi([...u.topik, u.objek ?? ""].join(" ")));
  const normal = urai.map(u => normalisasi(u.judul));
  const judulMirip: PasanganMirip[] = [];
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const kembar = normal[i] === normal[j];
      const topikSama = urai[i].topik.filter(t => urai[j].topik.includes(t));
      const skor = kembar ? 1 : kemiripanJaccard(tokens[i], tokens[j]);
      if (kembar || (skor >= AMBANG_MIRIP && topikSama.length > 0)) {
        const pick = (u: typeof urai[number]) => ({ id: u.id, judul: u.judul, nama: u.nama, nim: u.nim, konsentrasi: u.konsentrasi });
        judulMirip.push({ skor: Math.round(skor * 100) / 100, kembar, topikSama: topikSama.map(rapikanLabel), a: pick(urai[i]), b: pick(urai[j]) });
      }
    }
  }
  judulMirip.sort((a, b) => Number(b.kembar) - Number(a.kembar) || b.skor - a.skor);

  // Most unique titles: average rarity (inverse document frequency) of their topics
  const judulUnik = urai
    .filter(u => u.topik.length > 0)
    .map(u => ({
      judul: u.judul,
      topik: u.topik.map(rapikanLabel),
      skor: u.topik.reduce((acc, t) => acc + Math.log(N / (topikCount.get(t) ?? 1)), 0) / u.topik.length,
    }))
    .sort((a, b) => b.skor - a.skor)
    .slice(0, 5)
    .map(u => ({ ...u, skor: Math.round(u.skor * 100) / 100 }));

  const perKonsentrasiMap = new Map<string, typeof urai>();
  for (const u of urai) {
    const k = u.konsentrasi?.trim() || "Lainnya";
    perKonsentrasiMap.set(k, [...(perKonsentrasiMap.get(k) ?? []), u]);
  }
  const perKonsentrasi = [...perKonsentrasiMap]
    .map(([konsentrasi, list]) => ({
      konsentrasi,
      jumlahJudul: list.length,
      topTopik: teratas(hitung(list.flatMap(u => u.topik)), 3),
      objek: teratas(hitung(list.map(u => u.objek)), 2),
    }))
    .sort((a, b) => b.jumlahJudul - a.jumlahJudul);

  return {
    jumlahJudul: N,
    jumlahTopik: topikCount.size,
    tidakTerurai,
    jumlahKembar: judulMirip.filter(p => p.kembar).length,
    jumlahMirip: judulMirip.filter(p => !p.kembar).length,
    topTopik: teratas(topikCount, batas),
    topikBersama,
    objek: teratas(hitung(urai.map(u => u.objek)), 8),
    lokasi: teratas(hitung(urai.map(u => u.lokasi)), 8),
    judulMirip,
    judulUnik,
    perKonsentrasi,
  };
}
