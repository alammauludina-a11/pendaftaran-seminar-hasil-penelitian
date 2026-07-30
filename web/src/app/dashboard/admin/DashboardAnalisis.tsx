"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from "recharts";
import { Sparkles, Loader2, AlertCircle, Clock, Lightbulb, Layers, Filter } from "lucide-react";

const COLORS = ["#3B82F6", "#8B5CF6", "#F59E0B", "#10B981", "#EF4444", "#EC4899", "#06B6D4"];
const DURATION_LABELS = ["< 1 Bulan", "1 - 3 Bulan", "3 - 6 Bulan", "> 6 Bulan"];

export default function DashboardAnalisis() {
  const [aiAnalysisTitles, setAiAnalysisTitles] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Database Data States
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [durationData, setDurationData] = useState<any[]>([]);
  const [konsentrasiData, setKonsentrasiData] = useState<any[]>([]);
  const [titlesData, setTitlesData] = useState<string[]>([]);
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
    return Array.from(angkatans).sort();
  }, [durationData, konsentrasiData]);

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

  // Transformed Data for Chart 2: X = Konsentrasi, Lines/Bars = Angkatan
  const transformedKonsentrasiData = useMemo(() => {
    const filteredSource = selectedAngkatan === "Semua" 
      ? konsentrasiData 
      : konsentrasiData.filter(d => d.name === selectedAngkatan);

    // Get all unique konsentrasi names
    const konsentrasiNames = new Set<string>();
    filteredSource.forEach(item => {
      Object.keys(item).forEach(k => {
        if (k !== "name") konsentrasiNames.add(k);
      });
    });

    return Array.from(konsentrasiNames).map(konsName => {
      const row: any = { name: konsName };
      filteredSource.forEach(angkatanData => {
        row[angkatanData.name] = angkatanData[konsName] || 0;
      });
      return row;
    });
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
        throw new Error(data.error || "Gagal mendapatkan analisis");
      }
      setAiAnalysisTitles(data.titles);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderMarkdownText = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => (
      <p 
        key={i} 
        className="mb-2 text-slate-600 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
      />
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
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard Analisis</h2>
          <p className="text-slate-500 text-sm mt-1">Pantau tren angkatan dan wawasan akademik.</p>
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
            {transformedDurationData.length > 0 ? (
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
                Belum ada data pendaftaran seminar
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Tren Konsentrasi Per Konsentrasi */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center">
              <Layers className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Tren Konsentrasi</h3>
              <p className="text-xs text-slate-500">Jumlah mahasiswa berdasarkan program studi</p>
            </div>
          </div>
          <div className="h-[300px] w-full mt-auto">
            {transformedKonsentrasiData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={transformedKonsentrasiData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} padding={{ left: 30, right: 30 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  {activeAngkatanKeys.map((angkatan, index) => (
                    <Line 
                      key={angkatan}
                      type="monotone" 
                      dataKey={angkatan} 
                      stroke={COLORS[index % COLORS.length]} 
                      strokeWidth={3} 
                      activeDot={{ r: 6 }} 
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">
                Belum ada data pendaftaran seminar
              </div>
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
              <div className="text-sm">{error}</div>
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
