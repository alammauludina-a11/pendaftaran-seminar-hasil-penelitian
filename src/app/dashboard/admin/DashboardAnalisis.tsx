"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LabelList
} from "recharts";
import { Sparkles, Loader2, AlertCircle, Clock, Lightbulb, Layers, Filter, Users } from "lucide-react";

const COLORS = ["#3B82F6", "#8B5CF6", "#F59E0B", "#10B981", "#EF4444", "#EC4899", "#06B6D4"];
const DURATION_LABELS = ["< 1 Bulan", "1 - 3 Bulan", "3 - 6 Bulan", "> 6 Bulan"];

type FunnelRow = { name: string; kolokium: number; daftarHasil: number; disetujui: number; dirilis: number; selesai: number };
const FUNNEL_STAGES: { key: keyof Omit<FunnelRow, "name">; label: string; color: string }[] = [
  { key: "kolokium", label: "Kolokium selesai", color: "#6366F1" },
  { key: "daftarHasil", label: "Daftar Seminar Hasil", color: "#8B5CF6" },
  { key: "disetujui", label: "Pendaftaran disetujui", color: "#3B82F6" },
  { key: "dirilis", label: "Jadwal dirilis", color: "#06B6D4" },
  { key: "selesai", label: "Selesai Seminar Hasil", color: "#10B981" },
];

export default function DashboardAnalisis({ onBack }: { onBack?: () => void }) {
  const [aiAnalysisTitles, setAiAnalysisTitles] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Database Data States
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [durationData, setDurationData] = useState<any[]>([]);
  const [konsentrasiData, setKonsentrasiData] = useState<any[]>([]);
  const [titlesData, setTitlesData] = useState<string[]>([]);
  const [tanpaKolokium, setTanpaKolokium] = useState(0);
  const [funnelData, setFunnelData] = useState<FunnelRow[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);

  // Filter State
  const [selectedAngkatan, setSelectedAngkatan] = useState<string>("Semua");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/admin/analisis/data");
        if (!res.ok) throw new Error("Gagal mengambil data analitik dari database");
        const data = await res.json();
        setDurationData(data.durationData || []);
        setKonsentrasiData(data.konsentrasiData || []);
        setTitlesData(data.titles || []);
        setTanpaKolokium(data.tanpaKolokium || 0);
        setFunnelData(data.funnelData || []);
      } catch (err: any) {
        setDataError(err.message);
      } finally {
        setIsLoadingData(false);
      }
    }
    fetchData();
  }, []);

  // Get all unique Angkatan for the filter dropdown
  const allAngkatan = useMemo(() => {
    const angkatans = new Set<string>();
    durationData.forEach(d => angkatans.add(d.name));
    konsentrasiData.forEach(d => angkatans.add(d.name));
    funnelData.forEach(d => angkatans.add(d.name));
    return Array.from(angkatans).sort();
  }, [durationData, konsentrasiData, funnelData]);

  // Funnel totals for the selected angkatan (or summed across all)
  const funnel = useMemo(() => {
    const source = selectedAngkatan === "Semua" ? funnelData : funnelData.filter(d => d.name === selectedAngkatan);
    return FUNNEL_STAGES.map(stage => ({
      ...stage,
      value: source.reduce((acc, row) => acc + (row[stage.key] || 0), 0),
    }));
  }, [funnelData, selectedAngkatan]);

  // Transformed Data for Chart 1: X = Duration, Lines/Bars = Angkatan
  const transformedDurationData = useMemo(() => {
    const filteredSource = selectedAngkatan === "Semua" 
      ? durationData 
      : durationData.filter(d => d.name === selectedAngkatan);

    return DURATION_LABELS.map(durationLabel => {
      const row: any = { name: durationLabel };
      filteredSource.forEach(angkatanData => {
        row[angkatanData.name] = angkatanData[durationLabel] || 0;
      });
      return row;
    });
  }, [durationData, selectedAngkatan]);

  const hasDurationData = useMemo(
    () => transformedDurationData.some(row =>
      Object.entries(row).some(([k, v]) => k !== "name" && typeof v === "number" && v > 0)
    ),
    [transformedDurationData]
  );

  // Chart 2 data: konsentrasi sorted by total (desc), plus one row per angkatan for the comparison view
  const konsentrasiChart = useMemo(() => {
    const filteredSource = selectedAngkatan === "Semua"
      ? konsentrasiData
      : konsentrasiData.filter(d => d.name === selectedAngkatan);

    const totals: Record<string, number> = {};
    filteredSource.forEach(item => {
      Object.entries(item).forEach(([k, v]) => {
        if (k !== "name" && typeof v === "number") totals[k] = (totals[k] || 0) + v;
      });
    });
    const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

    const sorted = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, jumlah]) => {
        const persen = grandTotal ? Math.round((jumlah / grandTotal) * 100) : 0;
        return { name, jumlah, persen, label: `${jumlah} · ${persen}%` };
      });

    const perAngkatan = filteredSource.map(item => {
      const row: any = { name: item.name, __total: 0 };
      sorted.forEach(k => {
        row[k.name] = item[k.name] || 0;
        row.__total += row[k.name];
      });
      return row;
    });

    return { sorted, perAngkatan, angkatanCount: filteredSource.length };
  }, [konsentrasiData, selectedAngkatan]);

  // Keys (Angkatans) to plot as bars/lines
  const activeAngkatanKeys = useMemo(() => {
    if (selectedAngkatan !== "Semua") return [selectedAngkatan];
    return allAngkatan;
  }, [allAngkatan, selectedAngkatan]);

  const generateAIAnalysis = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/analisis/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titles: titlesData
        })
      });

      const data = await res.json();
      if (!res.ok) {
        // Handle both string error and nested {error: {message}} shapes
        const errMsg = typeof data.error === 'string'
          ? data.error
          : data.error?.message || "Gagal mendapatkan analisis";
        throw new Error(errMsg);
      }
      setAiAnalysisTitles(data.titles);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Renders **bold** as React elements so AI output (which may echo student-supplied titles) is never parsed as HTML
  const renderMarkdownText = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => (
      <p key={i} className="mb-2 text-slate-600 leading-relaxed">
        {line.split(/(\*\*.*?\*\*)/g).map((part, j) =>
          part.startsWith("**") && part.endsWith("**") && part.length > 4
            ? <strong key={j}>{part.slice(2, -2)}</strong>
            : part
        )}
      </p>
    ));
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
            <p className="text-slate-500 text-sm mt-1">Pantau tren angkatan dan wawasan akademik.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Angkatan Filter Dropdown */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-slate-400" />
            </div>
            <select
              value={selectedAngkatan}
              onChange={(e) => setSelectedAngkatan(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm cursor-pointer appearance-none"
            >
              <option value="Semua">Semua Angkatan</option>
              {allAngkatan.map(angkatan => (
                <option key={angkatan} value={angkatan}>{angkatan}</option>
              ))}
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
          {funnel.every(s => s.value === 0) ? (
            <div className="flex items-center justify-center h-32 text-sm text-slate-400">
              Belum ada data kolokium maupun Seminar Hasil
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {funnel.map((stage, i) => {
                  const base = Math.max(funnel[0].value, ...funnel.map(s => s.value), 1);
                  const width = (stage.value / base) * 100;
                  const persen = funnel[0].value ? Math.round((stage.value / funnel[0].value) * 100) : null;
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

        {/* Chart 1: Waktu Tempuh Per Durasi */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Durasi Kolokium ke Seminar</h3>
              <p className="text-xs text-slate-500">Jumlah mahasiswa berdasarkan waktu tempuh</p>
            </div>
          </div>
          <div className="h-[300px] w-full mt-auto">
            {hasDurationData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={transformedDurationData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <RechartsTooltip 
                    cursor={{ fill: '#F1F5F9' }} 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  {activeAngkatanKeys.map((angkatan, index) => (
                    <Bar 
                      key={angkatan} 
                      dataKey={angkatan} 
                      fill={COLORS[index % COLORS.length]} 
                      radius={[4, 4, 0, 0]} 
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">
                Belum ada mahasiswa yang selesai Seminar Hasil Penelitian
              </div>
            )}
          </div>
          {tanpaKolokium > 0 && (
            <p className="text-xs text-slate-400 mt-3">
              {tanpaKolokium} mahasiswa tidak dihitung karena data jadwal kolokiumnya tidak ditemukan.
            </p>
          )}
        </div>

        {/* Chart 2: Tren Konsentrasi Per Konsentrasi */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center">
              <Layers className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Tren Konsentrasi</h3>
              <p className="text-xs text-slate-500">
                {konsentrasiChart.angkatanCount > 1
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
            ) : konsentrasiChart.angkatanCount <= 1 ? (
              // One angkatan: ranked horizontal bars with count and share
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={konsentrasiChart.sorted} layout="vertical" margin={{ top: 0, right: 70, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={150} axisLine={false} tickLine={false} interval={0} tick={{ fontSize: 11, fill: '#475569' }} />
                  <RechartsTooltip
                    cursor={{ fill: '#F1F5F9' }}
                    formatter={(value) => [`${value} mahasiswa`, "Jumlah"]}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="jumlah" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={22}>
                    <LabelList dataKey="label" position="right" style={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              // Several angkatan: 100% stacked bars so shifts in konsentrasi share between angkatan are visible
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={konsentrasiChart.perAngkatan} layout="vertical" stackOffset="expand" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <XAxis type="number" tickFormatter={(v) => `${Math.round(v * 100)}%`} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis type="category" dataKey="name" width={70} axisLine={false} tickLine={false} interval={0} tick={{ fontSize: 12, fill: '#475569' }} />
                  <RechartsTooltip
                    cursor={{ fill: '#F1F5F9' }}
                    formatter={(value, name, item) => {
                      const total = (item?.payload as any)?.__total || 0;
                      const persen = total ? Math.round((Number(value) / total) * 100) : 0;
                      return [`${value} (${persen}%)`, name];
                    }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
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

        {/* Column 3: Analisis Judul Penelitian */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex flex-col bg-gradient-to-b from-emerald-50/30 to-transparent lg:col-span-2">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Analisis Judul Penelitian</h3>
                <p className="text-xs text-slate-500">Tingkat kesamaan dan keunikan judul</p>
              </div>
            </div>

            <button 
              onClick={generateAIAnalysis}
              disabled={isGenerating}
              className="flex items-center gap-2 bg-white border border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isGenerating ? "Menganalisis..." : "Generate AI Insights"}
            </button>
          </div>
          
          {/* AI Error Alert Specific to Title */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold mb-1">Gagal Menghasilkan Analisis</p>
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

          <div className="flex-grow flex flex-col justify-center">
            {aiAnalysisTitles ? (
              <div className="bg-white/80 p-5 rounded-xl border border-emerald-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-emerald-600"></div>
                <div className="prose prose-sm prose-slate max-w-none ml-2">
                  {renderMarkdownText(aiAnalysisTitles)}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Lightbulb className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-500 mb-1">Belum ada analisis</p>
                <p className="text-xs text-slate-400 max-w-[250px] mx-auto">Klik tombol Generate AI Insights untuk membedah ringkasan keunikan judul mahasiswa.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
