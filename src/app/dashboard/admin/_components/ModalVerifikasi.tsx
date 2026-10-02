"use client";

import { FileCheck, Eye, X } from "lucide-react";
import { useAdmin } from "../AdminContext";

export default function ModalVerifikasi() {
  const {
    selectedPendaftar, setIsVerifikasiModalOpen, catatanVerifikasi, setCatatanVerifikasi, activePeriode,
    handleActionVerifikasi,
  } = useAdmin();
  if (!selectedPendaftar) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsVerifikasiModalOpen(false)}></div>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col relative z-10 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[#06125C]">
              <FileCheck size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#06125C]">Verifikasi Berkas Mahasiswa</h3>
              <p className="text-sm text-slate-500">Tinjau kelengkapan berkas pendaftaran seminar.</p>
            </div>
          </div>
          <button onClick={() => setIsVerifikasiModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-700 mb-3 border-b pb-2">Informasi Pengajuan</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Nama Lengkap</p>
                <p className="font-semibold text-slate-800">{selectedPendaftar.name}</p>
              </div>
              <div>
                <p className="text-slate-500">NIM</p>
                <p className="font-semibold text-slate-800">{selectedPendaftar.nim}</p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-500">Judul Penelitian</p>
                <p className="font-medium text-slate-800">{selectedPendaftar.title}</p>
              </div>
              <div>
                <p className="text-slate-500">Konsentrasi</p>
                <p className="font-medium text-slate-800">{selectedPendaftar.konsentrasi || "-"}</p>
              </div>
              <div>
                <p className="text-slate-500">Tanggal Kolokium</p>
                <p className="font-medium text-slate-800">
                  {(() => {
                    const val = selectedPendaftar.tanggalKolokium;
                    if (!val || val === "-" || val === "Invalid Date") return "-";
                    const d = new Date(val);
                    return isNaN(d.getTime()) ? val : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                  })()}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-500">Dosen Pembimbing 1</p>
                <p className="font-medium text-slate-800">{selectedPendaftar.dospem}</p>
              </div>
              {selectedPendaftar.dospem2 && (
                <div className="col-span-2">
                  <p className="text-slate-500">Dosen Pembimbing 2</p>
                  <p className="font-medium text-slate-800">{selectedPendaftar.dospem2}</p>
                </div>
              )}
              <div>
                <p className="text-slate-500">Jadwal Dipilih</p>
                <p className="font-medium text-slate-800">{selectedPendaftar.date} • {selectedPendaftar.time}</p>
              </div>
              <div>
                <p className="text-slate-500">Ruangan</p>
                <p className="font-medium text-slate-800">{selectedPendaftar.room}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-3">Dokumen Terlampir</h4>
            <div className="space-y-3">
              {/* Dokumen 1: Bukti Forum Kolokium (Hanya untuk Hasil Penelitian) */}
              {(selectedPendaftar?.jenisSeminar === 'hasil_penelitian' || (!selectedPendaftar?.jenisSeminar && activePeriode?.jenisSeminar === 'hasil_penelitian')) && (
                <div className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedPendaftar.fileBuktiKolokium ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                      <FileCheck size={16} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${selectedPendaftar.fileBuktiKolokium ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                        Bukti_Forum_Kolokium.pdf
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedPendaftar.fileBuktiKolokium ? 'Tersedia' : 'Tidak dilampirkan'}
                      </p>
                    </div>
                  </div>
                  {selectedPendaftar.fileBuktiKolokium ? (
                    <a 
                      href={selectedPendaftar.fileBuktiKolokium} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#06125C] bg-blue-50 hover:bg-blue-100 p-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Eye size={16} /> Lihat
                    </a>
                  ) : (
                    <button disabled className="text-slate-400 bg-slate-100 p-2 rounded-lg text-sm font-medium flex items-center gap-2 cursor-not-allowed">
                      <Eye size={16} /> Lihat
                    </button>
                  )}
                </div>
              )}

              {/* Dokumen 2: Persetujuan Dospem */}
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${selectedPendaftar.fileApprovalDospem ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                    <FileCheck size={16} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${selectedPendaftar.fileApprovalDospem ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                      Persetujuan_Dospem.pdf
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedPendaftar.fileApprovalDospem ? 'Tersedia' : 'Tidak dilampirkan'}
                    </p>
                  </div>
                </div>
                {selectedPendaftar.fileApprovalDospem ? (
                  <a 
                    href={selectedPendaftar.fileApprovalDospem} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#06125C] bg-blue-50 hover:bg-blue-100 p-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Eye size={16} /> Lihat
                  </a>
                ) : (
                  <button disabled className="text-slate-400 bg-slate-100 p-2 rounded-lg text-sm font-medium flex items-center gap-2 cursor-not-allowed">
                    <Eye size={16} /> Lihat
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2">Catatan Verifikasi (Opsional)</h4>
            <textarea
              rows={3}
              value={catatanVerifikasi}
              onChange={(e) => setCatatanVerifikasi(e.target.value)}
              placeholder="Masukkan catatan jika ada perbaikan..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 focus:border-[#06125C] transition-all outline-none text-sm text-slate-700 resize-none"
            />
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={() => handleActionVerifikasi('ditolak')}
            disabled={selectedPendaftar.status === 'ditolak'}
            className="px-6 py-2.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-xl font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            Tolak Pendaftaran
          </button>
          <button
            onClick={() => handleActionVerifikasi('disetujui')}
            disabled={selectedPendaftar.status === 'disetujui'}
            className="px-6 py-2.5 bg-[#06125C] hover:bg-[#06125C]/90 text-white rounded-xl font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Setujui Pendaftaran
          </button>
        </div>
      </div>
    </div>
  );
}
