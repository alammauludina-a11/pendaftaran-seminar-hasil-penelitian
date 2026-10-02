"use client";

import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Clock, Globe, Monitor } from "lucide-react";
import { formatWaktu, hariWib, waktuRelatif, type UserLogin } from "./log-shared";

type SortKey = "nama" | "role" | "loginCount" | "lastLogin";

const ALIGN = { left: "text-left", center: "text-center", right: "text-right" } as const;

const ROLE_BADGE: Record<string, string> = {
  mahasiswa: "bg-blue-100 text-blue-700",
  dosen: "bg-green-100 text-green-700",
  admin: "bg-slate-100 text-slate-700",
};

export default function LogDetailPengguna({ users }: { users: UserLogin[] }) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("semua");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "lastLogin", dir: "desc" });
  const [selected, setSelected] = useState<UserLogin | null>(null);

  const adaRentang = !!(dari || sampai);

  // Login counts and "last login" are recomputed inside the chosen date range
  const rows = useMemo(() => {
    const q = search.toLowerCase();
    const inRange = (waktu: string) => {
      const day = hariWib(waktu);
      return (!dari || day >= dari) && (!sampai || day <= sampai);
    };
    const result = users
      .filter(u => role === "semua" || u.role === role)
      .filter(u => u.nama.toLowerCase().includes(q) || u.nipNim.toLowerCase().includes(q))
      .map(u => {
        const history = adaRentang ? u.history.filter(h => inRange(h.waktu)) : u.history;
        return { ...u, loginCount: history.length, lastLogin: history[0]?.waktu ?? null };
      })
      .filter(u => !adaRentang || u.loginCount > 0);

    const dir = sort.dir === "asc" ? 1 : -1;
    return result.sort((a, b) => {
      switch (sort.key) {
        case "nama": return a.nama.localeCompare(b.nama) * dir;
        case "role": return a.role.localeCompare(b.role) * dir;
        case "loginCount": return (a.loginCount - b.loginCount) * dir;
        case "lastLogin": return ((a.lastLogin ? new Date(a.lastLogin).getTime() : 0) - (b.lastLogin ? new Date(b.lastLogin).getTime() : 0)) * dir;
      }
    });
  }, [users, search, role, dari, sampai, adaRentang, sort]);

  const toggleSort = (key: SortKey) =>
    setSort(prev => prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "nama" || key === "role" ? "asc" : "desc" });

  const sortHeader = (label: string, k: SortKey, align: keyof typeof ALIGN = "left") => {
    const Icon = sort.key !== k ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <th className={`px-6 py-4 text-slate-600 font-semibold ${ALIGN[align]}`} aria-sort={sort.key === k ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
        <button onClick={() => toggleSort(k)} className={`inline-flex items-center gap-1.5 hover:text-indigo-600 ${sort.key === k ? "text-indigo-600" : ""}`}>
          {label}
          <Icon className="w-3.5 h-3.5" />
        </button>
      </th>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[560px]">
      <div className="p-6 border-b border-slate-100 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-800">Detail Log Pengguna</h3>
          <input
            type="text"
            placeholder="Cari nama atau NIP/NIM..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 md:min-w-[250px]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select value={role} onChange={(e) => setRole(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700">
            <option value="semua">Semua peran</option>
            <option value="mahasiswa">Mahasiswa</option>
            <option value="dosen">Dosen</option>
            <option value="admin">Admin</option>
          </select>
          <label className="flex items-center gap-2 text-slate-500">
            Dari
            <input type="date" value={dari} max={sampai || undefined} onChange={(e) => setDari(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700" />
          </label>
          <label className="flex items-center gap-2 text-slate-500">
            Sampai
            <input type="date" value={sampai} min={dari || undefined} onChange={(e) => setSampai(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700" />
          </label>
          {(adaRentang || role !== "semua") && (
            <button onClick={() => { setDari(""); setSampai(""); setRole("semua"); }} className="px-3 py-2 text-indigo-600 font-medium hover:underline">
              Reset filter
            </button>
          )}
          <span className="ml-auto text-xs text-slate-400">{rows.length} pengguna</span>
        </div>
      </div>
      <div className="flex-grow overflow-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 sticky top-0 shadow-sm border-b border-slate-200">
            <tr>
              {sortHeader("Pengguna", "nama")}
              {sortHeader("Tipe Akun", "role")}
              {sortHeader(adaRentang ? "Login (rentang)" : "Jumlah Login", "loginCount", "center")}
              {sortHeader("Terakhir Aktif", "lastLogin", "right")}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length > 0 ? (
              rows.map(u => (
                <tr key={u.id} onClick={() => setSelected(users.find(x => x.id === u.id) ?? null)} className="hover:bg-indigo-50/50 cursor-pointer transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{u.nama}</div>
                    <div className="text-xs text-slate-500">{u.nipNim}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-[11px] font-bold rounded-md uppercase tracking-wider ${ROLE_BADGE[u.role] ?? ROLE_BADGE.admin}`}>{u.role}</span>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-slate-700">{u.loginCount}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-slate-700 font-medium">{waktuRelatif(u.lastLogin)}</div>
                    {u.lastLogin && <div className="text-xs text-slate-400">{formatWaktu(u.lastLogin)}</div>}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-slate-500">Tidak ada data log yang sesuai.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Riwayat Login</h3>
                <p className="text-sm text-slate-500">{selected.nama} · {selected.history.length} login</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Tutup"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="overflow-y-auto p-2">
              {selected.history.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {selected.history.map((h, idx) => (
                    <li key={idx} className="px-4 py-3 hover:bg-slate-50 rounded-xl">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-slate-600 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px]">
                            {selected.history.length - idx}
                          </span>
                          {formatWaktu(h.waktu)}
                        </span>
                        <span className="text-xs text-slate-400">{waktuRelatif(h.waktu)}</span>
                      </div>
                      <div className="mt-1.5 ml-8 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Monitor className="w-3.5 h-3.5" />{h.perangkat}</span>
                        <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{h.ip || "IP tidak tercatat"}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-8 text-center flex flex-col items-center justify-center">
                  <Clock className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">Tidak ada riwayat detail</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
