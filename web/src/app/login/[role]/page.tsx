"use client";

import { useState } from "react";
import { signIn, signOut } from "@/lib/auth-client";
import { useRouter, useParams } from "next/navigation";
import { User, GraduationCap, Shield } from "lucide-react";

export default function LoginPage() {
  const params = useParams();
  const role = (params.role as string) || "mahasiswa";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await signIn.username({
        username,
        password,
      });

      if (error) {
        setError(error.message || "Username atau password salah");
      } else if (data?.user) {
        const userRole = (data.user as any).role;
        if (userRole !== role) {
            await signOut();
            setError(`Akun ini tidak memiliki akses sebagai ${role.charAt(0).toUpperCase() + role.slice(1)}.`);
            setLoading(false);
            return;
        }
        
        // Redirect based on role
        if (role === "mahasiswa") {
          router.push("/dashboard/mahasiswa");
        } else if (role === "dosen") {
          router.push("/dashboard/dosen");
        } else {
          router.push("/dashboard/admin");
        }
      }
    } catch (err: any) {
      setError("Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 p-8 overflow-hidden relative">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500" />
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-600 mb-2 capitalize">
            Portal {role}
          </h1>
          <p className="text-gray-500 text-sm">Masuk ke akun Anda untuk melanjutkan</p>
        </div>


        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Username (Akun)</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              placeholder="Masukkan username Anda"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-medium py-3 rounded-xl hover:opacity-90 transition-opacity focus:ring-4 focus:ring-indigo-100 disabled:opacity-70 flex justify-center items-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Masuk"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
