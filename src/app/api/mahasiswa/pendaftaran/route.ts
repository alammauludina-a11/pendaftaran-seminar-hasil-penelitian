import { NextResponse } from "next/server";
import { db } from "@/db";
import { pendaftaran, periode, slotWaktu, kelasSeminar } from "@/db/schema";
import { eq, and, isNotNull, ne } from "drizzle-orm";
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
      if (fileKolokium.size > 500 * 1024) {
        return NextResponse.json({ error: "Ukuran file Bukti Forum Kolokium melebihi 500 KB." }, { status: 400 });
      }
      if (fileKolokium.type !== "application/pdf") {
        return NextResponse.json({ error: "File Bukti Forum Kolokium harus berformat PDF." }, { status: 400 });
      }
      const buffer = Buffer.from(await fileKolokium.arrayBuffer());
      const base64Data = buffer.toString("base64");
      const fileId = crypto.randomUUID();
      
      await db.insert(require("@/db/schema").files).values({
        id: fileId,
        name: fileKolokium.name,
        mimeType: "application/pdf",
        data: base64Data,
      });
      
      fileBuktiKolokiumUrl = `/api/files/${fileId}`;
    }
    
    const fileDospem = formData.get("file-dospem") as File | null;
    if (fileDospem && fileDospem.size > 0) {
      if (fileDospem.size > 500 * 1024) {
        return NextResponse.json({ error: "Ukuran file Persetujuan Dosen Pembimbing melebihi 500 KB." }, { status: 400 });
      }
      if (fileDospem.type !== "application/pdf") {
        return NextResponse.json({ error: "File Persetujuan Dosen Pembimbing harus berformat PDF." }, { status: 400 });
      }
      const buffer = Buffer.from(await fileDospem.arrayBuffer());
      const base64Data = buffer.toString("base64");
      const fileId = crypto.randomUUID();
      
      await db.insert(require("@/db/schema").files).values({
        id: fileId,
        name: fileDospem.name,
        mimeType: "application/pdf",
        data: base64Data,
      });
      
      fileApprovalDospemUrl = `/api/files/${fileId}`;
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
          kelasDate: kelasSeminar.date,
          waktuMulai: slotWaktu.waktuMulai,
          waktuSelesai: slotWaktu.waktuSelesai
        })
        .from(pendaftaran)
        .leftJoin(kelasSeminar, eq(pendaftaran.kelasSeminarId, kelasSeminar.id))
        .leftJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
        .where(
          and(
            eq(pendaftaran.userId, mhsId),
            eq(pendaftaran.jenisSeminar, "kolokium"),
            eq(pendaftaran.statusVerifikasi, "disetujui")
          )
        );
      
      
      let isKolokiumSelesai = false;
      if (riwayatKolokium.length > 0) {
        const k = riwayatKolokium[0];
        if (k.waktuSelesai) {
           isKolokiumSelesai = new Date(k.waktuSelesai) < new Date();
        } else if (k.waktuMulai) {
           isKolokiumSelesai = new Date(k.waktuMulai) < new Date();
        } else if (k.tanggalKolokiumInput || k.kelasDate) {
           isKolokiumSelesai = true; 
        }
      }

      if (!isKolokiumSelesai) {
        return NextResponse.json({ error: "Anda tidak bisa mengajukan jadwal Seminar Hasil Penelitian karena belum menyelesaikan tahapan Seminar Kolokium." }, { status: 403 });
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
        // NEW PARALLEL SLOT LOGIC for re-registration
        if (slot_id) {
          const activeOnSlot = await db
            .select({
              id: pendaftaran.id,
              kelasSeminarId: pendaftaran.kelasSeminarId,
              dospem1: pendaftaran.dospem1,
              dospem2: pendaftaran.dospem2,
            })
            .from(pendaftaran)
            .where(
              and(
                eq(pendaftaran.slotWaktuId, slot_id),
                ne(pendaftaran.statusVerifikasi, 'ditolak'),
                ne(pendaftaran.id, alreadyInPeriode.id)
              )
            );

          const pendingClass = activeOnSlot.some(r => r.kelasSeminarId === null);
          if (pendingClass) {
            return NextResponse.json({ error: "Slot ini belum bisa dipilih karena pendaftar sebelumnya masih menunggu kelas terbentuk." }, { status: 409 });
          }

          const dospemClash = activeOnSlot.some(r =>
            (r.dospem1 && (r.dospem1 === dospem1_nama || r.dospem1 === dospem2_nama)) ||
            (r.dospem2 && (r.dospem2 === dospem1_nama || r.dospem2 === dospem2_nama))
          );
          if (dospemClash) {
            return NextResponse.json({ error: "Dosen Pembimbing Anda sudah terjadwal di slot jam yang sama pada kelas lain. Pilih jadwal lain." }, { status: 409 });
          }
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

        return NextResponse.json({
          message: "Pendaftaran berhasil disubmit ulang.",
          data: result[0],
        }, { status: 200 });
      } else {
        return NextResponse.json({ error: "Anda sudah mendaftar pada periode ini." }, { status: 409 });
      }
    }

    // NEW PARALLEL SLOT LOGIC
    // Rule: A slot can be taken by multiple students IF the previous class has been formed.
    // Rule: Dospem cannot clash on the same slot.
    if (slot_id) {
      const slotRecord = await db.select().from(slotWaktu).where(eq(slotWaktu.id, slot_id)).limit(1);
      if (slotRecord.length === 0) {
        return NextResponse.json({ error: "Slot jadwal tidak ditemukan." }, { status: 404 });
      }

      // Get all active registrations on this slot
      const activeOnSlot = await db
        .select({
          id: pendaftaran.id,
          kelasSeminarId: pendaftaran.kelasSeminarId,
          dospem1: pendaftaran.dospem1,
          dospem2: pendaftaran.dospem2,
        })
        .from(pendaftaran)
        .where(
          and(
            eq(pendaftaran.slotWaktuId, slot_id),
            ne(pendaftaran.statusVerifikasi, 'ditolak')
          )
        );

      // Check: Is there anyone on this slot who doesn't have a class yet?
      const pendingClass = activeOnSlot.some(r => r.kelasSeminarId === null);
      if (pendingClass) {
        return NextResponse.json({ error: "Slot ini belum bisa dipilih karena pendaftar sebelumnya masih menunggu kelas terbentuk." }, { status: 409 });
      }

      // Check: Dospem clash
      const mhsDospem1 = dospem1_nama;
      const mhsDospem2 = dospem2_nama;
      const dospemClash = activeOnSlot.some(r =>
        (r.dospem1 && (r.dospem1 === mhsDospem1 || r.dospem1 === mhsDospem2)) ||
        (r.dospem2 && (r.dospem2 === mhsDospem1 || r.dospem2 === mhsDospem2))
      );
      if (dospemClash) {
        return NextResponse.json({ error: "Dosen Pembimbing Anda sudah terjadwal di slot jam yang sama pada kelas lain. Pilih jadwal lain." }, { status: 409 });
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

    // NOTE: We no longer mark slot as tersedia=false because parallel booking is now allowed.
    // Slot availability is determined dynamically by the /api/mahasiswa/slot endpoint.

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
