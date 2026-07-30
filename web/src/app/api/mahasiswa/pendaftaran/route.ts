import { NextResponse } from "next/server";
import { db } from "@/db";
import { pendaftaran, periode, slotWaktu, kelasSeminar } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

import { writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mhsId = session.user.id;
    const formData = await request.formData();
    
    const judul_penelitian = formData.get("judul_penelitian") as string;
    const konsentrasi_penelitian = formData.get("konsentrasi_penelitian") as string;
    const dospem1_nama = formData.get("dospem1_nama") as string;
    const dospem2_nama = (formData.get("dospem2_nama") as string) || "";
    const tanggal_kolokium = formData.get("tanggal_seminar") as string || "";
    const jenisSeminar = formData.get("jenisSeminar") as string || "hasil_penelitian";
    const periodeId = formData.get("periodeId") ? parseInt(formData.get("periodeId") as string) : null;
    const slot_id = formData.get("slot_id") ? parseInt(formData.get("slot_id") as string) : null;
    
    // File processing
    let fileBuktiKolokiumUrl = null;
    let fileApprovalDospemUrl = null;
    
    const fileKolokium = formData.get("file-kolokium") as File | null;
    if (fileKolokium && fileKolokium.size > 0) {
      const buffer = Buffer.from(await fileKolokium.arrayBuffer());
      const ext = path.extname(fileKolokium.name) || '.pdf';
      const filename = `kolokium_${mhsId}_${crypto.randomUUID()}${ext}`;
      await writeFile(path.join(process.cwd(), "public/uploads", filename), buffer);
      fileBuktiKolokiumUrl = `/uploads/${filename}`;
    }
    
    const fileDospem = formData.get("file-dospem") as File | null;
    if (fileDospem && fileDospem.size > 0) {
      const buffer = Buffer.from(await fileDospem.arrayBuffer());
      const ext = path.extname(fileDospem.name) || '.pdf';
      const filename = `dospem_${mhsId}_${crypto.randomUUID()}${ext}`;
      await writeFile(path.join(process.cwd(), "public/uploads", filename), buffer);
      fileApprovalDospemUrl = `/uploads/${filename}`;
    }

    // Check if period is active
    const periodeIdToUse = periodeId || null;
    let p = null;
    if (periodeIdToUse) {
      const periodeResult = await db.select().from(periode).where(eq(periode.id, periodeIdToUse));
      if (periodeResult.length > 0) p = periodeResult[0];
    } else {
      const openPeriodes = await db.select().from(periode).where(eq(periode.isOpen, true));
      if (openPeriodes.length > 0) p = openPeriodes[0];
    }

    if (!p || !p.isOpen) {
      return NextResponse.json({ error: "Periode pendaftaran tidak aktif atau tidak ditemukan." }, { status: 400 });
    }

    let finalTanggalKolokium = tanggal_kolokium;
    if (jenisSeminar === "hasil_penelitian") {
      const riwayatKolokium = await db
        .select({
          pendaftaranId: pendaftaran.id,
          tanggalKolokiumInput: pendaftaran.tanggalKolokium,
          kelasDate: kelasSeminar.date
        })
        .from(pendaftaran)
        .leftJoin(kelasSeminar, eq(pendaftaran.kelasSeminarId, kelasSeminar.id))
        .where(
          and(
            eq(pendaftaran.userId, mhsId),
            eq(pendaftaran.jenisSeminar, "kolokium"),
            eq(pendaftaran.statusVerifikasi, "disetujui")
          )
        );
      
      if (riwayatKolokium.length === 0) {
        return NextResponse.json({ error: "Anda tidak bisa mengajukan jadwal Seminar Hasil Penelitian karena belum menyelesaikan Seminar Kolokium." }, { status: 403 });
      }

      const kolokium = riwayatKolokium[0];
      finalTanggalKolokium = kolokium.kelasDate || kolokium.tanggalKolokiumInput || "-";
    }

    // Check if already registered in this period
    const existing = await db
      .select()
      .from(pendaftaran)
      .where(eq(pendaftaran.userId, mhsId));

    const alreadyInPeriode = existing.find(e => e.periodeId === p!.id);
    if (alreadyInPeriode) {
      if (alreadyInPeriode.statusVerifikasi === "ditolak") {
        // Free the old slot if it exists
        if (alreadyInPeriode.slotWaktuId) {
          await db.update(slotWaktu).set({ tersedia: true }).where(eq(slotWaktu.id, alreadyInPeriode.slotWaktuId));
        }
        
        // Update the application
        const result = await db
          .update(pendaftaran)
          .set({
            judulPenelitian: judul_penelitian,
            konsentrasi: konsentrasi_penelitian,
            dospem1: dospem1_nama,
            dospem2: dospem2_nama,
            tanggalKolokium: finalTanggalKolokium,
            slotWaktuId: slot_id || null,
            fileBuktiKolokium: fileBuktiKolokiumUrl || alreadyInPeriode.fileBuktiKolokium,
            fileApprovalDospem: fileApprovalDospemUrl || alreadyInPeriode.fileApprovalDospem,
            statusVerifikasi: "menunggu",
            catatanAdmin: null, // clear rejection note
            jenisSeminar: jenisSeminar as "kolokium" | "hasil_penelitian"
          })
          .where(eq(pendaftaran.id, alreadyInPeriode.id))
          .returning();

        // Make the new slot unavailable
        if (slot_id) {
          await db.update(slotWaktu).set({ tersedia: false }).where(eq(slotWaktu.id, slot_id));
        }
        
        return NextResponse.json({
          message: "Pendaftaran berhasil disubmit ulang.",
          data: result[0],
        }, { status: 200 });
      } else {
        return NextResponse.json({ error: "Anda sudah mendaftar pada periode ini." }, { status: 409 });
      }
    }

    const result = await db
      .insert(pendaftaran)
      .values({
        userId: mhsId,
        periodeId: p.id,
        judulPenelitian: judul_penelitian,
        konsentrasi: konsentrasi_penelitian,
        dospem1: dospem1_nama,
        dospem2: dospem2_nama,
        tanggalKolokium: finalTanggalKolokium,
        slotWaktuId: slot_id || null,
        fileBuktiKolokium: fileBuktiKolokiumUrl,
        fileApprovalDospem: fileApprovalDospemUrl,
        statusVerifikasi: "menunggu",
        jenisSeminar: jenisSeminar as "kolokium" | "hasil_penelitian",
      })
      .returning();

    // Make the slot unavailable
    if (slot_id) {
      await db
        .update(slotWaktu)
        .set({ tersedia: false })
        .where(eq(slotWaktu.id, slot_id));
    }

    return NextResponse.json({
      message: "Pendaftaran berhasil disubmit.",
      data: result[0],
    }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal memproses pendaftaran." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mhsId = session.user.id;
    const body = await request.json();
    const { action, slotId, ruanganName, pendaftaranId } = body;

    if (action === "simpan_ruangan_awal") {
      // Validate ownership
      const existing = await db
        .select()
        .from(pendaftaran)
        .where(eq(pendaftaran.id, pendaftaranId));

      if (!existing.length || existing[0].userId !== mhsId) {
        return NextResponse.json({ error: "Tidak memiliki akses ke pendaftaran ini." }, { status: 403 });
      }

      const updated = await db
        .update(pendaftaran)
        .set({
          ruanganDisetujui: ruanganName,
          statusRuangan: "disetujui",
        })
        .where(eq(pendaftaran.id, pendaftaranId))
        .returning();

      return NextResponse.json({ message: "Ruangan berhasil disimpan.", data: updated[0] }, { status: 200 });
    }

    if (action === "pengajuan_ruangan") {
      // Validate ownership
      const existing = await db
        .select()
        .from(pendaftaran)
        .where(eq(pendaftaran.id, pendaftaranId));

      if (!existing.length || existing[0].userId !== mhsId) {
        return NextResponse.json({ error: "Tidak memiliki akses ke pendaftaran ini." }, { status: 403 });
      }

      const updated = await db
        .update(pendaftaran)
        .set({
          ruanganDiajukan: ruanganName,
          statusRuangan: "menunggu",
        })
        .where(eq(pendaftaran.id, pendaftaranId))
        .returning();

      return NextResponse.json({ message: "Pengajuan ruangan berhasil.", data: updated[0] }, { status: 200 });
    }

    return NextResponse.json({ error: "Action not recognized" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal memproses pengajuan ruangan." }, { status: 500 });
  }
}
