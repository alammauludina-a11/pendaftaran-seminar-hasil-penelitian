"use client";

import React from "react";
import { ShieldAlert, ShieldCheck, KeyRound, MonitorSmartphone } from "lucide-react";
import { formatWaktu, waktuRelatif, type KeamananData } from "./log-shared";

export default function LogKeamanan({ data, loginGagal24Jam }: { data: KeamananData; loginGagal24Jam: number }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`bg-white rounded-2xl p-6 shadow-sm border flex items-center justify-between ${loginGagal24Jam > 0 ? "border-rose-200" : "border-slate-200"}`}>
          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">Login Gagal 24 Jam</p>
            <h3 className="text-3xl font-black text-slate-800">{loginGagal24Jam}</h3>
            <p className="text-xs text-slate-400 mt-1">Password atau username salah</p>
          </div>
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shadow-sm">
            <KeyRound size={28} />
          </div>
        </div>
        <div className={`bg-white rounded-2xl p-6 shadow-sm border flex items-center justify-between ${data.gagalBeruntun.length > 0 ? "border-rose-200" : "border-slate-200"}`}>
          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">Akun Perlu Dicek</p>
            <h3 className="text-3xl font-black text-slate-800">{data.gagalBeruntun.length}</h3>
            <p className="text-xs text-slate-400 mt-1">≥ {data.batasGagalBeruntun} kali gagal berturut-turut</p>
          </div>
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shadow-sm">
            <ShieldAlert size={28} />
          </div>
        </div>
        <div className={`bg-white rounded-2xl p-6 shadow-sm border flex items-center justify-between ${data.adminPerangkatBaru.length > 0 ? "border-amber-200" : "border-slate-200"}`}>
          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">Login Admin Baru</p>
            <h3 className="text-3xl font-black text-slate-800">{data.adminPerangkatBaru.length}</h3>
            <p className="text-xs text-slate-400 mt-1">Dari perangkat baru, 30 hari</p>
          </div>
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm">
            <MonitorSmartphone size={28} />
          </div>
        </div>
      </div>

      {/* Accounts with repeated failures */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Akun dengan Login Gagal Berturut-turut</h3>
          <p className="text-xs text-slate-500">Dihitung sejak login berhasil terakhir. Bisa berarti pengguna lupa password, atau ada yang mencoba menebak password.</p>
        </div>
        {data.gagalBeruntun.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-slate-600 font-semibold">Username</th>
                  <th className="px-6 py-3 text-slate-600 font-semibold">Pemilik Akun</th>
                  <th className="px-6 py-3 text-slate-600 font-semibold text-center">Gagal</th>
                  <th className="px-6 py-3 text-slate-600 font-semibold text-center">Jumlah IP</th>
                  <th className="px-6 py-3 text-slate-600 font-semibold text-right">Terakhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.gagalBeruntun.map(g => (
                  <tr key={g.identifier}>
                    <td className="px-6 py-3 font-mono text-slate-700">{g.identifier}</td>
                    <td className="px-6 py-3">
                      {g.akunDitemukan
                        ? <span className="text-slate-800 font-medium">{g.nama} <span className="text-xs text-slate-400 uppercase">· {g.role}</span></span>
                        : <span className="text-rose-600 text-xs font-semibold">Username tidak terdaftar</span>}
                    </td>
                    <td className="px-6 py-3 text-center font-bold text-rose-600">{g.jumlah}</td>
                    <td className="px-6 py-3 text-center text-slate-600">{g.jumlahIp}</td>
                    <td className="px-6 py-3 text-right text-slate-500">{waktuRelatif(g.terakhir)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyOk text="Tidak ada akun dengan login gagal berturut-turut." />
        )}
      </section>

      {/* Admin logins from a new IP / device */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Login Admin dari Perangkat Baru</h3>
          <p className="text-xs text-slate-500">30 hari terakhir, berdasarkan kombinasi browser dan sistem operasi. Pastikan setiap login di sini memang dilakukan oleh admin yang bersangkutan.</p>
        </div>
        {data.adminPerangkatBaru.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {data.adminPerangkatBaru.map((a, i) => (
              <li key={i} className="px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{a.nama}</p>
                  <p className="text-xs text-slate-500">{a.perangkat} · {a.ip || "IP tidak tercatat"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {a.alasan.map(al => (
                    <span key={al} className="text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 rounded-md px-2 py-0.5">{al}</span>
                  ))}
                  <span className="text-xs text-slate-500 ml-2">{formatWaktu(a.waktu)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyOk text="Tidak ada login admin dari perangkat baru." />
        )}
      </section>

      {/* Recent failed attempts */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col max-h-[500px]">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Riwayat Login Gagal</h3>
          <p className="text-xs text-slate-500">50 percobaan terakhir</p>
        </div>
        {data.loginGagalTerbaru.length > 0 ? (
          <div className="overflow-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-slate-600 font-semibold">Waktu</th>
                  <th className="px-6 py-3 text-slate-600 font-semibold">Username</th>
                  <th className="px-6 py-3 text-slate-600 font-semibold">Keterangan</th>
                  <th className="px-6 py-3 text-slate-600 font-semibold">Perangkat</th>
                  <th className="px-6 py-3 text-slate-600 font-semibold">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.loginGagalTerbaru.map((g, i) => (
                  <tr key={i}>
                    <td className="px-6 py-3 text-slate-600">{formatWaktu(g.waktu)}</td>
                    <td className="px-6 py-3">
                      <span className="font-mono text-slate-700">{g.identifier}</span>
                      {g.nama && <span className="block text-xs text-slate-400">{g.nama}</span>}
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-xs">{g.alasan || "-"}</td>
                    <td className="px-6 py-3 text-slate-500 text-xs">{g.perangkat}</td>
                    <td className="px-6 py-3 text-slate-500 text-xs font-mono">{g.ip || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyOk text="Belum ada login gagal yang tercatat." />
        )}
      </section>
    </div>
  );
}

function EmptyOk({ text }: { text: string }) {
  return (
    <div className="px-6 py-10 flex flex-col items-center text-center text-sm text-slate-500">
      <ShieldCheck className="w-8 h-8 text-emerald-400 mb-2" />
      {text}
    </div>
  );
}
