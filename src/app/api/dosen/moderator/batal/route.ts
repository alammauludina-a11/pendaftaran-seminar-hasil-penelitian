import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { pengajuanBatalModerasi } from "@/lib/moderasi";

// POST: Dosen mengajukan batal moderasi (action "ajukan", alasan wajib) atau menarik pengajuannya ("batalkan_pengajuan")
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "dosen") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const hasil = await pengajuanBatalModerasi({
      pendaftaranId: body?.pendaftaranId,
      dosenId: session.user.id,
      action: body?.action,
      reason: body?.reason,
    });
    if ("error" in hasil) {
      return NextResponse.json({ error: hasil.error }, { status: hasil.status });
    }
    return NextResponse.json({ message: hasil.message }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal memproses pengajuan" }, { status: 500 });
  }
}
