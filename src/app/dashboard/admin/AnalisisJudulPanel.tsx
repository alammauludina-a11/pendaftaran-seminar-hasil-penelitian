"use client";

import React, { useMemo, useState } from "react";
import { BookOpen, CopyCheck, Link2, MapPin, Building2, Sparkle, ShieldCheck } from "lucide-react";
import type { HasilAnalisisJudul, Hitungan, PasanganMirip } from "@/lib/analisis-judul";

const BATAS_AWAL_MIRIP = 8;

function tingkatMirip(p: PasanganMirip) {
  if (p.kembar) return { label: "Kembar", cls: "bg-rose-100 text-rose-700" };
  if (p.topikDanObjekSama) return { label: "Topik & objek sama", cls: "bg-rose-50 text-rose-700" };
  if (p.skor >= 0.85) return { label: "Sangat mirip", cls: "bg-amber-100 text-amber-800" };
  return { label: "Mirip", cls: "bg-slate-100 text-slate-600" };
}

function Kartu({ icon, judul, keterangan, children, className = "" }: { icon: React.ReactNode; judul: string; keterangan?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-white rounded-xl border border-slate-200 p-5 ${className}`}>
      <div className="flex items-start gap-2.5 mb-4">
        <span className="text-slate-400 mt-0.5">{icon}</span>
        <div>
          <h4 className="text-sm font-bold text-slate-800">{judul}</h4>
          {keterangan && <p className="text-xs text-slate-500">{keterangan}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function DaftarBatang({ data, total, warna, kosong }: { data: Hitungan[]; total: number; warna: string; kosong: string }) {
  if (data.length === 0) return <p className="text-sm text-slate-400">{kosong}</p>;
  const maks = Math.max(...data.map(d => d.jumlah), 1);
  return (
    <ul className="space-y-2">
      {data.map(d => (
        <li key={d.nama} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
          <span className="text-sm text-slate-700 truncate" title={d.nama}>{d.nama}</span>
          <span className="text-xs text-slate-500 tabular-nums">
            <span className="font-bold text-slate-800">{d.jumlah}</span> · {total ? Math.round((d.jumlah / total) * 100) : 0}%
          </span>
          <div className="col-span-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(d.jumlah / maks) * 100}%`, backgroundColor: warna }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Mahasiswa({ m }: { m: PasanganMirip["a"] }) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-slate-800 leading-snug">{m.judul}</p>
      <p className="text-xs text-slate-500 mt-1">
        {m.nama ?? "-"}{m.nim ? ` · ${m.nim}` : ""}{m.konsentrasi ? ` · ${m.konsentrasi}` : ""}
      </p>
    </div>
  );
}

/** Rule-based title analysis for one angkatan. */
export default function AnalisisJudulPanel({ hasil }: { hasil: HasilAnalisisJudul | undefined }) {
  const [semuaMirip, setSemuaMirip] = useState(false);
  const [semuaTopik, setSemuaTopik] = useState(false);

  if (!hasil || hasil.jumlahJudul === 0) {
    return (
      <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
        Belum ada judul Seminar Hasil yang disetujui pada angkatan ini.
      </div>
    );
  }

  const daftarMirip = semuaMirip ? hasil.judulMirip : hasil.judulMirip.slice(0, BATAS_AWAL_MIRIP);
  const N = hasil.jumlahJudul;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Judul dianalisis", nilai: N, cls: "text-slate-800" },
          { label: "Topik berbeda", nilai: hasil.jumlahTopik, cls: "text-slate-800" },
          { label: "Pasang judul kembar", nilai: hasil.jumlahKembar, cls: hasil.jumlahKembar ? "text-rose-600" : "text-slate-800" },
          { label: "Pasang judul mirip", nilai: hasil.jumlahMirip, cls: hasil.jumlahMirip ? "text-amber-600" : "text-slate-800" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <p className={`text-2xl font-black tabular-nums ${s.cls}`}>{s.nilai}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>
      {hasil.tidakTerurai > 0 && (
        <p className="text-xs text-slate-500">{hasil.tidakTerurai} judul tidak dapat diurai menjadi topik dan hanya ikut dalam pengecekan kemiripan.</p>
      )}

      {/* Similar titles */}
      <Kartu icon={<CopyCheck className="w-4 h-4" />} judul="Judul Kembar & Mirip" keterangan="Dibandingkan dari topik dan objek penelitian; lokasi atau indeks tidak ikut dihitung. Keputusan tetap di tangan prodi.">
        {hasil.judulMirip.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-slate-500"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Tidak ada judul yang kembar atau mirip.</p>
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {daftarMirip.map((p, i) => {
                const t = tingkatMirip(p);
                return (
                  <li key={`${p.a.id}-${p.b.id}`} className="py-3 first:pt-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs text-slate-400 tabular-nums">#{i + 1}</span>
                      <span className={`text-[11px] font-bold uppercase tracking-wider rounded-md px-2 py-0.5 ${t.cls}`}>{t.label}</span>
                      {!p.kembar && <span className="text-xs text-slate-500 tabular-nums">skor {p.skor.toLocaleString("id-ID")}</span>}
                      {p.topikSama.map(tp => <span key={tp} className="text-[11px] bg-indigo-50 text-indigo-700 rounded-md px-2 py-0.5">{tp}</span>)}
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <Mahasiswa m={p.a} />
                      <Mahasiswa m={p.b} />
                    </div>
                  </li>
                );
              })}
            </ul>
            {hasil.judulMirip.length > BATAS_AWAL_MIRIP && (
              <button onClick={() => setSemuaMirip(v => !v)} className="mt-2 text-sm font-medium text-indigo-600 hover:underline">
                {semuaMirip ? "Tampilkan lebih sedikit" : `Tampilkan semua (${hasil.judulMirip.length})`}
              </button>
            )}
          </>
        )}
      </Kartu>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Kartu icon={<BookOpen className="w-4 h-4" />} judul="Topik Terpopuler" keterangan="Persentase dari jumlah judul yang memuat topik tersebut">
          <DaftarBatang data={semuaTopik ? hasil.topTopik : hasil.topTopik.slice(0, 8)} total={N} warna="#6366F1" kosong="Belum ada topik." />
          {hasil.topTopik.length > 8 && (
            <button onClick={() => setSemuaTopik(v => !v)} className="mt-3 text-sm font-medium text-indigo-600 hover:underline">
              {semuaTopik ? "Tampilkan lebih sedikit" : `Tampilkan ${hasil.topTopik.length} teratas`}
            </button>
          )}
        </Kartu>

        <Kartu icon={<Link2 className="w-4 h-4" />} judul="Topik yang Sering Muncul Bersama" keterangan="Pasangan topik dalam satu judul, minimal di 2 judul">
          {hasil.topikBersama.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada pasangan topik yang berulang.</p>
          ) : (
            <ul className="space-y-2">
              {hasil.topikBersama.map(p => (
                <li key={p.pasangan.join("+")} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-700">{p.pasangan[0]} <span className="text-slate-400">+</span> {p.pasangan[1]}</span>
                  <span className="text-xs text-slate-500 shrink-0"><span className="font-bold text-slate-800">{p.jumlah}</span> judul</span>
                </li>
              ))}
            </ul>
          )}
        </Kartu>

        <Kartu icon={<Building2 className="w-4 h-4" />} judul="Objek Penelitian" keterangan="Sektor atau instansi setelah kata “pada”">
          <DaftarBatang data={hasil.objek} total={N} warna="#0EA5E9" kosong="Objek penelitian tidak terbaca dari judul." />
        </Kartu>

        <Kartu icon={<MapPin className="w-4 h-4" />} judul="Lokasi / Cakupan" keterangan="Wilayah atau indeks setelah kata “di”">
          <DaftarBatang data={hasil.lokasi} total={N} warna="#14B8A6" kosong="Lokasi tidak terbaca dari judul." />
        </Kartu>
      </div>

      <Kartu icon={<Sparkle className="w-4 h-4" />} judul="Judul Paling Unik" keterangan="Memakai topik yang paling jarang dipakai judul lain di angkatan ini">
        <ol className="space-y-3">
          {hasil.judulUnik.map((u, i) => (
            <li key={u.judul} className="flex gap-3">
              <span className="text-xs font-bold text-slate-400 tabular-nums mt-0.5">{i + 1}.</span>
              <div>
                <p className="text-sm text-slate-800 leading-snug">{u.judul}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {u.topik.map(tp => <span key={tp} className="text-[11px] bg-violet-50 text-violet-700 rounded-md px-2 py-0.5">{tp}</span>)}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Kartu>

      <Kartu icon={<BookOpen className="w-4 h-4" />} judul="Topik per Konsentrasi">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="font-semibold py-2 pr-4">Konsentrasi</th>
                <th className="font-semibold py-2 pr-4 text-right">Judul</th>
                <th className="font-semibold py-2 pr-4">Topik teratas</th>
                <th className="font-semibold py-2">Objek teratas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hasil.perKonsentrasi.map(k => (
                <tr key={k.konsentrasi} className="align-top">
                  <td className="py-2.5 pr-4 font-medium text-slate-800 whitespace-nowrap">{k.konsentrasi}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-slate-600">{k.jumlahJudul}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{k.topTopik.map(t => `${t.nama} (${t.jumlah})`).join(", ") || "-"}</td>
                  <td className="py-2.5 text-slate-600">{k.objek.map(t => `${t.nama} (${t.jumlah})`).join(", ") || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Kartu>
    </div>
  );
}

/** Compare mode: share of titles per topic across angkatan, for the most common topics overall. */
export function PergeseranTopik({ perAngkatan, angkatanList }: { perAngkatan: Record<string, HasilAnalisisJudul>; angkatanList: string[] }) {
  const baris = useMemo(() => {
    const total = new Map<string, number>();
    for (const a of angkatanList) for (const t of perAngkatan[a]?.topTopik ?? []) total.set(t.nama, (total.get(t.nama) ?? 0) + t.jumlah);
    return [...total].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([nama]) => nama);
  }, [perAngkatan, angkatanList]);

  if (baris.length === 0) {
    return <p className="text-sm text-slate-400">Belum ada judul yang bisa dibandingkan.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm whitespace-nowrap">
        <thead>
          <tr className="text-slate-500 border-b border-slate-200">
            <th className="text-left font-semibold py-2 pr-4">Topik</th>
            {angkatanList.map(a => (
              <th key={a} className="text-right font-semibold py-2 px-3">
                {a}
                <span className="block text-[11px] font-normal text-slate-400">{perAngkatan[a]?.jumlahJudul ?? 0} judul</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {baris.map(topik => (
            <tr key={topik}>
              <td className="py-2 pr-4 text-slate-700">{topik}</td>
              {angkatanList.map(a => {
                const h = perAngkatan[a];
                const n = h?.topTopik.find(t => t.nama === topik)?.jumlah;
                const persen = n && h?.jumlahJudul ? Math.round((n / h.jumlahJudul) * 100) : null;
                return (
                  <td key={a} className="py-2 px-3 text-right tabular-nums">
                    {persen === null
                      ? <span className="text-slate-300" title="Tidak termasuk 15 topik teratas angkatan ini">–</span>
                      : <span className="text-slate-800"><span className="font-semibold">{persen}%</span> <span className="text-xs text-slate-400">({n})</span></span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-slate-400 mt-2">Persentase dari jumlah judul di angkatan masing-masing. “–” berarti topik tidak termasuk 15 teratas di angkatan itu.</p>
    </div>
  );
}
