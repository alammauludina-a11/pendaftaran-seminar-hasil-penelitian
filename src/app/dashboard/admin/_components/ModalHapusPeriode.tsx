"use client";

import { XCircle, Trash2 } from "lucide-react";
import { useAdmin } from "../AdminContext";

export default function ModalHapusPeriode() {
  const {
    setPeriodes, setCurrentView, activePeriodeId, setActivePeriodeId, setShowDeleteModal, activePeriode,
    uniqueKelas,
  } = useAdmin();
  if (!activePeriode) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
            <Trash2 size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Hapus Periode</h2>

          {(() => {
            const isAnyClassFormed = uniqueKelas.length > 0;

            return (activePeriode.isOpen || isAnyClassFormed) ? (
              <div>
                <p className="text-slate-600 mb-4 text-sm">
                  Periode ini <strong>tidak dapat dihapus</strong> karena kondisi berikut:
                </p>
                <ul className="text-sm text-slate-600 space-y-2 mb-6">
                  {activePeriode.isOpen && (
                    <li className="flex items-center gap-2 text-red-600">
                      <XCircle size={16} /> Status pendaftaran masih dibuka.
                    </li>
                  )}
                  {isAnyClassFormed && (
                    <li className="flex items-center gap-2 text-red-600">
                      <XCircle size={16} /> Terdapat kelas yang sudah terbentuk pada periode ini (harus dibatalkan terlebih dahulu).
                    </li>
                  )}
                </ul>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors"
                >
                  Tutup
                </button>
              </div>
            ) : (
              <div>
                <p className="text-slate-600 mb-6 text-sm">
                  Apakah Anda yakin ingin menghapus periode <strong>{activePeriode.angkatan}</strong>? Tindakan ini tidak dapat dibatalkan.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/admin/periode/${activePeriodeId}`, {
                          method: "DELETE",
                        });
                        if (res.ok) {
                          setPeriodes(prev => prev.filter(p => p.id !== activePeriodeId));
                          setCurrentView("landing");
                          setActivePeriodeId(null);
                          setShowDeleteModal(false);
                        } else {
                          const data = await res.json();
                          alert(data.error || "Gagal menghapus periode.");
                        }
                      } catch (e) {
                        console.error(e);
                        alert("Terjadi kesalahan sistem.");
                      }
                    }}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
                  >
                    Ya, Hapus
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
