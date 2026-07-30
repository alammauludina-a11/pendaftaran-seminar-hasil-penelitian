import { NextResponse } from "next/server";
import { db } from "@/db";
import { pendaftaran, users, slotWaktu, periode } from "@/db/schema";
import { eq, or, and, desc, isNotNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "dosen") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reqPeriodeId = searchParams.get("periodeId");

    const dosenNama = session.user.nama || session.user.name;

    const allPeriodeData = await db.select().from(periode).orderBy(desc(periode.createdAt));
    const allPeriode = allPeriodeData.map(p => ({
      id: p.id,
      angkatan: p.angkatan,
      isOpen: p.isOpen,
      startDate: p.startDate,
      endDate: p.endDate,
      isDraft: p.isDraft,
      jenisSeminar: p.jenisSeminar,
    }));

    let activePeriodeData = null;
    if (reqPeriodeId) {
      activePeriodeData = allPeriodeData.find(p => p.id === parseInt(reqPeriodeId)) || null;
    }
    if (!activePeriodeData) {
      activePeriodeData = allPeriodeData.find(p => p.isOpen) || allPeriodeData[0] || null;
    }

    let bimbingan: any[] = [];

    if (activePeriodeData) {
      const data = await db
        .select({
          id: pendaftaran.id,
          name: users.nama,
          nim: users.nipNim,
          prodi: users.prodi,
          dospem1: pendaftaran.dospem1,
          dospem2: pendaftaran.dospem2,
          title: pendaftaran.judulPenelitian,
          status: pendaftaran.statusVerifikasi,
          note: pendaftaran.catatanAdmin,
          isFinalized: pendaftaran.isFinalized,
          isReleased: pendaftaran.isReleased,
          room: pendaftaran.ruanganDisetujui,
          pembahas: pendaftaran.pembahas,
          slotWaktuId: pendaftaran.slotWaktuId,
          waktuMulai: slotWaktu.waktuMulai,
          waktuSelesai: slotWaktu.waktuSelesai,
        })
        .from(pendaftaran)
        .leftJoin(users, eq(pendaftaran.userId, users.id))
        .leftJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
        .where(
          and(
            eq(pendaftaran.periodeId, activePeriodeData.id),
            eq(pendaftaran.statusVerifikasi, "disetujui"),
            isNotNull(pendaftaran.kelasSeminarId),
            or(
              eq(pendaftaran.dospem1, dosenNama),
              eq(pendaftaran.dospem2, dosenNama),
              eq(pendaftaran.pembahas, dosenNama)
            )
          )
        );

      // Format date and time
      bimbingan = data.map((item) => {
        let date = "-";
        let time = "-";
        let isPast = false;
        let isToday = false;
        let isFuture = false;

        if (item.waktuMulai && item.waktuSelesai) {
          const d = new Date(item.waktuMulai);
          const endD = new Date(item.waktuSelesai);
          const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
          date = `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
          time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${endD.getHours().toString().padStart(2, '0')}:${endD.getMinutes().toString().padStart(2, '0')}`;
          
          const now = new Date();
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const startOfClass = new Date(d.getFullYear(), d.getMonth(), d.getDate());

          if (now.getTime() > endD.getTime()) {
            isPast = true;
          } else if (startOfClass.getTime() === startOfToday.getTime()) {
            isToday = true;
          } else {
            isFuture = true;
          }
        }

        return {
          ...item,
          dospem: item.dospem1,
          date,
          time,
          isPast,
          isToday,
          isFuture
        };
      });
    }

    return NextResponse.json({ bimbingan, allPeriode, activePeriodeData }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
