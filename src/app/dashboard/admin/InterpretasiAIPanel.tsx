"use client";

import React from "react";
import { AlertTriangle, ChevronDown, Info, Lightbulb, ListChecks, Shapes, Sparkles, UserCog, Users } from "lucide-react";
import type { Interpretasi } from "@/lib/interpretasi-judul";

export type HasilInterpretasi = {
  interpretasi: Interpretasi;
  dibuatPada: string;
  dibuatOleh: string | null;
  model: string;
  pembanding: string | null;
  /** The approved titles (or the prompt) changed since this interpretation was made. */
  kedaluwarsa: boolean;
};

function Bagian({ icon, judul, jumlah, terbuka = false, children }: { icon: React.ReactNode; judul: string; jumlah?: number; terbuka?: boolean; children: React.ReactNode }) {
  return (
    <details open={terbuka} className="group border border-slate-200 rounded-xl bg-white">
      <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer list-none select-none">
        <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <span className="text-slate-400">{icon}</span>
          {judul}
          {jumlah !== undefined && <span className="text-xs font-semibold text-slate-400">({jumlah})</span>}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

const LabelSaran = () => (
  <span className="text-[10px] font-bold uppercase tracking-wider bg-violet-100 text-violet-700 rounded px-1.5 py-0.5">Saran AI</span>
);

export default function InterpretasiAIPanel({ hasil }: { hasil: HasilInterpretasi }) {
  const { interpretasi: x } = hasil;
  const dibuat = new Date(hasil.dibuatPada).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

  return (
    <div className="space-y-3">
      {hasil.kedaluwarsa && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <p>Data judul sudah berubah sejak interpretasi ini dibuat. Angka di bawah mungkin tidak lagi sama dengan hasil olahan di atas. Klik <span className="font-semibold">Buat Ulang</span> untuk memperbarui.</p>
        </div>
      )}

      {/* Executive summary: always visible, readable in 30 seconds */}
      <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-2">Ringkasan Eksekutif</p>
        <ul className="space-y-1.5">
          {x.ringkasanEksekutif.map((p, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-800 leading-relaxed">
              <span className="text-emerald-600 font-bold">{i + 1}.</span>
              {p}
            </li>
          ))}
        </ul>
      </div>

      {x.tema.length > 0 && (
        <Bagian icon={<Shapes className="w-4 h-4" />} judul="Tema Besar" jumlah={x.tema.length} terbuka>
          <p className="text-xs text-slate-500 mb-3">Pengelompokan topik oleh AI. Jumlah judul dihitung ulang oleh sistem.</p>
          <div className="grid md:grid-cols-2 gap-3">
            {x.tema.map(t => (
              <div key={t.nama} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{t.nama}</p>
                  <p className="text-xs text-slate-500 shrink-0"><span className="font-bold text-slate-800">{t.jumlahJudul}</span> judul</p>
                </div>
                <div className="flex flex-wrap gap-1.5 my-2">
                  {t.topik.map(tp => <span key={tp} className="text-[11px] bg-indigo-50 text-indigo-700 rounded-md px-2 py-0.5">{tp}</span>)}
                </div>
                {t.catatan && <p className="text-xs text-slate-600 leading-relaxed">{t.catatan}</p>}
              </div>
            ))}
          </div>
        </Bagian>
      )}

      {x.temuan.length > 0 && (
        <Bagian icon={<Lightbulb className="w-4 h-4" />} judul="Temuan" jumlah={x.temuan.length} terbuka>
          <ul className="space-y-3">
            {x.temuan.map((t, i) => (
              <li key={i} className="flex gap-3">
                {t.jenis === "perhatian"
                  ? <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  : <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />}
                <div>
                  <p className="text-sm font-semibold text-slate-800">{t.judul}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{t.penjelasan}</p>
                  {t.bukti && <p className="text-xs text-slate-500 mt-1">Dasar data: {t.bukti}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Bagian>
      )}

      {x.penilaianJudulMirip.length > 0 && (
        <Bagian icon={<ListChecks className="w-4 h-4" />} judul="Penilaian Judul Mirip" jumlah={x.penilaianJudulMirip.length}>
          <p className="text-sm text-slate-700 mb-2">
            <span className="font-bold text-rose-700">{x.ringkasanJudulMirip.substansial}</span> dari {x.ringkasanJudulMirip.dinilai} pasangan teratas dinilai substansial.
          </p>
          <p className="text-xs text-slate-500 mb-3">
            <span className="font-semibold text-rose-700">Substansial</span>: fokus kajian dan objek sama, perlu dicek.
            {" "}<span className="font-semibold text-slate-700">Permukaan</span>: hanya pola atau objeknya yang sama.
          </p>
          <ul className="divide-y divide-slate-100">
            {x.penilaianJudulMirip.map(p => (
              <li key={p.nomor} className="py-2.5 first:pt-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-slate-400 tabular-nums">#{p.nomor}</span>
                  <span className={`text-[11px] font-bold uppercase tracking-wider rounded-md px-2 py-0.5 ${p.tingkat === "substansial" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                    {p.tingkat}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-snug">A: {p.judulA}</p>
                <p className="text-xs text-slate-500 leading-snug">B: {p.judulB}</p>
                <p className="text-sm text-slate-700 mt-1">{p.alasan}</p>
              </li>
            ))}
          </ul>
        </Bagian>
      )}

      {x.kesesuaianKonsentrasi.length > 0 && (
        <Bagian icon={<Users className="w-4 h-4" />} judul="Kesesuaian dengan Konsentrasi" jumlah={x.kesesuaianKonsentrasi.length}>
          <ul className="space-y-2">
            {x.kesesuaianKonsentrasi.map((k, i) => (
              <li key={i} className="text-sm"><span className="font-semibold text-slate-800">{k.konsentrasi}:</span> <span className="text-slate-600">{k.catatan}</span></li>
            ))}
          </ul>
        </Bagian>
      )}

      {x.celahTopik.length > 0 && (
        <Bagian icon={<Sparkles className="w-4 h-4" />} judul="Celah Topik" jumlah={x.celahTopik.length}>
          <ul className="space-y-3">
            {x.celahTopik.map((c, i) => (
              <li key={i}>
                <p className="text-sm text-slate-800 flex flex-wrap items-center gap-2">
                  <LabelSaran />
                  {c.konsentrasi && <span className="font-semibold">{c.konsentrasi}:</span>}
                  {c.saran}
                </p>
                {c.alasan && <p className="text-xs text-slate-500 mt-0.5">{c.alasan}</p>}
              </li>
            ))}
          </ul>
        </Bagian>
      )}

      {(x.rekomendasi.admin.length > 0 || x.rekomendasi.pimpinanProdi.length > 0) && (
        <Bagian icon={<UserCog className="w-4 h-4" />} judul="Rekomendasi" terbuka>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { judul: "Untuk Admin", sub: "Tindakan operasional", isi: x.rekomendasi.admin },
              { judul: "Untuk Kaprodi / Sekprodi", sub: "Pertimbangan kebijakan akademik", isi: x.rekomendasi.pimpinanProdi },
            ].map(r => (
              <div key={r.judul}>
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">{r.judul} <LabelSaran /></p>
                <p className="text-xs text-slate-500 mb-2">{r.sub}</p>
                {r.isi.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">{r.isi.map((s, i) => <li key={i}>{s}</li>)}</ul>
                ) : (
                  <p className="text-sm text-slate-400">Tidak ada rekomendasi.</p>
                )}
              </div>
            ))}
          </div>
        </Bagian>
      )}

      <p className="text-xs text-slate-400">
        Dibuat {dibuat} WIB{hasil.dibuatOleh ? ` oleh ${hasil.dibuatOleh}` : ""} · {hasil.model}
        {hasil.pembanding ? ` · dibandingkan dengan ${hasil.pembanding}` : ""}.
        Interpretasi AI adalah bahan pertimbangan, bukan keputusan. Angka berasal dari sistem.
      </p>
    </div>
  );
}
