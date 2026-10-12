import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { pendaftaran, slotWaktu, kelasSeminar } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { ambilPendaftaranAdmin } from "@/lib/admin-pendaftaran";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const data = await ambilPendaftaranAdmin();

    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const monthsShort = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

    // For hasil_penelitian rows, look up the real kolokium date from the student's approved kolokium slot
    const hasilUserIds = [...new Set(
      data.filter(r => r.jenisSeminar === "hasil_penelitian" && r.userId).map(r => r.userId)
    )];

    // Fetch all approved kolokium rows for these users in a single query (avoid N+1 round-trips to Turso)
    const kolokiumByUser = new Map<string, { waktuMulai: Date | null; kelasDate: string | null; tanggalKolokiumInput: string | null }>();
    if (hasilUserIds.length > 0) {
      const kolokiumRows = await db.select({
        userId: pendaftaran.userId,
        waktuMulai: slotWaktu.waktuMulai,
        kelasDate: kelasSeminar.date,
        tanggalKolokiumInput: pendaftaran.tanggalKolokium,
      })
      .from(pendaftaran)
      .leftJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
      .leftJoin(kelasSeminar, eq(pendaftaran.kelasSeminarId, kelasSeminar.id))
      .where(and(
        inArray(pendaftaran.userId, hasilUserIds),
        eq(pendaftaran.jenisSeminar, "kolokium"),
        eq(pendaftaran.statusVerifikasi, "disetujui")
      ));
      for (const row of kolokiumRows) {
        if (!kolokiumByUser.has(row.userId)) kolokiumByUser.set(row.userId, row);
      }
    }

    const kolokiumDateMap: Record<string, string> = {};
    for (const userId of hasilUserIds) {
      const k = kolokiumByUser.get(userId);
      if (k) {
        if (k.waktuMulai) {
          const d = new Date(k.waktuMulai);
          kolokiumDateMap[userId] = `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
        } else if (k.kelasDate) {
          const parts = k.kelasDate.split("-");
          if (parts.length === 3) {
            kolokiumDateMap[userId] = `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
          } else {
            kolokiumDateMap[userId] = k.kelasDate;
          }
        } else if (k.tanggalKolokiumInput && k.tanggalKolokiumInput !== "Invalid Date") {
          kolokiumDateMap[userId] = k.tanggalKolokiumInput;
        }
      }
    }

    // Format date and time + resolve tanggal kolokium
    const formattedData = data.map(item => {
      let date = "-";
      let time = "-";
      if (item.waktuMulai && item.waktuSelesai) {
        const d = new Date(item.waktuMulai);
        const endD = new Date(item.waktuSelesai);
        const day = d.getDate().toString().padStart(2, '0');
        const month = monthsShort[d.getMonth()];
        const year = d.getFullYear();
        date = `${day} ${month} ${year}`;
        
        const timeFormatter = new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        const startTimeStr = timeFormatter.format(d).replace('.', ':');
        const endTimeStr = timeFormatter.format(endD).replace('.', ':');
        time = `${startTimeStr} - ${endTimeStr}`;
      }

      // Resolve tanggal kolokium from actual kolokium registration (for hasil_penelitian)
      let resolvedTanggalKolokium = item.tanggalKolokium;
      if (item.jenisSeminar === "hasil_penelitian" && item.userId && kolokiumDateMap[item.userId]) {
        resolvedTanggalKolokium = kolokiumDateMap[item.userId];
      }
      if (!resolvedTanggalKolokium || resolvedTanggalKolokium === "Invalid Date") {
        resolvedTanggalKolokium = "-";
      }

      return {
        ...item,
        date,
        time,
        tanggalKolokium: resolvedTanggalKolokium,
      };
    });

    return NextResponse.json({ pendaftaran: formattedData }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch pendaftaran" }, { status: 500 });
  }
}
