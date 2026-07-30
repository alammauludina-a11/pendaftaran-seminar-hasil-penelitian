const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/dashboard/admin/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update state type
content = content.replace(
  `const [activeTab, setActiveTab] = useState<"verifikasi" | "finalisasi" | "pembahas" | "pengumuman" | "kelas">("verifikasi");`,
  `const [activeTab, setActiveTab] = useState<"verifikasi" | "finalisasi" | "pembahas" | "pengumuman" | "kelas" | "rekapitulasi">("verifikasi");`
);

// 2. Add Tab Button
const tabTarget = `              <button
                onClick={() => setActiveTab("kelas")}
                className={\`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all \${activeTab === "kelas"
                  ? "bg-[#06125C] text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-100 hover:text-[#06125C]"
                  }\`}
              >
                <Users size={18} />
                Manajemen Kelas
              </button>
            </div>`;
const tabReplacement = `              <button
                onClick={() => setActiveTab("kelas")}
                className={\`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all \${activeTab === "kelas"
                  ? "bg-[#06125C] text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-100 hover:text-[#06125C]"
                  }\`}
              >
                <Users size={18} />
                Manajemen Kelas
              </button>
              <button
                onClick={() => setActiveTab("rekapitulasi")}
                className={\`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all \${activeTab === "rekapitulasi"
                  ? "bg-[#06125C] text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-100 hover:text-[#06125C]"
                  }\`}
              >
                <UserCheck size={18} />
                Rekapitulasi Dosen
              </button>
            </div>`;
content = content.replace(tabTarget, tabReplacement);

// 3. Add Tab Content right before Modal Verifikasi Pendaftaran
const contentTarget = `      {/* Modal Verifikasi Pendaftaran */}`;
const contentReplacement = `      {/* Tab Content: Rekapitulasi */}
            {activeTab === "rekapitulasi" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6">
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                  <h2 className="text-xl font-bold text-[#06125C] flex items-center gap-2 mb-2">
                    <UserCheck className="text-amber-500" /> Rekapitulasi Dosen
                  </h2>
                  <p className="text-slate-500 text-sm mb-6">Rekapitulasi beban tugas dosen (sebagai moderator dan pembimbing) pada periode {activePeriode?.angkatan || '-'}.</p>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="px-4 py-3">Nama Dosen</th>
                          <th className="px-4 py-3 text-center">Sebagai Moderator</th>
                          <th className="px-4 py-3 text-center">Sebagai Pembimbing</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {masterDosen.map(dosen => {
                          const moderatorCount = activePendaftaran.filter(p => p.moderator === dosen.name || (p.moderator && p.moderator.includes(dosen.name))).length;
                          const pembimbingCount = activePendaftaran.filter(p => p.dospem && p.dospem.includes(dosen.name)).length;
                          return (
                            <tr key={dosen.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-4 font-semibold text-slate-800">{dosen.name}</td>
                              <td className="px-4 py-4 text-center text-slate-600">
                                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-bold">{moderatorCount}</span>
                              </td>
                              <td className="px-4 py-4 text-center text-slate-600">
                                <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-bold">{pembimbingCount}</span>
                              </td>
                            </tr>
                          );
                        })}
                        {masterDosen.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-slate-500">Belum ada data dosen.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

      {/* Modal Verifikasi Pendaftaran */}`;
content = content.replace(contentTarget, contentReplacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patched successfully!');
