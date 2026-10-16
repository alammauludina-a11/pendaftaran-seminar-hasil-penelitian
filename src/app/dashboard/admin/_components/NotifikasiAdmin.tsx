"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, FileCheck, MapPin, Ban, CheckSquare, ChevronRight, CheckCircle2 } from "lucide-react";
import { useAdmin } from "../AdminContext";
import { buatNotifikasiAdmin, type JenisNotifikasiAdmin, type NotifikasiAdmin as Notif } from "@/lib/notifikasi-admin";

const TAMPILAN: Record<JenisNotifikasiAdmin, { icon: typeof Bell; warna: string; teks: (n: number) => string; tujuan: string; catatan?: string }> = {
  verifikasi: { icon: FileCheck, warna: "bg-amber-100 text-amber-600", teks: n => `${n} pendaftaran menunggu verifikasi`, tujuan: "Verifikasi Pendaftaran" },
  ruangan: { icon: MapPin, warna: "bg-sky-100 text-sky-600", teks: n => `${n} pengajuan ruangan perlu disetujui`, tujuan: "Verifikasi Pendaftaran" },
  batal_moderator: { icon: Ban, warna: "bg-orange-100 text-orange-600", teks: n => `${n} pengajuan batal moderator`, tujuan: "Finalisasi Pendaftaran" },
  batal_moderator_dirilis: {
    icon: Ban, warna: "bg-orange-100 text-orange-600", teks: n => `${n} pengajuan batal moderator (jadwal sudah dirilis)`,
    tujuan: "Pengumuman Jadwal", catatan: "tombol Setujui/Tolak hanya ada di Finalisasi untuk jadwal yang belum final",
  },
  finalisasi: { icon: CheckSquare, warna: "bg-emerald-100 text-emerald-600", teks: n => `${n} jadwal siap difinalisasi`, tujuan: "Finalisasi Pendaftaran" },
};

/** Bell in the admin navigation listing what waits for the admin; a click opens the page where it is handled. */
export default function NotifikasiAdmin({ onBuka }: { onBuka?: () => void }) {
  const {
    periodes, setPeriodes, pendaftaran, currentView, activePeriode, setActivePeriodeId, setActiveTab, setCurrentView, setSelectedSeminarType,
    setGlobalSearch, setGlobalKelasFilter, setSelectedDateFilter, setSelectedKonsentrasiFilter,
  } = useAdmin();
  const [buka, setBuka] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!buka) return;
    const tutupLuar = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setBuka(false); };
    const tutupEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setBuka(false); };
    document.addEventListener("mousedown", tutupLuar);
    document.addEventListener("keydown", tutupEsc);
    return () => { document.removeEventListener("mousedown", tutupLuar); document.removeEventListener("keydown", tutupEsc); };
  }, [buka]);

  const periodeTampil = periodes.filter(p => !p.isDraft);
  const notifikasi = buatNotifikasiAdmin(periodeTampil.map(p => p.id), pendaftaran);
  const total = notifikasi.reduce((s, n) => s + n.jumlah, 0);
  const perPeriode = periodeTampil
    .map(p => ({ periode: p, items: notifikasi.filter(n => n.periodeId === p.id) }))
    .filter(g => g.items.length > 0);

  const bukaTujuan = (n: Notif) => {
    const p = periodes.find(x => x.id === n.periodeId);
    if (!p) return;
    // Pengaturan Periode keeps its changes locally until "Simpan & Kembali": leaving drops them
    if (currentView === "pengaturan") {
      if (!confirm("Perubahan pengaturan periode yang belum disimpan akan hilang. Lanjutkan?")) return;
      // Same as its back button: an unsaved new periode is not kept
      if (activePeriode?.isDraft) setPeriodes(prev => prev.filter(x => x.id !== activePeriode.id));
    }
    // Clear the filters so the items the notification counts are all visible
    setGlobalSearch("");
    setGlobalKelasFilter("Semua Kelas");
    setSelectedDateFilter("Semua Tanggal");
    setSelectedKonsentrasiFilter("Semua Konsentrasi");
    setSelectedSeminarType(p.jenisSeminar);
    setActivePeriodeId(p.id);
    setActiveTab(n.tab);
    setCurrentView("manajemen");
    setBuka(false);
    onBuka?.();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setBuka(b => !b)}
        className={`relative p-2 rounded-lg transition-colors ${buka ? "bg-white/20" : "bg-white/10 hover:bg-white/20"}`}
        title="Notifikasi"
        aria-label={total > 0 ? `Notifikasi, ${total} perlu ditindaklanjuti` : "Notifikasi"}
        aria-expanded={buka}
      >
        <Bell size={20} className="text-white/90" />
        {total > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#06125C]">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {buka && (
        <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-20 sm:top-full sm:mt-2 sm:w-96 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-[#06125C]">Perlu Ditindaklanjuti</span>
            {total > 0 && <span className="text-xs font-semibold text-slate-500">{total} item</span>}
          </div>
          {perPeriode.length === 0 ? (
            <div className="px-4 py-8 flex flex-col items-center text-center gap-2 text-slate-500">
              <CheckCircle2 size={32} className="text-emerald-400" />
              <p className="text-sm font-medium">Tidak ada yang perlu ditindaklanjuti.</p>
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto divide-y divide-slate-100">
              {perPeriode.map(({ periode, items }) => (
                <div key={periode.id} className="py-2">
                  <p className="px-4 pt-1 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    {periode.jenisSeminar === "kolokium" ? "Seminar Kolokium" : "Seminar Hasil"} · Angkatan {periode.angkatan}
                  </p>
                  {items.map(n => {
                    const t = TAMPILAN[n.jenis];
                    const Icon = t.icon;
                    return (
                      <button
                        key={n.jenis}
                        onClick={() => bukaTujuan(n)}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors group"
                      >
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.warna}`}>
                          <Icon size={18} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold text-slate-800">{t.teks(n.jumlah)}</span>
                          <span className="block text-xs text-slate-500">Buka {t.tujuan}{t.catatan ? ` · ${t.catatan}` : ""}</span>
                        </span>
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-[#06125C] shrink-0" />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
