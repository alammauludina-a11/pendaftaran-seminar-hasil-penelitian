import { NextResponse } from "next/server";
import { db } from "@/db";
import { slotWaktu, pendaftaran, kelasSeminar, moderator, users } from "@/db/schema";
import { eq, isNotNull, ne, and, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userDospem1 = (session?.user as any)?.nama as string | undefined;
    const url = new URL(request.url);
    const dospem1Param = url.searchParams.get("dospem1") || userDospem1 || "";
    const dospem2Param = url.searchParams.get("dospem2") || "";
    const jenisSeminar = url.searchParams.get("jenisSeminar") || "kolokium";

    // Fetch ALL slots — availability is now determined dynamically below, not by the tersedia flag.
    // (The old system set tersedia=false when a slot was booked; the new system no longer does this,
    //  but old records may still have tersedia=false, so we must not filter them out.)
    const slots = await db.select().from(slotWaktu);

    // Get all active (non-rejected) registrations that have a slot, with their class info
    const dosenUsers = alias(users, "dosenUsers");
    const activeRegistrations = await db
      .select({
        slotId: pendaftaran.slotWaktuId,
        kelasSeminarId: pendaftaran.kelasSeminarId,
        periodeId: pendaftaran.periodeId,
        dospem1: pendaftaran.dospem1,
        dospem2: pendaftaran.dospem2,
        waktuMulai: slotWaktu.waktuMulai,
        jenisSeminar: pendaftaran.jenisSeminar,
        moderatorName: dosenUsers.nama,
      })
      .from(pendaftaran)
      .innerJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
      .leftJoin(moderator, eq(pendaftaran.id, moderator.pendaftaranId))
      .leftJoin(dosenUsers, eq(moderator.dosenId, dosenUsers.id))
      .where(
        and(
          isNotNull(pendaftaran.slotWaktuId),
          ne(pendaftaran.statusVerifikasi, 'ditolak')
        )
      );

    const allClasses = await db.select().from(kelasSeminar);
    const formedClasses = allClasses;
    const formedClassIds = new Set(allClasses.map(k => k.id));

    // Build a map: slotId -> list of registrations
    const slotRegMap = new Map<number, typeof activeRegistrations>();
    for (const reg of activeRegistrations) {
      if (!reg.slotId) continue;
      if (!slotRegMap.has(reg.slotId)) slotRegMap.set(reg.slotId, []);
      slotRegMap.get(reg.slotId)!.push(reg);
    }

    // Helper: check if a specific slot has any "pending class formation" registrations
    // (i.e., registration exists but kelasSeminarId is null = class not formed yet)
    const uniqueKeys = new Set();
    const availableSlots: any[] = [];

    for (const s of slots) {
      if (!s.waktuMulai) continue;

      const dateObj = new Date(s.waktuMulai);
      const isoDate = dateObj.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
      
      // Filter realistically: only 08:00 to 16:50 (in WIB)
      const hourWIB = parseInt(dateObj.toLocaleTimeString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jakarta' }), 10);
      if (hourWIB < 8 || hourWIB > 16) continue;

      const time = s.waktuSelesai
        ? `${dateObj.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })} - ${new Date(s.waktuSelesai).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })}`
        : "";

      const key = `${isoDate}_${time}`;
      if (uniqueKeys.has(key)) continue;
      uniqueKeys.add(key);

      const allRegsOnSlot = slotRegMap.get(s.id) || [];
      const currentSeminarRegs = allRegsOnSlot.filter(r => r.jenisSeminar === jenisSeminar);
      
      const isEmpty = currentSeminarRegs.length === 0;

      // Check pending class formation only for the current seminar type
      const pendingClassRegs = currentSeminarRegs.filter(r => r.kelasSeminarId === null || !formedClassIds.has(r.kelasSeminarId!));
      const hasPendingClass = pendingClassRegs.length > 0;
      const allHaveClass = currentSeminarRegs.length > 0 && pendingClassRegs.length === 0;

      // Check dospem clash among ALL registrations (Kolokium & Hasil) because a lecturer can't be in two places at once
      let dospemClash = false;
      if (dospem1Param && allRegsOnSlot.length > 0) {
        dospemClash = allRegsOnSlot.some(r =>
          (r.dospem1 && (r.dospem1 === dospem1Param || r.dospem1 === dospem2Param)) ||
          (r.dospem2 && (r.dospem2 === dospem1Param || r.dospem2 === dospem2Param)) ||
          (r.moderatorName && (r.moderatorName === dospem1Param || r.moderatorName === dospem2Param))
        );
      }

      let blocked = false;
      let blockedReason = "";

      if (hasPendingClass) {
        blocked = true;
        blockedReason = "Slot sudah diambil, menunggu Kelas terbentuk";
      } else if (dospemClash) {
        blocked = true;
        blockedReason = "Dosen Pembimbing Anda sudah terjadwal di jam ini";
      }

      availableSlots.push({
        id: s.id,
        isoDate,
        date: dateObj.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric' }),
        hari: dateObj.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long' }),
        time,
        available: !blocked,
        blocked,
        blockedReason,
        isEmpty,
        allHaveClass,
        hasPendingClass,
      });
    }

    // Sort available slots by date and time
    availableSlots.sort((a, b) => {
       if (a.isoDate !== b.isoDate) return a.isoDate.localeCompare(b.isoDate);
       return a.time.localeCompare(b.time);
    });

    return NextResponse.json({ availableSlots }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
