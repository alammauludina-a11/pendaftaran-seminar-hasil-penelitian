import { NextResponse } from "next/server";
import { db } from "@/db";
import { pendaftaran, slotWaktu, kelasSeminar } from "@/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import { periode } from "@/db/schema";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await request.json();
    const { status, note } = body;

    if (!['disetujui', 'ditolak', 'menunggu'].includes(status)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }

    const updated = await db.update(pendaftaran)
      .set({
        statusVerifikasi: status,
        catatanAdmin: note || ""
      })
      .where(eq(pendaftaran.id, id))
      .returning();

    if (!updated.length) {
      return NextResponse.json({ error: "Pendaftaran tidak ditemukan" }, { status: 404 });
    }

    const reg = updated[0];

    if (status === "ditolak" && reg.slotWaktuId) {
      await db.update(slotWaktu)
        .set({ tersedia: true })
        .where(eq(slotWaktu.id, reg.slotWaktuId));
    }

    if (status === "disetujui" && reg.slotWaktuId && reg.periodeId) {
      // Get periode configuration
      const periodes = await db.select().from(periode).where(eq(periode.id, reg.periodeId));
      if (periodes.length > 0) {
        const p = periodes[0];
        const batasKelas = p.batasKelas || 31;

        // Count students currently in queue (verified but no class)
        const queuedStudents = await db.select()
          .from(pendaftaran)
          .where(and(
             eq(pendaftaran.periodeId, reg.periodeId),
             eq(pendaftaran.statusVerifikasi, "disetujui"),
             isNull(pendaftaran.kelasSeminarId)
          ))
          .orderBy(asc(pendaftaran.id));
        
        // If queue reaches batas_kelas, auto-form a class
        if (queuedStudents.length >= batasKelas) {
          const studentsToForm = queuedStudents.slice(0, batasKelas);
          
          // Determine new class name
          const allClassesInPeriod = await db.select().from(kelasSeminar).where(eq(kelasSeminar.periodeId, reg.periodeId));
          const existingNames = new Set(allClassesInPeriod.map(c => c.namaKelas));
          let className = "A";
          let i = 0;
          while (true) {
            const candidate = String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : '');
            if (!existingNames.has(candidate)) {
              className = candidate;
              break;
            }
            i++;
          }
          
          const newClass = await db.insert(kelasSeminar).values({
            namaKelas: className,
            periodeId: reg.periodeId,
            kuotaTerisi: studentsToForm.length,
            kapasitasMax: batasKelas
          }).returning();
          
          const kelasId = newClass[0].id;
          
          // Assign class to students
          for (const student of studentsToForm) {
            await db.update(pendaftaran).set({ kelasSeminarId: kelasId }).where(eq(pendaftaran.id, student.id));
          }
        }
      }
    }

    return NextResponse.json({
      message: "Status verifikasi berhasil diperbarui.",
      data: reg
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json(
      { error: "Gagal memproses permintaan." },
      { status: 500 }
    );
  }
}
