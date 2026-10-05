"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LabelList, Cell
} from "recharts";
import { Sparkles, Loader2, AlertCircle, Clock, Lightbulb, Layers, Filter, Users, FileDown } from "lucide-react";
import type { HasilAnalisisJudul } from "@/lib/analisis-judul";
import { formatDurasi } from "@/lib/format-durasi";
import AnalisisJudulPanel, { PergeseranTopik } from "./AnalisisJudulPanel";
import InterpretasiAIPanel, { type HasilInterpretasi } from "./InterpretasiAIPanel";

const COLORS = ["#3B82F6", "#8B5CF6", "#F59E0B", "#10B981", "#EF4444", "#EC4899", "#06B6D4"];
const DURATION_LABELS = ["< 1 Bulan", "1 - 3 Bulan", "3 - 6 Bulan", "> 6 Bulan"] as const;
// Light → dark: a longer duration reads as a heavier shade
const DURATION_COLORS = ["#BFDBFE", "#60A5FA", "#2563EB", "#1E3A8A"];
const BANDINGKAN = "__bandingkan";

type DurationRow = { name: string; total: number; medianHari: number | null } & Record<typeof DURATION_LABELS[number], number>;
type KonsentrasiRow = { name: string } & Record<string, number | string>;
type FunnelRow = { name: string; kolokium: number; daftarHasil: number; disetujui: number; dirilis: number; selesai: number };
const FUNNEL_STAGES: { key: keyof Omit<FunnelRow, "name">; label: string; color: string }[] = [
  { key: "kolokium", label: "Kolokium selesai", color: "#6366F1" },
  { key: "daftarHasil", label: "Daftar Seminar Hasil", color: "#8B5CF6" },
  { key: "disetujui", label: "Pendaftaran disetujui", color: "#3B82F6" },
  { key: "dirilis", label: "Jadwal dirilis", color: "#06B6D4" },
  { key: "selesai", label: "Selesai Seminar Hasil", color: "#10B981" },
];

const TOOLTIP_STYLE = { borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' };
const persenDari = (value: number, total: number) => (total ? Math.round((value / total) * 100) : 0);

export default function DashboardAnalisis({ onBack }: { onBack?: () => void }) {
  // AI result per angkatan, so switching angkatan back and forth keeps earlier analyses
  // Saved AI interpretation per angkatan: undefined = not loaded yet, null = none saved
  const [aiByAngkatan, setAiByAngkatan] = useState<Record<string, HasilInterpretasi | null>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Database Data States
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [durationData, setDurationData] = useState<DurationRow[]>([]);
  const [konsentrasiData, setKonsentrasiData] = useState<KonsentrasiRow[]>([]);
  const [judulByAngkatan, setJudulByAngkatan] = useState<Record<string, HasilAnalisisJudul>>({});
  const [tanpaKolokium, setTanpaKolokium] = useState<Record<string, number>>({});
  const [funnelData, setFunnelData] = useState<FunnelRow[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);

  // Filter: one angkatan (detail) or BANDINGKAN (compare all angkatan side by side, in percentages)
  const [selectedAngkatan, setSelectedAngkatan] = useState<string>("");
  const isBandingkan = selectedAngkatan === BANDINGKAN;

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/admin/analisis/data");
        if (!res.ok) throw new Error("Gagal mengambil data analitik dari database");
        const data = await res.json();
        setDurationData(data.durationData || []);
        setKonsentrasiData(data.konsentrasiData || []);
        setJudulByAngkatan(data.judul || {});
        setTanpaKolokium(data.tanpaKolokium || {});
        setFunnelData(data.funnelData || []);

        // Open on the most recent angkatan: that is the one admin is usually working on
        const names = new Set<string>();
        for (const list of [data.durationData, data.konsentrasiData, data.funnelData]) {
          (list || []).forEach((d: { name: string }) => names.add(d.name));
        }
        const sorted = Array.from(names).sort((a, b) => a.localeCompare(b, "id", { numeric: true }));
        setSelectedAngkatan(sorted[sorted.length - 1] ?? "");
      } catch (err: any) {
        setDataError(err.message);
      } finally {
        setIsLoadingData(false);
      }
    }
    fetchData();
  }, []);

  // All angkatan, newest first, for the filter dropdown
  const allAngkatan = useMemo(() => {
    const angkatans = new Set<string>();
    durationData.forEach(d => angkatans.add(d.name));
    konsentrasiData.forEach(d => angkatans.add(d.name));
    funnelData.forEach(d => angkatans.add(d.name));
    return Array.from(angkatans).sort((a, b) => b.localeCompare(a, "id", { numeric: true }));
  }, [durationData, konsentrasiData, funnelData]);

  // ---- Funnel ----
  const funnel = useMemo(() => {
    const row = funnelData.find(d => d.name === selectedAngkatan);
    return FUNNEL_STAGES.map(stage => ({ ...stage, value: row?.[stage.key] ?? 0 }));
  }, [funnelData, selectedAngkatan]);

  // ---- Durasi ----
  const durasiSatu = useMemo(() => {
    const row = durationData.find(d => d.name === selectedAngkatan);
    const total = row?.total ?? 0;
    return {
      total,
      medianHari: row?.medianHari ?? null,
      bars: DURATION_LABELS.map(label => {
        const jumlah = row?.[label] ?? 0;
        return { name: label, jumlah, label: `${jumlah} · ${persenDari(jumlah, total)}%` };
      }),
    };
  }, [durationData, selectedAngkatan]);

  const durasiBandingkan = useMemo(() => durationData.filter(d => d.total > 0), [durationData]);
  const hasDurationData = isBandingkan ? durasiBandingkan.length > 0 : durasiSatu.total > 0;
  const jumlahTanpaKolokium = isBandingkan
    ? Object.values(tanpaKolokium).reduce((a, b) => a + b, 0)
    : tanpaKolokium[selectedAngkatan] ?? 0;

  // ---- Konsentrasi ----
  const konsentrasiChart = useMemo(() => {
    const source = isBandingkan ? konsentrasiData : konsentrasiData.filter(d => d.name === selectedAngkatan);

    const totals: Record<string, number> = {};
    source.forEach(item => {
      Object.entries(item).forEach(([k, v]) => {
        if (k !== "name" && typeof v === "number") totals[k] = (totals[k] || 0) + v;
      });
    });
    const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

    // Same order (and so the same colour) for every angkatan, biggest konsentrasi first
    const sorted = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, jumlah]) => ({ name, jumlah, label: `${jumlah} · ${persenDari(jumlah, grandTotal)}%` }));

    const perAngkatan = source.map(item => {
      const row: Record<string, number | string> = { name: item.name, __total: 0 };
      sorted.forEach(k => {
        const v = typeof item[k.name] === "number" ? (item[k.name] as number) : 0;
        row[k.name] = v;
        row.__total = (row.__total as number) + v;
      });
      return row;
    });

    return { sorted, perAngkatan };
  }, [konsentrasiData, selectedAngkatan, isBandingkan]);

  // ---- AI ----
  const interpretasi = aiByAngkatan[selectedAngkatan] ?? null;
  const memuatInterpretasi = !isBandingkan && !!selectedAngkatan && !(selectedAngkatan in aiByAngkatan);

  // Load the saved interpretation when an angkatan is opened, so everyone reads the same version
  useEffect(() => {
    if (!memuatInterpretasi) return;
    const angkatan = selectedAngkatan;
    const controller = new AbortController();
    fetch(`/api/admin/analisis/gemini?angkatan=${encodeURIComponent(angkatan)}`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => setAiByAngkatan(prev => ({ ...prev, [angkatan]: data.tersimpan ?? null })))
      .catch(err => {
        if (err.name !== "AbortError") setAiByAngkatan(prev => ({ ...prev, [angkatan]: null }));
      });
    return () => controller.abort();
  }, [memuatInterpretasi, selectedAngkatan]);

  const [sedangMengunduh, setSedangMengunduh] = useState(false);

  // Report for a prodi meeting: everything on this dashboard for one angkatan, plus the saved AI
  // interpretation of the titles if there is one
  const unduhLaporan = async () => {
    if (isBandingkan || !selectedAngkatan) return;
    setSedangMengunduh(true);
    try {
      const { buatLaporanAnalisisPdf } = await import("@/lib/laporan-analisis-pdf");
      const doc = buatLaporanAnalisisPdf({
        angkatan: selectedAngkatan,
        progres: funnel.map(t => ({ label: t.label, jumlah: t.value })),
        durasi: {
          kategori: durasiSatu.bars.map(b => ({ label: b.name, jumlah: b.jumlah })),
          total: durasiSatu.total,
          medianHari: durasiSatu.medianHari,
          tanpaKolokium: tanpaKolokium[selectedAngkatan] ?? 0,
        },
        konsentrasi: konsentrasiChart.sorted.map(k => ({ nama: k.name, jumlah: k.jumlah })),
        hasil: judulByAngkatan[selectedAngkatan] ?? null,
        interpretasi,
      });
      const tanggal = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
      doc.save(`Laporan_Analisis_${selectedAngkatan.replace(/\s+/g, "_")}_${tanggal}.pdf`);
    } catch (err) {
      console.error("Gagal membuat laporan PDF:", err);
      alert("Laporan PDF gagal dibuat. Silakan coba lagi.");
    } finally {
      setSedangMengunduh(false);
    }
  };

  const generateAIAnalysis = async () => {
    if (isBandingkan) return;
    const angkatan = selectedAngkatan;
    const buatUlang = !!interpretasi;
    if (buatUlang && !window.confirm("Buat ulang interpretasi AI untuk angkatan ini? Hasil baru akan menggantikan yang tampil sekarang (versi lama tetap tersimpan di database).")) {
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/analisis/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The server builds the summary from the database; only the angkatan is sent
        body: JSON.stringify({ angkatan, buatUlang })
      });

      const data = await res.json();
      if (!res.ok) {
        // Handle both string error and nested {error: {message}} shapes
        const errMsg = typeof data.error === 'string'
          ? data.error
          : data.error?.message || "Gagal mendapatkan analisis";
        throw new Error(errMsg);
      }
      setAiByAngkatan(prev => ({ ...prev, [angkatan]: data.tersimpan }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-slate-500 font-medium">Memuat data dari database...</p>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-6 h-6 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-bold text-lg mb-1">Gagal Memuat Data</h3>
          <p className="text-sm">{dataError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="m15 18-6-6 6-6"/></svg>
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Dashboard Analisis</h2>
            <p className="text-slate-500 text-sm mt-1">
              {isBandingkan ? "Membandingkan pola antar angkatan, dalam persentase." : "Pantau progres dan tren satu angkatan."}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {!isBandingkan && selectedAngkatan && (
            <button
              onClick={unduhLaporan}
              disabled={sedangMengunduh || memuatInterpretasi}
              title={interpretasi ? "Laporan memuat seluruh analisis angkatan ini dan interpretasi AI tersimpan" : "Laporan memuat seluruh analisis angkatan ini (interpretasi AI belum dibuat)"}
              className="flex items-center justify-center gap-2 bg-[#06125C] hover:bg-[#0a1a7a] text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sedangMengunduh ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              Unduh Laporan PDF
            </button>
          )}
          {/* Angkatan Filter Dropdown */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-slate-400" />
            </div>
            <select
              value={selectedAngkatan}
              onChange={(e) => { setSelectedAngkatan(e.target.value); setError(null); }}
              aria-label="Pilih angkatan"
              className="pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm cursor-pointer appearance-none"
            >
              {allAngkatan.length === 0 && <option value="">Belum ada angkatan</option>}
              {allAngkatan.map(angkatan => (
                <option key={angkatan} value={angkatan}>{angkatan}</option>
              ))}
              {allAngkatan.length > 1 && <option value={BANDINGKAN}>Bandingkan Angkatan</option>}
            </select>
          </div>
        </div>
      </div>

      {/* Grid Layout for Charts & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Funnel: Progres Mahasiswa */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Progres Mahasiswa</h3>
              <p className="text-xs text-slate-500">Jumlah mahasiswa di tiap tahap, dari kolokium sampai selesai Seminar Hasil</p>
            </div>
          </div>
          {isBandingkan ? (
            // Progress is a "where are we now" view of one running angkatan; older angkatan always look
            // further along simply because they started earlier, so it is not compared across angkatan
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl px-4 py-4">
              <p>Progres hanya ditampilkan per angkatan, karena angkatan yang lebih lama selalu tampak lebih maju.</p>
              {allAngkatan[0] && (
                <button onClick={() => setSelectedAngkatan(allAngkatan[0])} className="shrink-0 font-semibold text-indigo-600 hover:underline">
                  Lihat {allAngkatan[0]}
                </button>
              )}
            </div>
          ) : funnel.every(s => s.value === 0) ? (
            <div className="flex items-center justify-center h-32 text-sm text-slate-400">
              Belum ada data kolokium maupun Seminar Hasil
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {funnel.map((stage, i) => {
                  const base = Math.max(funnel[0].value, ...funnel.map(s => s.value), 1);
                  const width = (stage.value / base) * 100;
                  const persen = funnel[0].value ? persenDari(stage.value, funnel[0].value) : null;
                  const drop = i > 0 ? funnel[i - 1].value - stage.value : 0;
                  return (
                    <div key={stage.key} className="grid grid-cols-[minmax(0,9rem)_1fr] sm:grid-cols-[11rem_1fr_9rem] items-center gap-x-3 gap-y-1">
                      <span className="text-sm font-medium text-slate-600">{stage.label}</span>
                      <div className="h-8 bg-slate-50 rounded-lg overflow-hidden">
                        <div
                          className="h-full rounded-lg flex items-center px-3 transition-all"
                          style={{ width: `${Math.max(width, stage.value > 0 ? 4 : 0)}%`, backgroundColor: stage.color }}
                        >
                          <span className="text-xs font-bold text-white whitespace-nowrap">{stage.value}</span>
                        </div>
                      </div>
                      <span className="col-start-2 sm:col-start-auto text-xs text-slate-500">
                        {persen !== null && <span className="font-semibold text-slate-700">{persen}%</span>}
                        {drop > 0 && <span className="ml-2 text-rose-500">−{drop} dari tahap sebelumnya</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
              {funnel[0].value - funnel[1].value > 0 && (
                <p className="mt-5 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <strong>{funnel[0].value - funnel[1].value} mahasiswa</strong> sudah selesai kolokium tetapi belum mendaftar Seminar Hasil.
                </p>
              )}
            </>
          )}
        </div>

        {/* Chart 1: Durasi Kolokium ke Seminar Hasil */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Durasi Kolokium ke Seminar</h3>
              <p className="text-xs text-slate-500">
                {isBandingkan ? "Sebaran waktu tempuh per angkatan (100% = mahasiswa yang sudah selesai)" : "Jumlah mahasiswa berdasarkan waktu tempuh"}
              </p>
            </div>
          </div>
          <div className="h-[300px] w-full mt-auto">
            {!hasDurationData ? (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">
                Belum ada mahasiswa yang selesai Seminar Hasil Penelitian
              </div>
            ) : isBandingkan ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durasiBandingkan} layout="vertical" stackOffset="expand" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <XAxis type="number" tickFormatter={(v) => `${Math.round(v * 100)}%`} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis type="category" dataKey="name" width={70} axisLine={false} tickLine={false} interval={0} tick={{ fontSize: 12, fill: '#475569' }} />
                  <RechartsTooltip
                    cursor={{ fill: '#F1F5F9' }}
                    formatter={(value, name, item) => {
                      const total = (item?.payload as DurationRow | undefined)?.total ?? 0;
                      return [`${value} mahasiswa (${persenDari(Number(value), total)}%)`, name];
                    }}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: '11px', paddingBottom: 8 }} />
                  {DURATION_LABELS.map((label, index) => (
                    <Bar key={label} dataKey={label} stackId="durasi" fill={DURATION_COLORS[index]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durasiSatu.bars} margin={{ top: 24, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <RechartsTooltip
                    cursor={{ fill: '#F1F5F9' }}
                    formatter={(value) => [`${value} mahasiswa (${persenDari(Number(value), durasiSatu.total)}%)`, "Jumlah"]}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Bar dataKey="jumlah" radius={[4, 4, 0, 0]}>
                    {durasiSatu.bars.map((bar, index) => <Cell key={bar.name} fill={DURATION_COLORS[index]} />)}
                    <LabelList dataKey="label" position="top" style={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          {hasDurationData && (
            <div className="mt-4 flex flex-wrap gap-2">
              {(isBandingkan ? durasiBandingkan : durationData.filter(d => d.name === selectedAngkatan)).map(d => (
                d.medianHari !== null && (
                  <span key={d.name} className="text-xs bg-blue-50 text-blue-800 border border-blue-100 rounded-lg px-2.5 py-1">
                    {isBandingkan && <span className="font-semibold">{d.name} · </span>}
                    Median <span className="font-semibold">{formatDurasi(d.medianHari)}</span> · {d.total} mahasiswa
                  </span>
                )
              ))}
            </div>
          )}
          {jumlahTanpaKolokium > 0 && (
            <p className="text-xs text-slate-400 mt-3">
              {jumlahTanpaKolokium} mahasiswa tidak dihitung karena data jadwal kolokiumnya tidak ditemukan.
            </p>
          )}
        </div>

        {/* Chart 2: Tren Konsentrasi */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center">
              <Layers className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Tren Konsentrasi</h3>
              <p className="text-xs text-slate-500">
                {isBandingkan
                  ? "Komposisi konsentrasi per angkatan (pendaftar Seminar Hasil yang disetujui)"
                  : "Pendaftar Seminar Hasil yang disetujui admin, per konsentrasi"}
              </p>
            </div>
          </div>
          <div className="h-[300px] w-full mt-auto">
            {konsentrasiChart.sorted.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">
                Belum ada pendaftaran Seminar Hasil yang disetujui admin
              </div>
            ) : !isBandingkan ? (
              // One angkatan: ranked horizontal bars with count and share
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={konsentrasiChart.sorted} layout="vertical" margin={{ top: 0, right: 70, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={150} axisLine={false} tickLine={false} interval={0} tick={{ fontSize: 11, fill: '#475569' }} />
                  <RechartsTooltip
                    cursor={{ fill: '#F1F5F9' }}
                    formatter={(value) => [`${value} mahasiswa`, "Jumlah"]}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Bar dataKey="jumlah" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={22}>
                    <LabelList dataKey="label" position="right" style={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              // Compare: 100% stacked bars so shifts in konsentrasi share between angkatan are visible
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={konsentrasiChart.perAngkatan} layout="vertical" stackOffset="expand" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <XAxis type="number" tickFormatter={(v) => `${Math.round(v * 100)}%`} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis type="category" dataKey="name" width={70} axisLine={false} tickLine={false} interval={0} tick={{ fontSize: 12, fill: '#475569' }} />
                  <RechartsTooltip
                    cursor={{ fill: '#F1F5F9' }}
                    formatter={(value, name, item) => {
                      const total = Number((item?.payload as Record<string, unknown> | undefined)?.__total) || 0;
                      return [`${value} (${persenDari(Number(value), total)}%)`, name];
                    }}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: '11px', paddingBottom: 8 }} />
                  {konsentrasiChart.sorted.map((kons, index) => (
                    <Bar key={kons.name} dataKey={kons.name} stackId="kons" fill={COLORS[index % COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Analisis Judul Penelitian: rule-based results first, AI interpretation as a complement */}
        <div className="bg-slate-50/60 p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col lg:col-span-2">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <Lightbulb className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Analisis Judul Penelitian</h3>
              <p className="text-xs text-slate-500">
                {isBandingkan
                  ? "Pergeseran topik antar angkatan, dari judul Seminar Hasil yang disetujui"
                  : `Topik, objek, kemiripan dan keunikan judul Seminar Hasil ${selectedAngkatan} yang disetujui`}
              </p>
            </div>
          </div>

          {isBandingkan ? (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <PergeseranTopik perAngkatan={judulByAngkatan} angkatanList={[...allAngkatan].reverse()} />
            </div>
          ) : (
            <AnalisisJudulPanel hasil={judulByAngkatan[selectedAngkatan]} />
          )}

          {/* AI interpretation (complement) */}
          <div className="mt-4 bg-white rounded-xl border border-emerald-100 p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-600" /> Interpretasi AI</h4>
                <p className="text-xs text-slate-500">Pelengkap. Hasil di atas tetap tersedia tanpa AI.</p>
              </div>
              <button
                onClick={generateAIAnalysis}
                disabled={isGenerating || isBandingkan || memuatInterpretasi}
                title={isBandingkan ? "Pilih satu angkatan untuk interpretasi AI" : undefined}
                className="flex items-center gap-2 bg-white border border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isGenerating ? "Menganalisis..." : interpretasi ? "Buat Ulang" : "Buat Interpretasi"}
              </button>
            </div>

            {error && !isBandingkan && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 mb-4">
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-1">Gagal Menghasilkan Interpretasi</p>
                  <p className="text-sm">{error}</p>
                  <button
                    onClick={generateAIAnalysis}
                    disabled={isGenerating}
                    className="mt-2 text-xs font-semibold underline hover:no-underline disabled:opacity-50"
                  >
                    Coba lagi
                  </button>
                </div>
              </div>
            )}

            {isBandingkan ? (
              <p className="text-sm text-slate-500">Interpretasi AI dibuat per angkatan. Pilih satu angkatan untuk membuatnya.</p>
            ) : memuatInterpretasi ? (
              <p className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Memuat interpretasi tersimpan...</p>
            ) : interpretasi ? (
              <InterpretasiAIPanel hasil={interpretasi} />
            ) : (
              <p className="text-sm text-slate-500">
                Belum ada interpretasi. Klik <span className="font-medium">Buat Interpretasi</span> agar AI menafsirkan hasil olahan di atas:
                tema besar, temuan, penilaian judul mirip, celah topik, dan rekomendasi untuk admin serta Kaprodi/Sekprodi.
                Yang dikirim ke AI hanya ringkasan angka dan judul, tanpa nama atau NIM.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
