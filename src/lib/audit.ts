// Audit trail for admin actions (Analisis Log → Aktivitas Admin).
// Writes happen in `after()`, so logging never slows down or breaks the admin's request.
import { after } from "next/server";
import { headers } from "next/headers";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { logAktivitas, pendaftaran, users } from "@/db/schema";
import { auth } from "@/lib/auth";

export type KategoriAktivitas = "verifikasi" | "jadwal" | "kelas" | "periode" | "master";

type Aktivitas = {
  kategori: KategoriAktivitas;
  /** Machine-readable action key, e.g. "verifikasi.disetujui". */
  aksi: string;
  /** Human-readable sentence. `{mahasiswa}` is replaced with "Nama (NIM)" of `pendaftaranIds`. */
  deskripsi: string;
  targetTipe?: string;
  targetId?: string | number;
  /** Registrations this action touched; used to fill `{mahasiswa}` (up to 3 names, then "+N lainnya"). */
  pendaftaranIds?: number[];
  detail?: Record<string, unknown>;
};

async function namaMahasiswa(pendaftaranIds: number[]): Promise<string> {
  if (pendaftaranIds.length === 0) return "-";
  const rows = await db
    .select({ nama: users.nama, nim: users.nipNim })
    .from(pendaftaran)
    .innerJoin(users, eq(pendaftaran.userId, users.id))
    .where(inArray(pendaftaran.id, pendaftaranIds.slice(0, 3)));
  const names = rows.map(r => `${r.nama} (${r.nim})`).join(", ");
  return pendaftaranIds.length > 3 ? `${names} +${pendaftaranIds.length - 3} lainnya` : names || "-";
}

/** Look up "Nama (NIP/NIM)" for users before they are changed or deleted. */
export async function labelUsers(ids: string[]): Promise<string> {
  if (ids.length === 0) return "-";
  const rows = await db.select({ nama: users.nama, nim: users.nipNim }).from(users).where(inArray(users.id, ids.slice(0, 3)));
  const names = rows.map(r => `${r.nama} (${r.nim})`).join(", ");
  return ids.length > 3 ? `${names} +${ids.length - 3} lainnya` : names || "-";
}

export function catatAktivitas(entry: Aktivitas) {
  after(async () => {
    try {
      const h = await headers();
      const session = await auth.api.getSession({ headers: h });
      const deskripsi = entry.deskripsi.includes("{mahasiswa}")
        ? entry.deskripsi.replace("{mahasiswa}", await namaMahasiswa(entry.pendaftaranIds ?? []))
        : entry.deskripsi;

      await db.insert(logAktivitas).values({
        id: crypto.randomUUID(),
        actorId: session?.user.id ?? null,
        actorNama: (session?.user as { nama?: string } | undefined)?.nama ?? session?.user.name ?? null,
        kategori: entry.kategori,
        aksi: entry.aksi,
        deskripsi,
        targetTipe: entry.targetTipe ?? null,
        targetId: entry.targetId !== undefined ? String(entry.targetId) : null,
        detail: entry.detail ? JSON.stringify(entry.detail) : null,
        ipAddress: h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || null,
      });
    } catch (error) {
      console.error("Failed to write log_aktivitas:", error);
    }
  });
}
