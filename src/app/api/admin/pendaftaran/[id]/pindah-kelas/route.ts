import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { pendaftaran, kelasSeminar, slotWaktu, users } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { getWaktuMulaiPendaftaran } from "@/lib/jadwal";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await request.json();
    const kelasSeminarId: number | null = body.kelasSeminarId ?? null;

    // Fetch the registration
    const existing = await db.select().from(pendaftaran).where(eq(pendaftaran.id, id));
    if (existing.length === 0) {
      return NextResponse.json({ error: "Data pendaftaran tidak ditemukan" }, { status: 404 });
    }
    const reg = existing[0];

    if (reg.isFinalized || reg.isReleased) {
      return NextResponse.json({ error: "Mahasiswa yang sudah difinalisasi tidak dapat dipindah kelas. Batalkan finalisasi terlebih dahulu." }, { status: 400 });
    }

    if (kelasSeminarId !== null) {
      if (reg.statusVerifikasi !== "disetujui") {
        return NextResponse.json({ error: "Hanya pendaftaran yang sudah disetujui yang dapat dimasukkan ke kelas." }, { status: 400 });
      }

      // Target class must exist and belong to the same periode (= same seminar type & angkatan)
      const targetClass = await db.select().from(kelasSeminar).where(eq(kelasSeminar.id, kelasSeminarId));
      if (targetClass.length === 0) {
        return NextResponse.json({ error: "Kelas tujuan tidak ditemukan" }, { status: 404 });
      }
      if (targetClass[0].periodeId !== reg.periodeId) {
        return NextResponse.json({ error: "Kelas tujuan berada di periode/jenis seminar yang berbeda." }, { status: 400 });
      }

      // Schedule clash: the target class must not already have another student at the same slot time
      const waktuMulai = await getWaktuMulaiPendaftaran(reg.id);
      if (waktuMulai) {
        const clash = await db
          .select({ nama: users.nama })
          .from(pendaftaran)
          .innerJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
          .innerJoin(users, eq(pendaftaran.userId, users.id))
          .where(and(
            eq(pendaftaran.kelasSeminarId, kelasSeminarId),
            eq(slotWaktu.waktuMulai, waktuMulai),
            ne(pendaftaran.statusVerifikasi, "ditolak"),
            ne(pendaftaran.id, reg.id)
          ))
          .limit(1);
        if (clash.length > 0) {
          return NextResponse.json({ error: `Jadwal bentrok: di kelas tujuan sudah ada ${clash[0].nama} pada jam yang sama.` }, { status: 409 });
        }
      }
      // Note: admin may exceed the class capacity on purpose (as per requirement).
    }

    await db.update(pendaftaran)
      .set({ kelasSeminarId })
      .where(eq(pendaftaran.id, id));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating kelas:", error);
    return NextResponse.json({ error: "Gagal memindahkan kelas" }, { status: 500 });
  }
}
