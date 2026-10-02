import { NextResponse } from "next/server";
import { and, desc, eq, gte, like, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { logAktivitas } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const KATEGORI = ["verifikasi", "jadwal", "kelas", "periode", "master"] as const;
const MAX_ROWS = 500;

/** Start of a WIB calendar day (YYYY-MM-DD) as a Date, or null when the input is not a date. */
function awalHariWib(day: string | null): Date | null {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  return new Date(new Date(`${day}T00:00:00Z`).getTime() - WIB_OFFSET_MS);
}

export async function GET(request: Request) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const params = new URL(request.url).searchParams;
    const kategori = params.get("kategori");
    const aktor = params.get("aktor");
    const q = params.get("q")?.trim();
    const dari = awalHariWib(params.get("dari"));
    const sampaiAwal = awalHariWib(params.get("sampai"));

    const conditions: SQL[] = [];
    if (kategori && (KATEGORI as readonly string[]).includes(kategori)) conditions.push(eq(logAktivitas.kategori, kategori as typeof KATEGORI[number]));
    if (aktor) conditions.push(eq(logAktivitas.actorId, aktor));
    if (dari) conditions.push(gte(logAktivitas.createdAt, dari));
    if (sampaiAwal) conditions.push(lt(logAktivitas.createdAt, new Date(sampaiAwal.getTime() + 24 * 60 * 60 * 1000)));
    if (q) {
      const pattern = `%${q.replace(/[%_]/g, "")}%`;
      conditions.push(or(like(logAktivitas.deskripsi, pattern), like(logAktivitas.actorNama, pattern))!);
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, [{ total }], aktorList] = await Promise.all([
      db.select().from(logAktivitas).where(where).orderBy(desc(logAktivitas.createdAt)).limit(MAX_ROWS),
      db.select({ total: sql<number>`count(*)` }).from(logAktivitas).where(where),
      db.selectDistinct({ id: logAktivitas.actorId, nama: logAktivitas.actorNama }).from(logAktivitas),
    ]);

    return NextResponse.json({
      total,
      maxRows: MAX_ROWS,
      aktivitas: rows.map(r => ({
        id: r.id,
        waktu: r.createdAt,
        aktor: r.actorNama ?? "Tidak diketahui",
        kategori: r.kategori,
        aksi: r.aksi,
        deskripsi: r.deskripsi,
        ip: r.ipAddress,
        detail: r.detail ? JSON.parse(r.detail) : null,
      })),
      aktorList: aktorList.filter(a => a.id),
    });
  } catch (error: any) {
    console.error("Error fetching log aktivitas:", error);
    return NextResponse.json({ error: error.message || "Gagal mengambil log aktivitas" }, { status: 500 });
  }
}
