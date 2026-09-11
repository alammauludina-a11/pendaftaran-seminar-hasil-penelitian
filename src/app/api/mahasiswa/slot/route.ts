import { NextResponse } from "next/server";
import { db } from "@/db";
import { slotWaktu, pendaftaran, kelasSeminar } from "@/db/schema";
import { eq, isNotNull, ne, and, isNull } from "drizzle-orm";
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
    const activeRegistrations = await db
      .select({
        slotId: pendaftaran.slotWaktuId,
        kelasSeminarId: pendaftaran.kelasSeminarId,
        dospem1: pendaftaran.dospem1,
        dospem2: pendaftaran.dospem2,
        waktuMulai: slotWaktu.waktuMulai,
        jenisSeminar: pendaftaran.jenisSeminar,
      })
      .from(pendaftaran)
      .innerJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
      .where(
        and(
          isNotNull(pendaftaran.slotWaktuId),
          ne(pendaftaran.statusVerifikasi, 'ditolak')
        )
      );

    // Get all formed classes in the same jenis seminar  
    const formedClasses = await db.select().from(kelasSeminar);
    const formedClassIds = new Set(formedClasses.map(k => k.id));

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
      const isoDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      const time = s.waktuSelesai
        ? `${dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - ${new Date(s.waktuSelesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
        : "";

      const key = `${isoDate}_${time}`;
      if (uniqueKeys.has(key)) continue;
      uniqueKeys.add(key);

      const regsOnSlot = slotRegMap.get(s.id) || [];

      // Check 1: Is there a registration on this slot where the class is NOT yet formed?
      const pendingClassRegs = regsOnSlot.filter(r => r.kelasSeminarId === null || !formedClassIds.has(r.kelasSeminarId!));
      
      // Check 2: Does current student's dospem clash with anyone already on this slot?
      let dospemClash = false;
      if (dospem1Param && regsOnSlot.length > 0) {
        dospemClash = regsOnSlot.some(r => 
          (r.dospem1 && (r.dospem1 === dospem1Param || r.dospem1 === dospem2Param)) ||
          (r.dospem2 && (r.dospem2 === dospem1Param || r.dospem2 === dospem2Param))
        );
      }

      let blocked = false;
      let blockedReason = "";
      let blockedKelas = "";

      if (pendingClassRegs.length > 0) {
        // Slot sudah terisi, kelas belum terbentuk
        blocked = true;
        blockedKelas = (() => {
          // Check how many classes exist for this periode to guess next class letter
          const existingClassCount = formedClasses.length;
          const nextLetter = String.fromCharCode(65 + existingClassCount);
          return nextLetter;
        })();
        blockedReason = `Slot sudah diambil, menunggu Kelas ${blockedKelas} terbentuk`;
      } else if (dospemClash) {
        blocked = true;
        blockedReason = "Dosen Pembimbing Anda sudah terjadwal di jam ini";
      }

      availableSlots.push({
        id: s.id,
        isoDate,
        date: dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        hari: dateObj.toLocaleDateString('id-ID', { weekday: 'long' }),
        time,
        available: !blocked,
        blocked,
        blockedReason,
      });
    }

    return NextResponse.json({ availableSlots }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
