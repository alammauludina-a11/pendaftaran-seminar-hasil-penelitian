import { NextResponse } from "next/server";
import { findDosenClash, getWaktuMulaiPendaftaran } from "@/lib/jadwal";
import { db } from "@/db";
import { moderator, kelasSeminar, pendaftaran, users, slotWaktu, periode } from "@/db/schema";
import { eq, isNull, and, desc, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { alias } from "drizzle-orm/sqlite-core";

const dosenUsers = alias(users, "dosenUsers");

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "dosen") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reqPeriodeId = searchParams.get("periodeId");

    const currentUserId = session.user.id;
    const dosenUser = await db.select().from(users).where(eq(users.id, currentUserId)).limit(1);
    const dosenName = dosenUser[0]?.nama;

    const allPeriodeData = await db.select().from(periode).orderBy(desc(periode.createdAt));
    let activePeriodeData = null;
    if (reqPeriodeId) {
      activePeriodeData = allPeriodeData.find(p => p.id === parseInt(reqPeriodeId)) || null;
    }
    if (!activePeriodeData) {
      activePeriodeData = allPeriodeData.find(p => p.isOpen) || allPeriodeData[0] || null;
    }

    if (!activePeriodeData) {
       return NextResponse.json({
         availableKelas: [],
         myModerasi: [],
         activePeriodeData: null
       }, { status: 200 });
    }

    const allKelas = await db.select().from(kelasSeminar).where(eq(kelasSeminar.periodeId, activePeriodeData.id));

    // Batch query: fetch all students for all classes in one go (eliminates N+1)
    const allStudentsData = await db.select({
      kelasSeminarId: pendaftaran.kelasSeminarId,
      pendaftaranId: pendaftaran.id,
      nama: users.nama,
      nim: users.nipNim,
      judul: pendaftaran.judulPenelitian,
      dospem: pendaftaran.dospem1,
      dospem2: pendaftaran.dospem2,
      room: pendaftaran.ruanganDisetujui,
      waktuMulai: slotWaktu.waktuMulai,
      waktuSelesai: slotWaktu.waktuSelesai,
      moderatorId: moderator.dosenId,
      moderatorRecordId: moderator.id,
      moderatorName: dosenUsers.nama,
      batalStatus: moderator.batalStatus,
    })
      .from(pendaftaran)
      .leftJoin(users, eq(pendaftaran.userId, users.id))
      .leftJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
      .leftJoin(moderator, eq(pendaftaran.id, moderator.pendaftaranId))
      .leftJoin(dosenUsers, eq(moderator.dosenId, dosenUsers.id))
      .where(eq(pendaftaran.statusVerifikasi, "disetujui"));

    // Group students by kelasSeminarId
    const studentsByClass = new Map<number, typeof allStudentsData>();
    for (const s of allStudentsData) {
      if (!s.kelasSeminarId) continue;
      if (!studentsByClass.has(s.kelasSeminarId)) studentsByClass.set(s.kelasSeminarId, []);
      studentsByClass.get(s.kelasSeminarId)!.push(s);
    }

    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const classesDetails = allKelas.map((k) => {
      const studentsData = studentsByClass.get(k.id) || [];

      let slotDetail: any = null;
      let isPast = false;
      let isToday = false;
      let isFuture = false;

      if (studentsData.length > 0) {
        const sortedStudents = [...studentsData].sort((a, b) => {
          const timeA = a.waktuMulai ? new Date(a.waktuMulai).getTime() : 0;
          const timeB = b.waktuMulai ? new Date(b.waktuMulai).getTime() : 0;
          return timeA - timeB;
        });
        const startD = new Date(sortedStudents[0].waktuMulai!);
        const endD = new Date(sortedStudents[sortedStudents.length - 1].waktuSelesai!);

        const startDateStr = `${startD.getDate().toString().padStart(2, '0')} ${months[startD.getMonth()]} ${startD.getFullYear()}`;
        const endDateStr = `${endD.getDate().toString().padStart(2, '0')} ${months[endD.getMonth()]} ${endD.getFullYear()}`;
        const dateStr = startDateStr === endDateStr ? startDateStr : `${startDateStr} - ${endDateStr}`;

        const timeFormatter = new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        const minTime = timeFormatter.format(startD).replace('.', ':');
        const maxTime = timeFormatter.format(endD).replace('.', ':');

        const isoDates = Array.from(new Set(sortedStudents.map(s => {
          const d = new Date(s.waktuMulai!);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })));

        const startOfClass = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate());

        if (now.getTime() > endD.getTime()) {
          isPast = true;
        } else if (startOfClass.getTime() === startOfToday.getTime()) {
          isToday = true;
        } else {
          isFuture = true;
        }

        slotDetail = {
          date: dateStr,
          fullDate: dateStr,
          time: `${minTime} - ${maxTime}`,
          dateNum: startD.getDate(),
          isoDates: isoDates,
          isPast, isToday, isFuture
        };
      } else {
        slotDetail = {
          date: "Belum ada jadwal",
          fullDate: "Belum ada jadwal",
          time: "-",
          dateNum: 0,
          isoDates: [],
          isPast: false, isToday: false, isFuture: false
        };
      }

      const students = studentsData.map(s => {
        const startD = new Date(s.waktuMulai!);
        const endD = new Date(s.waktuSelesai!);
        const dateStr = `${startD.getDate().toString().padStart(2, '0')} ${months[startD.getMonth()]} ${startD.getFullYear()}`;
        const timeFormatter = new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        const startTimeStr = timeFormatter.format(startD).replace('.', ':');
        const endTimeStr = timeFormatter.format(endD).replace('.', ':');

        let sIsPast = false;
        let sIsToday = false;
        let sIsFuture = false;
        const startOfClass = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate());

        if (now.getTime() > endD.getTime()) {
          sIsPast = true;
        } else if (startOfClass.getTime() === startOfToday.getTime()) {
          sIsToday = true;
        } else {
          sIsFuture = true;
        }

        return {
          ...s,
          dateStr: dateStr,
          time: `${startTimeStr} - ${endTimeStr}`,
          isMyModeration: s.moderatorId === currentUserId,
          hasModerator: !!s.moderatorId,
          batalStatus: s.moderatorId === currentUserId ? s.batalStatus : null,
          isPast: sIsPast,
          isToday: sIsToday,
          isFuture: sIsFuture,
        };
      });

      const isSupervisor = students.some(s => s.dospem === dosenName || s.dospem2 === dosenName);
      const userModeratesClass = students.some(s => s.isMyModeration);

      return {
        id: k.id,
        name: k.namaKelas,
        kuotaTerisi: k.kuotaTerisi,
        kapasitasMax: k.kapasitasMax,
        ...slotDetail,
        room: Array.from(new Set(students.map(s => s.room).filter(Boolean))).join(', ') || "-",
        studentCount: students.length,
        students: students,
        supervisor: students[0]?.dospem || "-",
        isSupervisor: isSupervisor,
        userModeratesClass: userModeratesClass,
      };
    });

    // Available Kelas: show all classes so lecturers can see the schedule even if fully moderated
    const availableKelas = classesDetails;
    
    // My Moderasi: any class where the user moderates AT LEAST ONE student.
    const myModerasi = classesDetails.filter(c => c.userModeratesClass);

    return NextResponse.json({
      availableKelas,
      myModerasi,
      activePeriodeData,
      allPeriode: allPeriodeData
    }, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Gagal mengambil data." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "dosen") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { pendaftaranId } = body;

    if (!pendaftaranId) {
      return NextResponse.json({ error: "Pendaftaran ID diperlukan" }, { status: 400 });
    }

    // Check if someone else already took it
    const existing = await db.select().from(moderator).where(eq(moderator.pendaftaranId, pendaftaranId));
    if (existing.length > 0) {
      return NextResponse.json({ error: "Jadwal ini sudah diambil oleh moderator lain" }, { status: 400 });
    }

    // Check for schedule conflict with their bimbingan
    const currentUserId = session.user.id;
    const dosenUser = await db.select().from(users).where(eq(users.id, currentUserId)).limit(1);
    const dosenName = dosenUser[0]?.nama;

    const targetPend = await db.select().from(pendaftaran).where(eq(pendaftaran.id, pendaftaranId)).limit(1);
    if (targetPend.length === 0) {
       return NextResponse.json({ error: "Data pendaftaran tidak ditemukan" }, { status: 404 });
    }
    if (dosenName && (targetPend[0].dospem1 === dosenName || targetPend[0].dospem2 === dosenName)) {
      return NextResponse.json({ error: "Anda tidak dapat menjadi moderator untuk mahasiswa bimbingan Anda sendiri." }, { status: 400 });
    }

    // Check for schedule conflict: bimbingan or another moderation at the same time (matched by slot time)
    const waktuMulai = await getWaktuMulaiPendaftaran(targetPend[0].id);
    if (waktuMulai && dosenName) {
      const clash = await findDosenClash({ dosenId: currentUserId, dosenName, waktuMulai, excludePendaftaranId: targetPend[0].id });
      if (clash) {
        return NextResponse.json({ error: `Anda tidak dapat menjadi moderator pada jadwal ini karena bentrok: ${clash}` }, { status: 400 });
      }
    }

    await db.insert(moderator).values({
      pendaftaranId,
      dosenId: session.user.id,
      assignedByRole: 'dosen'
    });

    return NextResponse.json({ message: "Berhasil memilih jadwal" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal memilih jadwal" }, { status: 500 });
  }
}
