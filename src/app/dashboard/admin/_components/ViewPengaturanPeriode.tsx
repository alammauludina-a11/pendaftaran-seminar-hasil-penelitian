"use client";

import { CheckSquare, Users, Calendar, AlertCircle, ArrowLeft, Trash2 } from "lucide-react";
import { useAdmin } from "../AdminContext";

export default function ViewPengaturanPeriode() {
  const {
    periodes, setPeriodes, kelasData, masterMahasiswa, setCurrentView, activePeriodeId, setActivePeriodeId,
    setShowDeleteModal, handleBatalBentukKelas, activePeriode, updateActivePeriode, activePendaftaran,
  } = useAdmin();
  if (!activePeriode) return null;

  return (
    <div className="animate-in fade-in duration-500 flex flex-col gap-6">
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => {
            if (activePeriode.isDraft) {
              setPeriodes(prev => prev.filter(p => p.id !== activePeriodeId));
            }
            setCurrentView("landing");
            setActivePeriodeId(null);
          }}
          className="w-10 h-10 bg-white border border-slate-200 text-slate-600 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-[#06125C]">
            Pengaturan Periode {activePeriode.jenisSeminar === 'kolokium' ? 'Seminar Kolokium' : 'Seminar Hasil Penelitian'}
          </h1>
          <p className="text-sm text-slate-500">Konfigurasi tanggal dan aturan kelas untuk angkatan {activePeriode.angkatan}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Periode */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-[#06125C]">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#06125C]">Periode Pendaftaran</h2>
              <p className="text-sm text-slate-500">Atur masa buka dan tutup pendaftaran.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Angkatan</label>
                <select
                  value={activePeriode.angkatan}
                  onChange={(e) => updateActivePeriode({ angkatan: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 outline-none text-sm font-bold text-[#06125C]"
                >
                  <option value="" disabled>Pilih Angkatan</option>
                  {Array.from(new Set(masterMahasiswa.map(m => m.angkatan).filter(Boolean))).filter(angkatan => {
                    const fullAngkatan = `AKN ${angkatan}`;
                    // Allow the current periode's own angkatan (editing)
                    if (fullAngkatan === activePeriode.angkatan) return true;
                    // Exclude angkatan that already have a periode for the same seminar type
                    const alreadyUsed = periodes.some(
                      p => p.angkatan === fullAngkatan && p.jenisSeminar === activePeriode.jenisSeminar && p.id !== activePeriode.id && !p.isDraft
                    );
                    return !alreadyUsed;
                  }).map(angkatan => (
                    <option key={angkatan} value={`AKN ${angkatan}`}>AKN {angkatan}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mulai Periode Seminar</label>
                <input
                  type="date"
                  value={activePeriode.startDate}
                  onChange={(e) => updateActivePeriode({ startDate: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Akhir Periode Seminar</label>
                <input
                  type="date"
                  value={activePeriode.endDate}
                  onChange={(e) => updateActivePeriode({ endDate: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Batas Pendaftaran</label>
                <input
                  type="date"
                  value={activePeriode.registrationEndDate}
                  onChange={(e) => updateActivePeriode({ registrationEndDate: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 outline-none text-sm"
                />
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="shrink-0 mt-0.5" size={14} />
              <p>Mahasiswa hanya dapat mendaftar hingga <strong>Batas Pendaftaran</strong>. Sisa waktu dalam periode digunakan untuk finalisasi dan pengumuman.</p>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-sm font-bold text-slate-800">Status Pendaftaran</p>
                <p className="text-xs text-slate-500">Buka atau tutup manual tanpa mengubah tanggal.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={activePeriode.isOpen}
                  onChange={(e) => updateActivePeriode({ isOpen: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
            <button
              className="w-full py-2.5 bg-[#06125C] hover:bg-[#06125C]/90 text-white rounded-xl text-sm font-bold shadow-sm transition-colors mt-2"
              onClick={async () => {
                try {
                  const payload = {
                    angkatan: activePeriode.angkatan,
                    startDate: activePeriode.startDate,
                    endDate: activePeriode.endDate,
                    registrationEndDate: activePeriode.registrationEndDate,
                    isOpen: activePeriode.isOpen,
                    batasKelas: activePeriode.batasKelas,
                    isDraft: false,
                  };
                  const res = await fetch(`/api/admin/periode/${activePeriode.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });
                  const data = await res.json();
                  if (res.ok && data.periode) {
                    setPeriodes(prev => prev.map(p => p.id === activePeriode.id ? { ...p, ...data.periode } : p));
                  } else {
                    alert(data.error || "Gagal menyimpan.");
                    return;
                  }
                } catch (e) {
                  console.error(e);
                  alert("Terjadi kesalahan sistem.");
                  return;
                }
                setCurrentView("landing");
                setActivePeriodeId(null);
              }}
            >
              Simpan & Kembali
            </button>
            <button
              className="w-full py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-sm font-bold shadow-sm transition-colors mt-2 flex items-center justify-center gap-2"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 size={16} /> Hapus Periode
            </button>
          </div>
        </div>

        {/* Card 2: Aturan Kelas */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#06125C]">Aturan Pembentukan Kelas</h2>
              <p className="text-sm text-slate-500">Atur batasan pendaftar untuk otomatisasi kelas.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Batas Maksimal Mahasiswa per Kelas</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  value={activePeriode.batasKelas}
                  onChange={(e) => updateActivePeriode({ batasKelas: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 outline-none text-sm font-bold text-slate-800"
                />
                <span className="text-sm text-slate-500 font-medium whitespace-nowrap">Orang</span>
              </div>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-100 text-blue-800 rounded-xl flex items-start gap-3 text-sm">
              <AlertCircle className="shrink-0 mt-0.5 text-blue-600" size={16} />
              <p>Sistem <strong>tidak akan</strong> membentuk kelas jika kuota belum terpenuhi. Namun, Admin dapat memaksa pembentukan kelas (override) pada tabel di bawah.</p>
            </div>
          </div>
        </div>

        {/* Card 3: Simulasi Kelas Saat Ini */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckSquare size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#06125C]">Daftar Kelas Terbentuk</h2>
              <p className="text-sm text-slate-500">Daftar kelas seminar yang telah terbentuk di periode ini.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="px-4 py-3">Nama Kelas</th>
                  <th className="px-4 py-3 text-center">Pendaftar Ter-assign</th>
                  <th className="px-4 py-3 text-center">Status Kelas</th>
                  <th className="px-4 py-3 text-center">Kapasitas Kelas</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {kelasData.filter(k => k.periodeId === activePeriodeId).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Belum ada kelas yang terbentuk di periode ini.
                    </td>
                  </tr>
                ) : (
                  kelasData.filter(k => k.periodeId === activePeriodeId).map((k) => {
                    const targetCapacity = activePeriode.batasKelas;
                    const count = activePendaftaran.filter(p => p.kelasSeminarId === k.id).length;
                    const isFormed = true; // In DB, it is formed

                    return (
                      <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-4 font-bold text-[#06125C]">Kelas {k.namaKelas}</td>
                        <td className="px-4 py-4 text-center font-medium text-slate-700">{count} Orang</td>
                        <td className="px-4 py-4 text-center">
                          <span className="bg-emerald-100 text-emerald-700 font-bold px-3 py-1 rounded-lg">
                            Terbentuk
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex flex-col items-center">
                            <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden mb-1">
                              <div
                                className={`h-full ${count >= targetCapacity ? 'bg-amber-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min((count / targetCapacity) * 100, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-[10px] font-medium text-slate-500">
                              {count} / {targetCapacity} Terisi
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => handleBatalBentukKelas(k.id)}
                            className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-3 py-1.5 rounded-lg border border-red-200 transition-colors whitespace-nowrap"
                          >
                            Batal Bentuk
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
