import Link from "next/link";
import Image from "next/image";
import { Users, Monitor, ShieldCheck, Calendar, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-[#06125C]/20 flex flex-col">
      {/* Navigation */}
      <nav className="w-full z-50 bg-[#06125C] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-center sm:justify-start">
          <div className="flex items-center gap-3">
            <div className="h-12 bg-white rounded-lg p-1 shadow-inner flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="Logo SV IPB" 
                className="h-full w-auto object-contain"
              />
            </div>
            <span className="font-semibold text-xl tracking-tight hidden sm:block">Seminar Hub AKN SV IPB University</span>
            <span className="font-semibold text-xl tracking-tight sm:hidden">Seminar Hub SV IPB</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center relative px-6 py-20">
        {/* Background Decorative Element */}
        <div className="absolute top-0 right-0 w-full h-96 bg-gradient-to-b from-[#06125C]/5 to-transparent pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight text-[#06125C]">
              Sistem Pendaftaran <br className="hidden sm:block"/>
              <span className="text-amber-500">
                Seminar Hasil Penelitian
              </span>
            </h1>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Mahasiswa Portal */}
            <Link href="/login?role=mahasiswa" className="group relative p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-[#06125C]/30 transition-all flex flex-col justify-between overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1">
                <ArrowRight className="text-[#06125C]" />
              </div>
              <div>
                <div className="w-14 h-14 rounded-2xl bg-[#06125C]/10 flex items-center justify-center text-[#06125C] mb-6 group-hover:scale-110 transition-transform">
                  <Users size={28} />
                </div>
                <h3 className="text-2xl font-semibold mb-2 text-[#06125C]">Portal Mahasiswa</h3>
                <p className="text-slate-600 text-sm md:text-base">
                  Masuk untuk mengajukan jadwal seminar, upload berkas kolokium, dan pantau status verifikasi.
                </p>
              </div>
            </Link>

            {/* Dosen Portal */}
            <Link href="/login?role=dosen" className="group relative p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-[#06125C]/30 transition-all flex flex-col justify-between overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1">
                <ArrowRight className="text-[#06125C]" />
              </div>
              <div>
                <div className="w-14 h-14 rounded-2xl bg-[#06125C]/10 flex items-center justify-center text-[#06125C] mb-6 group-hover:scale-110 transition-transform">
                  <Monitor size={28} />
                </div>
                <h3 className="text-2xl font-semibold mb-2 text-[#06125C]">Portal Dosen</h3>
                <p className="text-slate-600 text-sm md:text-base">
                  Masuk untuk melihat jadwal kelas dan memilih sesi seminar yang ingin dimoderasi.
                </p>
              </div>
            </Link>

            {/* Admin Portal */}
            <Link href="/login?role=admin" className="group relative p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-[#06125C]/30 transition-all flex flex-col justify-between overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1">
                <ArrowRight className="text-[#06125C]" />
              </div>
              <div>
                <div className="w-14 h-14 rounded-2xl bg-[#06125C]/10 flex items-center justify-center text-[#06125C] mb-6 group-hover:scale-110 transition-transform">
                  <ShieldCheck size={28} />
                </div>
                <h3 className="text-2xl font-semibold mb-2 text-[#06125C]">Portal Admin</h3>
                <p className="text-slate-600 text-sm md:text-base">
                  Masuk untuk verifikasi berkas, kelola ruangan, dan mengumumkan jadwal final.
                </p>
              </div>
            </Link>

            {/* Informasi Jadwal */}
            <Link href="/jadwal" className="group relative p-8 rounded-3xl bg-[#06125C] text-white shadow-md hover:shadow-xl hover:shadow-[#06125C]/20 transition-all flex flex-col justify-between overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1">
                <ArrowRight className="text-amber-400" />
              </div>
              <div>
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
                  <Calendar size={28} />
                </div>
                <h3 className="text-2xl font-semibold mb-2">Informasi Jadwal</h3>
                <p className="text-blue-100 text-sm md:text-base">
                  Lihat daftar jadwal seminar hasil penelitian yang telah diotorisasi dan diumumkan.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-100 border-t border-slate-200 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex justify-center items-center">
          <p className="text-slate-600 text-sm text-center">
            © {new Date().getFullYear()} Seminar Hub AKN SV IPB University. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
