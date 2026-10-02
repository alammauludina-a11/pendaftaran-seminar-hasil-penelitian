"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, ClipboardList, Loader2 } from "lucide-react";
import { formatTanggal, hariWib, waktuRelatif } from "./log-shared";

type Aktivitas = {
  id: string;
  waktu: string;
  aktor: string;
  kategori: "verifikasi" | "jadwal" | "kelas" | "periode" | "master";
  aksi: string;
  deskripsi: string;
  ip: string | null;
  detail: Record<string, unknown> | null;
};

type AktivitasResponse = {
  total: number;
  maxRows: number;
  aktivitas: Aktivitas[];
  aktorList: { id: string | null; nama: string | null }[];
};

const KATEGORI: Record<Aktivitas["kategori"], { label: string; badge: string; dot: string }> = {
  verifikasi: { label: "Verifikasi", badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  jadwal: { label: "Jadwal", badge: "bg-cyan-100 text-cyan-700", dot: "bg-cyan-500" },
  kelas: { label: "Kelas", badge: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  periode: { label: "Periode", badge: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  master: { label: "Data Master", badge: "bg-slate-200 text-slate-700", dot: "bg-slate-500" },
};

const jamWib = (waktu: string) =>
  new Date(waktu).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

export default function LogAktivitasAdmin() {
  const [kategori, setKategori] = useState("");
  const [aktor, setAktor] = useState("");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [data, setData] = useState<AktivitasResponse | null>(null);
  const [fetchedQuery, setFetchedQuery] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Debounce the free-text search so typing does not fire a request per keystroke
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (kategori) params.set("kategori", kategori);
    if (aktor) params.set("aktor", aktor);
    if (dari) params.set("dari", dari);
    if (sampai) params.set("sampai", sampai);
    if (q) params.set("q", q);
    return params.toString();
  }, [kategori, aktor, dari, sampai, q]);
  // Loading while the shown result belongs to an older filter combination
  const isLoading = fetchedQuery !== query;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/log/aktivitas?${query}`, { signal: controller.signal })
      .then(async res => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Gagal mengambil log aktivitas");
        setData(json);
        setError(null);
        setFetchedQuery(query);
      })
      .catch(err => {
        if (err.name === "AbortError") return;
        setError(err.message);
        setFetchedQuery(query);
      });
    return () => controller.abort();
  }, [query]);

  // Group the (already newest-first) entries by WIB day for the timeline
  const grouped = useMemo(() => {
    const groups: { day: string; items: Aktivitas[] }[] = [];
    for (const item of data?.aktivitas ?? []) {
      const day = hariWib(item.waktu);
      if (groups[groups.length - 1]?.day !== day) groups.push({ day, items: [] });
      groups[groups.length - 1].items.push(item);
    }
    return groups;
  }, [data]);

  const adaFilter = !!(kategori || aktor || dari || sampai || q);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-100 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Aktivitas Admin</h3>
            <p className="text-xs text-slate-500">Siapa melakukan apa: verifikasi, jadwal, kelas, periode, dan data master</p>
          </div>
          <input
            type="text"
            placeholder="Cari nama mahasiswa, NIM, admin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 md:min-w-[280px]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select value={kategori} onChange={(e) => setKategori(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700">
            <option value="">Semua kategori</option>
            {Object.entries(KATEGORI).map(([key, k]) => <option key={key} value={key}>{k.label}</option>)}
          </select>
          <select value={aktor} onChange={(e) => setAktor(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700">
            <option value="">Semua admin</option>
            {data?.aktorList.map(a => <option key={a.id!} value={a.id!}>{a.nama ?? a.id}</option>)}
          </select>
          <label className="flex items-center gap-2 text-slate-500">
            Dari
            <input type="date" value={dari} max={sampai || undefined} onChange={(e) => setDari(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700" />
          </label>
          <label className="flex items-center gap-2 text-slate-500">
            Sampai
            <input type="date" value={sampai} min={dari || undefined} onChange={(e) => setSampai(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700" />
          </label>
          {adaFilter && (
            <button onClick={() => { setKategori(""); setAktor(""); setDari(""); setSampai(""); setSearch(""); }} className="px-3 py-2 text-indigo-600 font-medium hover:underline">
              Reset filter
            </button>
          )}
          {data && (
            <span className="ml-auto text-xs text-slate-400">
              {data.total > data.maxRows ? `Menampilkan ${data.maxRows} terbaru dari ${data.total}` : `${data.total} aktivitas`}
            </span>
          )}
        </div>
      </div>

      <div className="p-6 min-h-[300px]">
        {isLoading && !data ? (
          <div className="flex items-center justify-center py-16 text-slate-500 gap-3">
            <Loader2 className="w-5 h-5 animate-spin" /> Memuat aktivitas...
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" /> {error}
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
            <ClipboardList className="w-10 h-10 text-slate-300 mb-3" />
            <p className="font-medium">{adaFilter ? "Tidak ada aktivitas yang cocok dengan filter." : "Belum ada aktivitas admin yang tercatat."}</p>
            {!adaFilter && <p className="text-xs text-slate-400 mt-1">Aktivitas mulai tercatat sejak fitur ini aktif.</p>}
          </div>
        ) : (
          <div className={`space-y-8 transition-opacity ${isLoading ? "opacity-50" : ""}`}>
            {grouped.map(group => (
              <div key={group.day}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  {formatTanggal(group.day, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </h4>
                <ol className="relative border-l-2 border-slate-100 ml-2 space-y-4">
                  {group.items.map(item => {
                    const k = KATEGORI[item.kategori];
                    const detailEntries = item.detail ? Object.entries(item.detail).filter(([, v]) => v !== null && v !== undefined && v !== "") : [];
                    return (
                      <li key={item.id} className="ml-5">
                        <span className={`absolute -left-[7px] mt-1.5 w-3 h-3 rounded-full ring-4 ring-white ${k.dot}`} />
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">{jamWib(item.waktu)}</span>
                          <span className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[10px] ${k.badge}`}>{k.label}</span>
                          <span>oleh <span className="font-semibold text-slate-700">{item.aktor}</span></span>
                          <span className="text-slate-400">· {waktuRelatif(item.waktu)}</span>
                        </div>
                        <p className="text-sm text-slate-800 mt-1">{item.deskripsi}</p>
                        {detailEntries.length > 0 && (
                          <>
                            <button onClick={() => setExpanded(expanded === item.id ? null : item.id)} className="text-xs text-indigo-600 hover:underline mt-1">
                              {expanded === item.id ? "Sembunyikan detail" : "Lihat detail"}
                            </button>
                            {expanded === item.id && (
                              <dl className="mt-2 text-xs bg-slate-50 border border-slate-100 rounded-lg p-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                                {detailEntries.map(([key, value]) => (
                                  <React.Fragment key={key}>
                                    <dt className="font-semibold text-slate-500">{key}</dt>
                                    <dd className="text-slate-700 break-all">{typeof value === "object" ? JSON.stringify(value) : String(value)}</dd>
                                  </React.Fragment>
                                ))}
                                {item.ip && (
                                  <>
                                    <dt className="font-semibold text-slate-500">ip</dt>
                                    <dd className="text-slate-700 font-mono">{item.ip}</dd>
                                  </>
                                )}
                              </dl>
                            )}
                          </>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
