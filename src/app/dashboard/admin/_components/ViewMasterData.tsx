"use client";

import { CheckCircle2, Search, Filter, Users, ArrowLeft, Plus } from "lucide-react";
import { useAdmin } from "../AdminContext";

export default function ViewMasterData() {
  const {
    fileInputRef, handleImportExcel, handleDownloadTemplate, fileInputDosenRef, handleImportExcelDosen,
    handleDownloadTemplateDosen, masterMahasiswa, masterDosen, masterAdmin, setCurrentView, activeMasterTab,
    setActiveMasterTab, selectedMasterIds, setSelectedMasterIds, masterSearch, setMasterSearch,
    masterAngkatanFilter, setMasterAngkatanFilter, setShowAddDataModal, handleGenerateAkunMahasiswa,
    handleGenerateAkunDosen, handleGenerateAkunAdmin, handleGenerateSemuaAkun, handleEditMasterData,
    handleDeleteMasterData, handleBulkDeleteMasterData, uniqueAngkatan, currentMasterData,
    renderMasterSortableHeader, handleSelectAllMaster, toggleSelectMaster,
  } = useAdmin();

  return (
    <div className="animate-in fade-in duration-500 flex flex-col gap-6">
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => { setCurrentView("visual_awal"); }}
          className="w-10 h-10 bg-white border border-slate-200 text-slate-600 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-[#06125C]">Data Master Pengguna</h1>
          <p className="text-sm text-slate-500">Basis data utama Mahasiswa dan Dosen untuk autentikasi dan pendaftaran.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => { setActiveMasterTab("mahasiswa"); setSelectedMasterIds([]); }}
            className={`px-6 py-4 text-sm font-bold ${activeMasterTab === "mahasiswa" ? "text-[#06125C] border-b-2 border-[#06125C]" : "text-slate-500 hover:text-slate-800"}`}
          >
            Data Mahasiswa
          </button>
          <button
            onClick={() => { setActiveMasterTab("dosen"); setSelectedMasterIds([]); }}
            className={`px-6 py-4 text-sm font-bold ${activeMasterTab === "dosen" ? "text-[#06125C] border-b-2 border-[#06125C]" : "text-slate-500 hover:text-slate-800"}`}
          >
            Data Dosen
          </button>
          <button
            onClick={() => { setActiveMasterTab("admin"); setSelectedMasterIds([]); }}
            className={`px-6 py-4 text-sm font-bold ${activeMasterTab === "admin" ? "text-[#06125C] border-b-2 border-[#06125C]" : "text-slate-500 hover:text-slate-800"}`}
          >
            Data Admin
          </button>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-center gap-4 mb-6 overflow-x-auto w-full pb-2">
            <div className="relative shrink-0">
              <Search size={18} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama, NIM/NPM, atau NIP..."
                value={masterSearch}
                onChange={(e) => setMasterSearch(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-sm w-64 outline-none"
              />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {selectedMasterIds.length > 0 && (
                <button
                  onClick={handleBulkDeleteMasterData}
                  className="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all border border-red-200"
                >
                  Hapus Terpilih ({selectedMasterIds.length})
                </button>
              )}
              {activeMasterTab === "mahasiswa" && (
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                  <Filter size={16} className="text-slate-400" />
                  <select
                    value={masterAngkatanFilter}
                    onChange={(e) => setMasterAngkatanFilter(e.target.value)}
                    className="bg-transparent text-sm outline-none text-slate-700 font-medium"
                  >
                    <option value="Semua Angkatan">Semua Angkatan</option>
                    {uniqueAngkatan.map(a => (
                      <option key={a as string} value={a as string}>Angkatan {a}</option>
                    ))}
                  </select>
                </div>
              )}
              <button
                onClick={handleGenerateSemuaAkun}
                className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-100 border border-indigo-100 transition-colors"
              >
                Generate Semua Akun
              </button>
              <button
                onClick={() => setShowAddDataModal(true)}
                className="bg-[#06125C] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#06125C]/90"
              >
                <Plus size={16} /> Tambah Data
              </button>
              {activeMasterTab === "mahasiswa" && (
                <>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    ref={fileInputRef}
                    onChange={handleImportExcel}
                    className="hidden"
                    id="import-excel-mahasiswa"
                  />
                  <button
                    onClick={handleDownloadTemplate}
                    className="text-[#06125C] underline px-4 py-2 text-sm font-medium hover:text-[#06125C]/80"
                  >
                    Download Template
                  </button>
                  <button
                    onClick={() => document.getElementById('import-excel-mahasiswa')?.click()}
                    className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-100 border border-emerald-100 transition-colors"
                  >
                    Import Excel
                  </button>
                </>
              )}
              {activeMasterTab === "dosen" && (
                <>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    ref={fileInputDosenRef}
                    onChange={handleImportExcelDosen}
                    className="hidden"
                    id="import-excel-dosen"
                  />
                  <button
                    onClick={handleDownloadTemplateDosen}
                    className="text-[#06125C] underline px-4 py-2 text-sm font-medium hover:text-[#06125C]/80"
                  >
                    Download Template
                  </button>
                  <button
                    onClick={() => document.getElementById('import-excel-dosen')?.click()}
                    className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-100 border border-emerald-100 transition-colors"
                  >
                    Import Excel
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-semibold">
                <tr>
                  <th className="p-4 w-12 text-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={currentMasterData.length > 0 && selectedMasterIds.length === currentMasterData.length}
                      onChange={handleSelectAllMaster}
                    />
                  </th>
                  <th className="p-4">No</th>
                  {activeMasterTab !== "admin" && renderMasterSortableHeader(activeMasterTab === "mahasiswa" ? "NIM" : "NIP/NPI", "nim_nip")}
                  {renderMasterSortableHeader(activeMasterTab === "dosen" ? "Nama Dosen" : "Nama Lengkap", "name")}
                  {activeMasterTab === "dosen" && renderMasterSortableHeader("Status", "statusDosen", "center")}
                  {activeMasterTab === "mahasiswa" && renderMasterSortableHeader("Angkatan", "angkatan")}
                  {activeMasterTab === "mahasiswa" && renderMasterSortableHeader("Program Studi", "prodi")}
                  {renderMasterSortableHeader("Akun Login", "account")}
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {activeMasterTab === "mahasiswa" && (currentMasterData as typeof masterMahasiswa).map((m, i) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedMasterIds.includes(String(m.id))}
                        onChange={() => toggleSelectMaster(m.id)}
                      />
                    </td>
                    <td className="p-4 text-slate-500">{i + 1}</td>
                    <td className="p-4 font-medium text-slate-800">{m.nim}</td>
                    <td className="p-4 text-slate-700">{m.name}</td>
                    <td className="p-4 text-slate-600 font-medium">{m.angkatan || "-"}</td>
                    <td className="p-4 text-slate-600">{m.prodi}</td>
                    <td className="p-4">
                      {m.account ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500 w-12">User:</span>
                            <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{m.account.username}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500 w-12">Pass:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{m.account.password}</span>
                              {m.account.isPasswordChanged && (
                                <span className="font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1"><CheckCircle2 size={12}/> Telah Diubah</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleGenerateAkunMahasiswa(m.id)}
                          className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold px-2.5 py-1.5 rounded-lg border border-indigo-100 transition-colors"
                        >
                          Generate Akun
                        </button>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => handleEditMasterData("mahasiswa", m)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteMasterData("mahasiswa", m.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {activeMasterTab === "dosen" && (currentMasterData as typeof masterDosen).map((d, i) => (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedMasterIds.includes(String(d.id))}
                        onChange={() => toggleSelectMaster(d.id)}
                      />
                    </td>
                    <td className="p-4 text-slate-500">{i + 1}</td>
                    <td className="p-4 font-medium text-slate-800">{d.nip}</td>
                    <td className="p-4 font-semibold text-slate-800">{d.name}</td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold shadow-sm ${d.statusDosen === "Dosen Praktisi/Luar" ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-blue-100 text-blue-700 border border-blue-200"}`}>
                            {d.statusDosen || "Dosen Tetap"}
                          </span>
                        </td>
                    <td className="p-4">
                      {d.account ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500 w-12">User:</span>
                            <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{d.account.username}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500 w-12">Pass:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{d.account.password}</span>
                              {d.account.isPasswordChanged && (
                                <span className="font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1"><CheckCircle2 size={12}/> Telah Diubah</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleGenerateAkunDosen(d.id)}
                          className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold px-2.5 py-1.5 rounded-lg border border-indigo-100 transition-colors"
                        >
                          Generate Akun
                        </button>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => handleEditMasterData("dosen", d)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteMasterData("dosen", d.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {activeMasterTab === "admin" && (currentMasterData as typeof masterAdmin).map((a, i) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedMasterIds.includes(String(a.id))}
                        onChange={() => toggleSelectMaster(a.id)}
                      />
                    </td>
                    <td className="p-4 text-slate-500">{i + 1}</td>
                    <td className="p-4 text-slate-700">{a.name}</td>
                    <td className="p-4">
                      {a.account ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500 w-12">User:</span>
                            <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{a.account.username}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500 w-12">Pass:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{a.account.password}</span>
                              {a.account.isPasswordChanged && (
                                <span className="font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1"><CheckCircle2 size={12}/> Telah Diubah</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleGenerateAkunAdmin(a.id)}
                          className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold px-2.5 py-1.5 rounded-lg border border-indigo-100 transition-colors"
                        >
                          Generate Akun
                        </button>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => handleEditMasterData("admin", a)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteMasterData("admin", a.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {((activeMasterTab === "mahasiswa" && masterMahasiswa.length === 0) ||
                  (activeMasterTab === "dosen" && masterDosen.length === 0) ||
                  (activeMasterTab === "admin" && masterAdmin.length === 0)) && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center">
                          <Users size={32} className="text-slate-200 mb-2" />
                          <p>Belum ada data pengguna yang terdaftar.</p>
                        </div>
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
