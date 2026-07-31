"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { Loader2, Users, UserCheck, User, Clock, AlertCircle } from "lucide-react";

const COLORS = ["#3B82F6", "#10B981"]; // Blue for Mahasiswa, Green for Dosen

export default function AnalisisLog() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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

  const filteredUsers = useMemo(() => {
    if (!data?.userLogins) return [];
    return data.userLogins.filter((u: any) => 
      u.nama.toLowerCase().includes(search.toLowerCase()) || 
      u.nipNim.toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  const pieData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Mahasiswa", value: data.mahasiswaLogins },
      { name: "Dosen", value: data.dosenLogins }
    ];
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Memuat data log aktivitas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-10 h-10 mb-3 text-red-500" />
        <h3 className="font-bold text-lg mb-1">Gagal Memuat Data</h3>
        <p className="text-sm opacity-90">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#06125C] mb-2">Analisis Log Aktivitas</h2>
        <p className="text-slate-500">Pantau aktivitas login pengguna di dalam sistem Seminar Hub.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">Total Login</p>
            <h3 className="text-3xl font-black text-slate-800">{data?.totalLogins || 0}</h3>
          </div>
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
            <Users size={28} />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">Login Mahasiswa</p>
            <h3 className="text-3xl font-black text-slate-800">{data?.mahasiswaLogins || 0}</h3>
          </div>
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
            <User size={28} />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">Login Dosen</p>
            <h3 className="text-3xl font-black text-slate-800">{data?.dosenLogins || 0}</h3>
          </div>
          <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shadow-sm">
            <UserCheck size={28} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Proporsi Kelompok Pengguna</h3>
          <div className="flex-grow flex items-center justify-center min-h-[300px]">
            {data?.totalLogins > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400">Belum ada data login.</p>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col h-[500px]">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-slate-800">Detail Log Pengguna</h3>
            <input 
              type="text" 
              placeholder="Cari nama atau NIP/NIM..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-w-[250px]"
            />
          </div>
          <div className="flex-grow overflow-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 sticky top-0 shadow-sm border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-slate-600 font-semibold">Pengguna</th>
                  <th className="px-6 py-4 text-slate-600 font-semibold">Tipe Akun</th>
                  <th className="px-6 py-4 text-center text-slate-600 font-semibold">Jumlah Login</th>
                  <th className="px-6 py-4 text-right text-slate-600 font-semibold">Login Terakhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{u.nama}</div>
                        <div className="text-xs text-slate-500">{u.nipNim}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-[11px] font-bold rounded-md uppercase tracking-wider ${u.role === 'mahasiswa' ? 'bg-blue-100 text-blue-700' : u.role === 'dosen' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-700">
                        {u.loginCount}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleString('id-ID', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        }) : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                      Tidak ada data log yang sesuai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
