import { NextResponse } from "next/server";
import { db } from "@/db";
import { slotWaktu, pendaftaran, kelasSeminar, moderator } from "@/db/schema";
import { eq, isNotNull, ne, and, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isValidSlotTime } from "@/lib/slot-rules";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(request.url);
    // Dosen user ids of the chosen pembimbing
    const dospem1Param = url.searchParams.get("dospem1") || "";
    const dospem2Param = url.searchParams.get("dospem2") || "";
    const jenisSeminar = url.searchParams.get("jenisSeminar") || "kolokium";

    // Fetch ALL slots — availability is now determined dynamically below, not by the tersedia flag.
    // (The old system set tersedia=false when a slot was booked; the new system no longer does this,
    //  but old records may still have tersedia=false, so we must not filter them out.)
    // Sorted by id so that when duplicate rows exist for the same time, the same (lowest) id is always shown
    const slots = (await db.select().from(slotWaktu)).sort((a, b) => a.id - b.id);

    // Get all active (non-rejected) registrations that have a slot, with their class info
    const activeRegistrations = await db
      .select({
        slotId: pendaftaran.slotWaktuId,
        kelasSeminarId: pendaftaran.kelasSeminarId,
        periodeId: pendaftaran.periodeId,
        dospem1Id: pendaftaran.dospem1Id,
        dospem2Id: pendaftaran.dospem2Id,
        waktuMulai: slotWaktu.waktuMulai,
        jenisSeminar: pendaftaran.jenisSeminar,
        moderatorId: moderator.dosenId,
      })
      .from(pendaftaran)
      .innerJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
      .leftJoin(moderator, eq(pendaftaran.id, moderator.pendaftaranId))
      .where(
        and(
          isNotNull(pendaftaran.slotWaktuId),
          ne(pendaftaran.statusVerifikasi, 'ditolak')
        )
      );

    const allClasses = await db.select().from(kelasSeminar);
    const formedClasses = allClasses;
    const formedClassIds = new Set(allClasses.map(k => k.id));

    // Build a map: slot start time -> list of registrations.
    // Keyed by time (not slot id) because slot_waktu can contain duplicate rows for the same time;
    // a registration on any of those rows must block/occupy the same time slot.
    const slotRegMap = new Map<number, typeof activeRegistrations>();
    for (const reg of activeRegistrations) {
      if (!reg.slotId || !reg.waktuMulai) continue;
      const timeKey = new Date(reg.waktuMulai).getTime();
      if (!slotRegMap.has(timeKey)) slotRegMap.set(timeKey, []);
      slotRegMap.get(timeKey)!.push(reg);
    }

    // Helper: check if a specific slot has any "pending class formation" registrations
    // (i.e., registration exists but kelasSeminarId is null = class not formed yet)
    const uniqueKeys = new Set();
    const availableSlots: any[] = [];

    for (const s of slots) {
      if (!s.waktuMulai) continue;

      const dateObj = new Date(s.waktuMulai);
      const isoDate = dateObj.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
      
      // Only 08:00 - 16:50 WIB, no 12:00 break slot, no Sundays
      if (!isValidSlotTime(dateObj)) continue;

      const time = s.waktuSelesai
        ? `${dateObj.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })} - ${new Date(s.waktuSelesai).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })}`
        : "";

      const key = `${isoDate}_${time}`;
      if (uniqueKeys.has(key)) continue;
      uniqueKeys.add(key);

      const allRegsOnSlot = slotRegMap.get(dateObj.getTime()) || [];
      const currentSeminarRegs = allRegsOnSlot.filter(r => r.jenisSeminar === jenisSeminar);
      
      const isEmpty = currentSeminarRegs.length === 0;

      // Check pending class formation only for the current seminar type
      const pendingClassRegs = currentSeminarRegs.filter(r => r.kelasSeminarId === null || !formedClassIds.has(r.kelasSeminarId!));
      const hasPendingClass = pendingClassRegs.length > 0;
      const allHaveClass = currentSeminarRegs.length > 0 && pendingClassRegs.length === 0;

      // Check dospem clash among ALL registrations (Kolokium & Hasil) because a lecturer can't be in two places at once
      let dospemClash = false;
      if (dospem1Param && allRegsOnSlot.length > 0) {
        const mine = [dospem1Param, dospem2Param].filter(Boolean);
        dospemClash = allRegsOnSlot.some(r =>
          [r.dospem1Id, r.dospem2Id, r.moderatorId].some(id => id && mine.includes(id))
        );
      }

      let blocked = false;
      let blockedReason = "";

      if (dateObj.getTime() <= Date.now()) {
        blocked = true;
        blockedReason = "Waktu slot sudah lewat";
      } else if (hasPendingClass) {
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
