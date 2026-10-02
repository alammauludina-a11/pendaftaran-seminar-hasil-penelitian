"use client";

import { MapPin, CheckCircle2, XCircle, Clock, CheckSquare, Users, Calendar, UserCheck, Ban } from "lucide-react";
import { useAdmin } from "../AdminContext";

export default function TabFinalisasi() {
  const {
    masterDosen, setPendaftaran, trackWrite, filteredPendaftaran, handleFinalisasi, handleBatalModerator,
    activePeriode,
  } = useAdmin();
  if (!activePeriode) return null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#06125C] flex items-center gap-2">
              <CheckSquare className="text-amber-500" /> Finalisasi Pendaftaran
            </h2>
            <p className="text-sm text-slate-500 mt-1">Selesaikan pendaftaran mahasiswa yang telah disetujui dan telah mengisi ruangan.</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-4 py-3 text-center w-px whitespace-nowrap">No</th>
                <th className="px-4 py-3 w-[16%]">Mahasiswa</th>
                <th className="px-4 py-3 w-[8%] whitespace-nowrap">Kelas</th>
                <th className="px-4 py-3 w-[22%] whitespace-nowrap">Jadwal & Ruangan</th>
                <th className="px-4 py-3 w-[13%] whitespace-nowrap">Dosen Pembimbing</th>
                <th className="px-4 py-3 w-[13%] whitespace-nowrap">Dosen Moderator</th>
                <th className="px-4 py-3 w-[13%]">Pembahas</th>
                <th className="px-4 py-3 text-center w-[9%]">Status</th>
                <th className="px-4 py-3 text-center w-[6%]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPendaftaran.filter(p => p.status === 'disetujui' && !p.isFinalized).map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 text-center text-slate-500 font-medium">{idx + 1}</td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-800">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.nim}</div>
                  </td>
                  <td className="px-4 py-4 text-slate-700 font-medium whitespace-nowrap">
                    {item.kelas ? `Kelas ${item.kelas.replace('Kelas ', '')}` : '-'}
                  </td>
                  <td className="px-4 py-4 text-slate-600 whitespace-nowrap">
                    <div className="flex items-center gap-1.5"><Calendar size={14} /> {item.date} • {item.time}</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                      <MapPin size={12} /> {item.room || <span className="italic text-slate-400">Belum diisi</span>}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-700 font-medium text-sm">
                    <div className="flex flex-col gap-1">
                      <span>1. {item.dospem}</span>
                      {item.dospem2 && <span>2. {item.dospem2}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-700 font-medium text-sm">
                    <select
                      value={item.moderatorId || ""}
                      onChange={async (e) => {
                        const newValue = e.target.value;
                        const dosenId = newValue || null;
                        // d.id may be a number, stringify both sides to be safe
                        const selectedDosen = masterDosen.find(d => String(d.id) === String(dosenId));

                        // Optimistic update
                        setPendaftaran(prev => prev.map(p => p.id === item.id ? { ...p, moderatorId: dosenId, moderator: selectedDosen ? selectedDosen.name : null, moderatorAssignedByRole: 'admin' } : p));

                        // DB Update
                        try {
                          // trackWrite pauses polling until saved so the optimistic update isn't overwritten
                          const res = await trackWrite(fetch(`/api/admin/pendaftaran/${item.id}/moderator`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ dosenId })
                          }));
                          if (!res.ok) {
                            const errData = await res.json();
                            // Rollback on error
                            setPendaftaran(prev => prev.map(p => p.id === item.id ? { ...p, moderatorId: item.moderatorId, moderator: item.moderator, moderatorAssignedByRole: item.moderatorAssignedByRole } : p));
                            alert(errData.error || "Gagal menyimpan moderator.");
                          }
                        } catch (err) {
                          console.error("Gagal menyimpan moderator:", err);
                          // Rollback on network error
                          setPendaftaran(prev => prev.map(p => p.id === item.id ? { ...p, moderatorId: item.moderatorId, moderator: item.moderator, moderatorAssignedByRole: item.moderatorAssignedByRole } : p));
                        }
                      }}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#06125C]/20 w-full font-medium text-[#06125C]"
                    >
                      <option value="">-- Pilih Moderator --</option>
                      {masterDosen.map(d => {
                        const isSupervisor = d.id === item.dospem1Id || d.id === item.dospem2Id;
                        return (
                          <option key={d.id} value={d.id} disabled={isSupervisor}>
                            {d.name}{isSupervisor ? " (Pembimbing — tidak bisa dipilih)" : ""}
                          </option>
                        );
                      })}
                    </select>
                    {item.moderatorId && (
                      <div className="text-[10px] text-indigo-500 mt-1 flex items-center gap-1 font-semibold">
                        <UserCheck size={10} /> Terpilih {item.moderatorAssignedByRole === 'dosen' ? '(Dipilih oleh Dosen)' : '(Dipilih oleh Admin)'}
                      </div>
                    )}
                    {/* Batal Moderator Request */}
                    {(item as any).moderatorBatalStatus === "menunggu" && (
                      <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-xl flex flex-col gap-2">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-orange-700">
                          <Ban size={10} /> Dosen Ajukan Batal Moderasi
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleBatalModerator(item.id, "setujui")}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg transition-colors"
                          >
                            ✓ Setujui
                          </button>
                          <button
                            onClick={() => handleBatalModerator(item.id, "tolak")}
                            className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-lg transition-colors"
                          >
                            ✗ Tolak
                          </button>
                        </div>
                      </div>
                    )}
                    {(item as any).moderatorBatalStatus === "ditolak" && (
                      <div className="mt-1 text-[10px] text-red-500 font-semibold flex items-center gap-1">
                        <XCircle size={10} /> Batal ditolak (dosen tetap moderator)
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-slate-700 font-medium text-sm">
                    {item.pembahas ? (
                      <div className="flex flex-col gap-1.5">
                        {item.pembahas.split(',').map((pStr: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <Users size={14} className="text-[#06125C]" />
                            {pStr}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="italic text-slate-400 flex items-center gap-1.5">
                        <Clock size={14} /> Belum diatur
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-col gap-1.5 items-center">
                      {item.room ? (
                        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 w-fit">
                          <CheckCircle2 size={10} /> Ruangan Terisi
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 w-fit">
                          <Clock size={10} /> Menunggu Ruangan
                        </span>
                      )}
                      {item.moderator ? (
                        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 w-fit" title={item.moderator}>
                          <CheckCircle2 size={10} /> Mod: Terpilih
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 w-fit">
                          <Clock size={10} /> Menunggu Dosen
                        </span>
                      )}
                      {item.pembahas ? (
                        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 w-fit" title={item.pembahas}>
                          <CheckCircle2 size={10} /> {item.pembahas.split(',').length} Pem: Terpilih
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 w-fit">
                          <Clock size={10} /> Menunggu Pem
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-col gap-2 items-center">
                      <button
                        onClick={() => handleFinalisasi(item.id)}
                        disabled={!item.room || !item.moderator || !item.pembahas}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          item.room && item.moderator && item.pembahas ? 'bg-[#06125C] hover:bg-[#06125C]/90 text-white' : 'bg-slate-100 text-slate-400'
                        }`}
                        title={(!item.room || !item.moderator || !item.pembahas) ? "Ruangan, Moderator, dan Pembahas harus terisi" : ""}
                      >
                        Finalisasi
                      </button>
                      {item.room && item.moderator && !item.pembahas && (
                        <button
                          onClick={() => {
                            if (confirm("Apakah Anda yakin ingin melakukan Paksa Finalisasi meskipun belum ada pembahas?")) {
                              handleFinalisasi(item.id);
                            }
                          }}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors border border-amber-200"
                          title="Paksa finalisasi tanpa pembahas"
                        >
                          Paksa Finalisasi
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPendaftaran.filter(p => p.status === 'disetujui' && !p.isFinalized).length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    Tidak ada pendaftaran yang perlu difinalisasi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
