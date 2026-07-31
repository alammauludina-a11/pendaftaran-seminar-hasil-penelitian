import { NextResponse } from "next/server";
import { db } from "@/db";
import { pendaftaran, kelasSeminar, periode } from "@/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { periodeId } = body;

    if (!periodeId) {
      return NextResponse.json({ error: "Periode ID required" }, { status: 400 });
    }

    // Get active period
    const periodes = await db.select().from(periode).where(eq(periode.id, periodeId));
    if (periodes.length === 0) {
      return NextResponse.json({ error: "Periode tidak ditemukan" }, { status: 404 });
    }
    const p = periodes[0];
    const batasKelas = p.batasKelas || 31;

    // Get all students in queue for this period
    const queuedStudents = await db.select()
      .from(pendaftaran)
      .where(and(
         eq(pendaftaran.periodeId, periodeId),
         eq(pendaftaran.statusVerifikasi, "disetujui"),
         isNull(pendaftaran.kelasSeminarId)
      ))
      .orderBy(asc(pendaftaran.id));

    if (queuedStudents.length === 0) {
      return NextResponse.json({ error: "Tidak ada mahasiswa dalam antrean" }, { status: 400 });
    }

    // Even if it's less than batasKelas, we force create it. 
    // We just take up to batasKelas students.
    const studentsToForm = queuedStudents.slice(0, batasKelas);

    // Determine new class name
    const allClassesInPeriod = await db.select().from(kelasSeminar).where(eq(kelasSeminar.periodeId, periodeId));
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
      periodeId: periodeId,
      kuotaTerisi: studentsToForm.length,
      kapasitasMax: batasKelas
    }).returning();
    
    const kelasId = newClass[0].id;
    
    // Assign class to students
    for (const student of studentsToForm) {
      await db.update(pendaftaran).set({ kelasSeminarId: kelasId }).where(eq(pendaftaran.id, student.id));
    }

    return NextResponse.json({ 
      message: `Berhasil membentuk Kelas ${className} dengan ${studentsToForm.length} mahasiswa.`,
      kelas: newClass[0]
    }, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal membentuk kelas" }, { status: 500 });
  }
}
