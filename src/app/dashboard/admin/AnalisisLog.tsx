"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine
} from "recharts";
import { Loader2, Users, UserX, LogIn, AlertCircle, CalendarDays, FileSpreadsheet, FileText, Info, KeyRound } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { drawPdfHeader, pdfTableOptions, formatAngkatan } from "@/lib/pdf-layout";
import { formatTanggal, type LogData } from "./log-shared";
import LogDetailPengguna from "./LogDetailPengguna";
import LogKeamanan from "./LogKeamanan";
import LogAktivitasAdmin from "./LogAktivitasAdmin";

type Tab = "login" | "keamanan" | "aktivitas";

export default function AnalisisLog({ onBack }: { onBack?: () => void }) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<LogData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchBelum, setSearchBelum] = useState("");
  const [tab, setTab] = useState<Tab>("login");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/admin/log");
        if (!res.ok) throw new Error("Gagal mengambil data log");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredBelumLogin = useMemo(() => {
    if (!data?.belumLogin) return [];
    const q = searchBelum.toLowerCase();
    return data.belumLogin.filter(m => m.nama.toLowerCase().includes(q) || m.nipNim.toLowerCase().includes(q));
  }, [data, searchBelum]);

  const hasDailyLogins = useMemo(() => data?.daily.some(d => d.mahasiswa + d.dosen > 0) ?? false, [data]);

  const exportBelumLoginExcel = () => {
    if (!data) return;
    const ws = XLSX.utils.json_to_sheet(data.belumLogin.map((m, i) => ({
      No: i + 1,
      NIM: m.nipNim,
      Nama: m.nama,
      Angkatan: formatAngkatan(m.angkatan),
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Belum Login");
    XLSX.writeFile(wb, "Mahasiswa_Belum_Pernah_Login.xlsx");
  };

  const exportBelumLoginPdf = () => {
    if (!data) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const startY = drawPdfHeader(doc, "Mahasiswa Belum Pernah Login", [
      `Total: ${data.belumLogin.length} dari ${data.kpi.totalMahasiswa} mahasiswa`,
    ]);
    autoTable(doc, pdfTableOptions(doc, startY, {
      head: [["No", "NIM", "Nama", "Angkatan"]],
      body: data.belumLogin.map((m, i) => [i + 1, m.nipNim, m.nama, formatAngkatan(m.angkatan)]),
      columnStyles: { 0: { halign: "center", cellWidth: 12 }, 1: { cellWidth: 35 }, 3: { halign: "center", cellWidth: 28 } },
    }));
    doc.save("Mahasiswa_Belum_Pernah_Login.pdf");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Memuat data log aktivitas...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-10 h-10 mb-3 text-red-500" />
        <h3 className="font-bold text-lg mb-1">Gagal Memuat Data</h3>
        <p className="text-sm opacity-90">{error}</p>
      </div>
    );
  }

  const persenBelum = data.kpi.totalMahasiswa ? Math.round((data.kpi.belumPernahLogin / data.kpi.totalMahasiswa) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center gap-4">
        {onBack && (
          <button onClick={onBack} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="m15 18-6-6 6-6"/></svg>
          </button>
        )}
        <div>
          <h2 className="text-2xl font-bold text-[#06125C] mb-2">Analisis Log Aktivitas</h2>
          <p className="text-slate-500">Pantau login, keamanan akun, dan aktivitas admin di dalam sistem Seminar Hub.</p>
        </div>
      </div>

      <div role="tablist" className="flex gap-1 p-1 bg-slate-100 rounded-xl w-full sm:w-fit overflow-x-auto">
        {([
          ["login", "Login"],
          ["keamanan", "Keamanan"],
          ["aktivitas", "Aktivitas Admin"],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${tab === key ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            {label}
            {key === "keamanan" && (data.kpi.loginGagal24Jam > 0 || data.keamanan.gagalBeruntun.length > 0) && (
              <span className="ml-2 inline-block w-2 h-2 rounded-full bg-rose-500 align-middle" aria-label="ada peringatan" />
            )}
          </button>
        ))}
      </div>

      {tab === "login" && (
        <>

      <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Pencatatan login lengkap dimulai {formatTanggal(data.pencatatanSejak, { day: "numeric", month: "long", year: "numeric" })}.
          Login sebelum tanggal itu hanya tercatat bila pengguna belum logout, sehingga angka lama bisa lebih kecil dari kenyataan.
          Mahasiswa yang sudah pernah mendaftar seminar dianggap sudah pernah login.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">Aktif 7 Hari</p>
            <h3 className="text-3xl font-black text-slate-800">{data.kpi.aktif7Hari}</h3>
            <p className="text-xs text-slate-400 mt-1">Mahasiswa &amp; dosen yang login</p>
          </div>
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
            <Users size={28} />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">Login Hari Ini</p>
            <h3 className="text-3xl font-black text-slate-800">{data.kpi.loginHariIni}</h3>
            <p className="text-xs text-slate-400 mt-1">Mahasiswa &amp; dosen</p>
          </div>
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
            <LogIn size={28} />
          </div>
        </div>
        <a href="#belum-login" className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200 flex items-center justify-between hover:bg-amber-50/40 transition-colors">
          <div>
            <p className="text-sm font-semibold text-amber-700 mb-1 uppercase tracking-wider">Belum Pernah Login</p>
            <h3 className="text-3xl font-black text-slate-800">{data.kpi.belumPernahLogin}</h3>
            <p className="text-xs text-slate-400 mt-1">{persenBelum}% dari {data.kpi.totalMahasiswa} mahasiswa</p>
          </div>
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm">
            <UserX size={28} />
          </div>
        </a>
        <button onClick={() => setTab("keamanan")} className={`text-left bg-white rounded-2xl p-6 shadow-sm border flex items-center justify-between transition-colors ${data.kpi.loginGagal24Jam > 0 ? "border-rose-200 hover:bg-rose-50/40" : "border-slate-200 hover:bg-slate-50"}`}>
          <div>
            <p className={`text-sm font-semibold mb-1 uppercase tracking-wider ${data.kpi.loginGagal24Jam > 0 ? "text-rose-700" : "text-slate-500"}`}>Login Gagal 24 Jam</p>
            <h3 className="text-3xl font-black text-slate-800">{data.kpi.loginGagal24Jam}</h3>
            <p className="text-xs text-slate-400 mt-1">Lihat tab Keamanan</p>
          </div>
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shadow-sm">
            <KeyRound size={28} />
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily logins */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-lg font-bold text-slate-800">Login per Hari</h3>
              <p className="text-xs text-slate-500">30 hari terakhir · garis putus-putus menandai tanggal penting periode</p>
            </div>
          </div>
          <div className="h-[300px]">
            {hasDailyLogins ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.daily} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tickFormatter={(d) => formatTanggal(d)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} minTickGap={16} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <RechartsTooltip
                    cursor={{ fill: '#F1F5F9' }}
                    labelFormatter={(d) => formatTanggal(String(d), { weekday: "long", day: "numeric", month: "long" })}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="top" height={30} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="mahasiswa" name="Mahasiswa" stackId="login" fill="#3B82F6" />
                  <Bar dataKey="dosen" name="Dosen" stackId="login" fill="#10B981" radius={[4, 4, 0, 0]} />
                  {data.markers.map(m => (
                    <ReferenceLine key={`${m.date}-${m.label}`} x={m.date} stroke="#F59E0B" strokeDasharray="4 4" />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">Belum ada login dalam 30 hari terakhir.</div>
            )}
          </div>
          {data.markers.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {data.markers.map(m => (
                <li key={`${m.date}-${m.label}`} className="text-xs bg-amber-50 text-amber-800 border border-amber-100 rounded-lg px-2.5 py-1">
                  <span className="font-semibold">{formatTanggal(m.date)}</span> · {m.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Adoption per angkatan */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-1">Mahasiswa Sudah Login</h3>
          <p className="text-xs text-slate-500 mb-6">Pernah login atau mendaftar seminar, per angkatan</p>
          {data.adopsi.length > 0 ? (
            <div className="space-y-5">
              {data.adopsi.map(a => {
                const persen = a.total ? Math.round((a.sudahLogin / a.total) * 100) : 0;
                return (
                  <div key={a.angkatan}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-sm font-semibold text-slate-700">{formatAngkatan(a.angkatan) || a.angkatan}</span>
                      <span className="text-xs text-slate-500"><span className="font-bold text-slate-800">{a.sudahLogin}</span> / {a.total} · {persen}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${persen}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Belum ada data mahasiswa.</p>
          )}
        </div>
      </div>

      {/* Never logged in */}
      <div id="belum-login" className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col max-h-[500px] scroll-mt-6">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Mahasiswa Belum Pernah Login</h3>
            <p className="text-xs text-slate-500">{data.belumLogin.length} mahasiswa · berisiko terlewat pendaftaran seminar</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Cari nama atau NIM..."
              value={searchBelum}
              onChange={(e) => setSearchBelum(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 sm:min-w-[220px]"
            />
            <button onClick={exportBelumLoginExcel} disabled={data.belumLogin.length === 0} className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-emerald-200 text-emerald-700 bg-white hover:bg-emerald-50 disabled:opacity-50">
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
            <button onClick={exportBelumLoginPdf} disabled={data.belumLogin.length === 0} className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-rose-200 text-rose-700 bg-white hover:bg-rose-50 disabled:opacity-50">
              <FileText className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 sticky top-0 shadow-sm border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-slate-600 font-semibold w-16">No</th>
                <th className="px-6 py-3 text-slate-600 font-semibold">NIM</th>
                <th className="px-6 py-3 text-slate-600 font-semibold">Nama</th>
                <th className="px-6 py-3 text-slate-600 font-semibold">Angkatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBelumLogin.length > 0 ? (
                filteredBelumLogin.map((m, i) => (
                  <tr key={m.nipNim}>
                    <td className="px-6 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-6 py-3 text-slate-600">{m.nipNim}</td>
                    <td className="px-6 py-3 font-medium text-slate-800">{m.nama}</td>
                    <td className="px-6 py-3 text-slate-600">{formatAngkatan(m.angkatan) || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                    {data.belumLogin.length === 0 ? "Semua mahasiswa sudah pernah login." : "Tidak ada yang cocok dengan pencarian."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <LogDetailPengguna users={data.userLogins} />
        </>
      )}

      {tab === "keamanan" && <LogKeamanan data={data.keamanan} loginGagal24Jam={data.kpi.loginGagal24Jam} />}

      {tab === "aktivitas" && <LogAktivitasAdmin />}
    </div>
  );
}
