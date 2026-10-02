"use client";

import { X } from "lucide-react";
import { useAdmin } from "../AdminContext";

export default function ModalTambahData() {
  const {
    setMasterMahasiswa, setMasterDosen, setMasterAdmin, activeMasterTab, setShowAddDataModal, isEditMode,
    setIsEditMode, editId, setEditId, addForm, setAddForm,
  } = useAdmin();

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-800">
              {isEditMode ? "Edit Data" : "Tambah Data"} {activeMasterTab === "mahasiswa" ? "Mahasiswa" : activeMasterTab === "dosen" ? "Dosen" : "Admin"}
            </h3>
            <p className="text-sm text-slate-500 mt-1">Masukkan informasi {activeMasterTab} dengan benar.</p>
          </div>
          <button
            onClick={() => setShowAddDataModal(false)}
            className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={async (e) => {
          e.preventDefault();
          try {
            const endpoint = `/api/admin/master/${activeMasterTab}${isEditMode ? `/${editId}` : ""}`;
            const method = isEditMode ? "PUT" : "POST";

            let body: any = {};
            if (activeMasterTab === "mahasiswa") {
              body = {
                nim: addForm.nim_nip,
                name: addForm.name,
                angkatan: addForm.angkatan,
                prodi: addForm.prodi,
                status: addForm.status_jabatan,
              };
            } else if (activeMasterTab === "dosen") {
              body = {
                nip: addForm.nim_nip,
                name: addForm.name,
                prodi: addForm.prodi,
                jabatan: addForm.status_jabatan,
                statusDosen: addForm.statusDosen,
              };
            } else {
              body = { name: addForm.name };
            }

            const res = await fetch(endpoint, {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });

            const data = await res.json();
            if (res.ok) {
              if (activeMasterTab === "mahasiswa") {
                if (isEditMode) {
                  setMasterMahasiswa(prev => prev.map(m => m.id === editId ? data.mahasiswa : m));
                } else {
                  setMasterMahasiswa(prev => [...prev, data.mahasiswa]);
                }
              } else if (activeMasterTab === "dosen") {
                if (isEditMode) {
                  setMasterDosen(prev => prev.map(d => d.id === editId ? data.dosen : d));
                } else {
                  setMasterDosen(prev => [...prev, data.dosen]);
                }
              } else {
                if (isEditMode) {
                  setMasterAdmin(prev => prev.map(a => a.id === editId ? data.admin : a));
                } else {
                  setMasterAdmin(prev => [...prev, data.admin]);
                }
              }
              setShowAddDataModal(false);
              setIsEditMode(false);
              setEditId(null);
              setAddForm({ nim_nip: "", name: "", angkatan: "60", prodi: "Akuntansi", status_jabatan: "Aktif", statusDosen: "Dosen Tetap" });
            } else {
              alert(data.error || "Gagal menyimpan.");
            }
          } catch (e) {
            console.error(e);
            alert("Terjadi kesalahan sistem.");
          }
        }} className="p-6 space-y-4">

          {activeMasterTab !== "admin" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {activeMasterTab === "mahasiswa" ? "NIM" : "NIP / NPI"}
              </label>
              <input
                required
                type="text"
                value={addForm.nim_nip}
                onChange={(e) => setAddForm({ ...addForm, nim_nip: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 outline-none text-sm transition-all"
                placeholder={activeMasterTab === "mahasiswa" ? "Masukkan NIM..." : "Masukkan NIP..."}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
            <input
              required
              type="text"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 outline-none text-sm transition-all"
              placeholder="Masukkan Nama Lengkap..."
            />
          </div>

          {activeMasterTab !== "admin" && (
            <>
              {activeMasterTab === "mahasiswa" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Angkatan</label>
                  <select
                    value={addForm.angkatan}
                    onChange={(e) => setAddForm({ ...addForm, angkatan: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 outline-none text-sm transition-all"
                  >
                    {Array.from({ length: 10 }, (_, i) => 60 + i).map(year => (
                      <option key={year} value={year.toString()}>{year}</option>
                    ))}
                  </select>
                </div>
              )}

              {activeMasterTab === "mahasiswa" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Program Studi</label>
                  <input
                    type="text"
                    value="Akuntansi"
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-medium outline-none text-sm transition-all cursor-not-allowed"
                  />
                </div>
              )}
            {activeMasterTab === "dosen" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status Dosen</label>
                  <select
                    value={addForm.statusDosen}
                    onChange={(e) => setAddForm({ ...addForm, statusDosen: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#06125C]/20 outline-none text-sm transition-all"
                  >
                    <option value="Dosen Tetap">Dosen Tetap</option>
                    <option value="Dosen Praktisi/Luar">Dosen Praktisi/Luar</option>
                  </select>
                </div>
              )}
            </>
          )}

          <div className="pt-4 mt-2 border-t border-slate-100 flex gap-3">
            <button
              type="button"
              onClick={() => setShowAddDataModal(false)}
              className="flex-1 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-[#06125C] hover:bg-[#06125C]/90 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
            >
              Simpan Data
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
