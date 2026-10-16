import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { catatAktivitas } from "@/lib/audit";
import { responBatalModerasi } from "@/lib/moderasi";

// POST: Admin merespon pengajuan batal moderasi
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idStr } = await params;
    const pendaftaranId = parseInt(idStr);
    const body = await request.json();
    const action = body?.action; // "setujui" | "tolak"

    const hasil = await responBatalModerasi({ pendaftaranId, action });
    if ("error" in hasil) {
      return NextResponse.json({ error: hasil.error }, { status: hasil.status });
    }

    catatAktivitas(action === "setujui"
      ? {
          kategori: "jadwal",
          aksi: "moderator.batal_disetujui",
          deskripsi: `Menyetujui pengajuan batal moderator untuk {mahasiswa}${hasil.batalReason ? ` (alasan: "${hasil.batalReason}")` : ""}`,
          targetTipe: "pendaftaran",
          targetId: pendaftaranId,
          pendaftaranIds: [pendaftaranId],
          detail: { alasan: hasil.batalReason },
        }
      : {
          kategori: "jadwal",
          aksi: "moderator.batal_ditolak",
          deskripsi: "Menolak pengajuan batal moderator untuk {mahasiswa}",
          targetTipe: "pendaftaran",
          targetId: pendaftaranId,
          pendaftaranIds: [pendaftaranId],
          detail: { alasan: hasil.batalReason },
        });
    return NextResponse.json({ message: hasil.message }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal memproses pengajuan" }, { status: 500 });
  }
}
