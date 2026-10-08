import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { setujuiPengajuanRuangan } from "@/lib/ruangan";
import { catatAktivitas } from "@/lib/audit";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await request.json();
    const { action } = body;

    if (action === "approve") {
      const hasil = await setujuiPengajuanRuangan(id, { konfirmasiFinal: body.konfirmasiFinal === true });

      if (hasil.status === "gagal") {
        return NextResponse.json({ error: hasil.error }, { status: hasil.httpStatus });
      }
      if (hasil.status === "perlu_konfirmasi") {
        // The admin UI asks for confirmation and retries with konfirmasiFinal: true
        return NextResponse.json({
          error: "Jadwal ini sudah difinalisasi. Konfirmasi diperlukan untuk mengubah ruangan.",
          perluKonfirmasi: true,
          dari: hasil.dari,
          ke: hasil.ke,
          dirilis: hasil.dirilis,
        }, { status: 409 });
      }

      catatAktivitas(hasil.setelahFinal
        ? {
            kategori: "jadwal",
            aksi: "ruangan.ubah_setelah_final",
            deskripsi: `Mengubah ruangan jadwal FINAL {mahasiswa} dari "${hasil.dari ?? "-"}" menjadi "${hasil.ke}"`,
            targetTipe: "pendaftaran",
            targetId: id,
            pendaftaranIds: [id],
            detail: { dari: hasil.dari, ke: hasil.ke, dirilis: hasil.data.isReleased },
          }
        : {
            kategori: "jadwal",
            aksi: "ruangan.disetujui",
            deskripsi: `Menyetujui ruangan "${hasil.ke}" untuk {mahasiswa}`,
            targetTipe: "pendaftaran",
            targetId: id,
            pendaftaranIds: [id],
          });

      return NextResponse.json({
        message: hasil.setelahFinal ? "Ruangan jadwal final diubah" : "Ruangan disetujui",
        data: hasil.data
      }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Gagal memproses permintaan." },
      { status: 500 }
    );
  }
}
