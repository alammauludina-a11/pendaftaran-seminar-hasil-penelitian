import { NextResponse } from "next/server";
import { db } from "@/db";
import { pendaftaran, periode, slotWaktu, kelasSeminar, moderator, users, files } from "@/db/schema";
import { isValidSlotTime } from "@/lib/slot-rules";
import { eq, and, isNotNull, isNull, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

import crypto from "crypto";

const SLOT_TAKEN_MESSAGE = "Slot ini baru saja diambil mahasiswa lain dan sedang menunggu kelas terbentuk. Silakan pilih slot lain.";

const toIsoWIB = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" }); // YYYY-MM-DD
const todayIsoWIB = () => toIsoWIB(new Date());

/** Other active registrations of the same seminar type on the same slot time that are still waiting for a class. */
async function pendingClaimsOnSlot(waktuMulai: Date, jenisSeminar: string, ownId: number) {
  return db
    .select({ id: pendaftaran.id })
    .from(pendaftaran)
    .innerJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
    .where(
      and(
        eq(slotWaktu.waktuMulai, waktuMulai),
        eq(pendaftaran.jenisSeminar, jenisSeminar as "kolokium" | "hasil_penelitian"),
        ne(pendaftaran.statusVerifikasi, "ditolak"),
        isNull(pendaftaran.kelasSeminarId),
        ne(pendaftaran.id, ownId)
      )
    );
}

/**
 * Server-side slot rules, identical for kolokium & hasil_penelitian and matching /api/mahasiswa/slot:
 * valid time (no Sunday, no 12:00, 08-16 WIB), not in the past, inside the periode dates,
 * no pending class of the same seminar type on that time, no dospem/moderator clash.
 */
async function validateSlot(opts: {
  slotId: number;
  jenisSeminar: string;
  periode: { startDate: string | null; endDate: string | null };
  dospem1: string;
  dospem2: string;
  excludePendaftaranId?: number;
}): Promise<{ waktuMulai: Date } | { error: string; status: number }> {
  const slotRecord = await db.select().from(slotWaktu).where(eq(slotWaktu.id, opts.slotId)).limit(1);
  if (slotRecord.length === 0) {
    return { error: "Slot jadwal tidak ditemukan.", status: 404 };
  }
  const waktuMulai = slotRecord[0].waktuMulai;

  if (!isValidSlotTime(waktuMulai)) {
    return { error: "Slot jadwal tidak valid (hari Minggu dan jam 12.00 tidak tersedia).", status: 400 };
  }
  if (new Date(waktuMulai).getTime() <= Date.now()) {
    return { error: "Waktu slot jadwal sudah lewat. Silakan pilih slot lain.", status: 400 };
  }
  const slotIso = toIsoWIB(new Date(waktuMulai));
  const { startDate, endDate } = opts.periode;
  if ((startDate && slotIso < startDate) || (endDate && slotIso > endDate)) {
    return { error: "Slot jadwal berada di luar rentang tanggal periode seminar.", status: 400 };
  }

  // All active registrations on this slot time (matched by time, not slot id: slot_waktu may contain duplicate rows)
  const dosenUsers = alias(users, "dosenUsers");
  const activeOnSlot = await db
    .select({
      id: pendaftaran.id,
      kelasSeminarId: pendaftaran.kelasSeminarId,
      dospem1: pendaftaran.dospem1,
      dospem2: pendaftaran.dospem2,
      jenisSeminar: pendaftaran.jenisSeminar,
      moderatorName: dosenUsers.nama,
    })
    .from(pendaftaran)
    .innerJoin(slotWaktu, eq(pendaftaran.slotWaktuId, slotWaktu.id))
    .leftJoin(moderator, eq(pendaftaran.id, moderator.pendaftaranId))
    .leftJoin(dosenUsers, eq(moderator.dosenId, dosenUsers.id))
    .where(
      and(
        eq(slotWaktu.waktuMulai, waktuMulai),
        ne(pendaftaran.statusVerifikasi, "ditolak"),
        opts.excludePendaftaranId ? ne(pendaftaran.id, opts.excludePendaftaranId) : undefined
      )
    );

  // Pending class is checked per seminar type
  if (activeOnSlot.some(r => r.jenisSeminar === opts.jenisSeminar && r.kelasSeminarId === null)) {
    return { error: "Slot ini belum bisa dipilih karena pendaftar sebelumnya masih menunggu kelas terbentuk.", status: 409 };
  }

  // Dospem / moderator clash is checked across ALL seminar types (a lecturer can't be in two places at once)
  const mine = [opts.dospem1, opts.dospem2].filter(Boolean);
  const clash = activeOnSlot.some(r =>
    [r.dospem1, r.dospem2, r.moderatorName].some(name => name && mine.includes(name))
  );
  if (clash) {
    return { error: "Dosen Pembimbing Anda sudah terjadwal di slot jam yang sama pada kelas lain. Pilih jadwal lain.", status: 409 };
  }

  return { waktuMulai };
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mhsId = session.user.id;
    const formData = await request.formData();
    
    const judul_penelitian = ((formData.get("judul_penelitian") as string) || "").trim();
    const konsentrasi_penelitian = ((formData.get("konsentrasi_penelitian") as string) || "").trim();
    const dospem1_nama = ((formData.get("dospem1_nama") as string) || "").trim();
    const dospem2_nama = ((formData.get("dospem2_nama") as string) || "").trim();
    const tanggal_kolokium = formData.get("tanggal_seminar") as string || "";
    const jenisSeminar = formData.get("jenisSeminar") as string || "hasil_penelitian";
    const periodeId = formData.get("periodeId") ? parseInt(formData.get("periodeId") as string) : null;
    const slot_id = formData.get("slot_id") ? parseInt(formData.get("slot_id") as string) : null;

    // Required fields (same rules as the form; the server must not rely on the browser alone)
    if (jenisSeminar !== "kolokium" && jenisSeminar !== "hasil_penelitian") {
      return NextResponse.json({ error: "Jenis seminar tidak valid." }, { status: 400 });
    }
    if (!judul_penelitian) {
      return NextResponse.json({ error: "Judul penelitian wajib diisi." }, { status: 400 });
    }
    if (jenisSeminar === "hasil_penelitian" && !konsentrasi_penelitian) {
      return NextResponse.json({ error: "Konsentrasi penelitian wajib dipilih." }, { status: 400 });
    }
    if (!dospem1_nama) {
      return NextResponse.json({ error: "Dosen Pembimbing 1 wajib dipilih." }, { status: 400 });
    }
    if (dospem2_nama && dospem2_nama === dospem1_nama) {
      return NextResponse.json({ error: "Dosen Pembimbing 1 dan 2 tidak boleh orang yang sama." }, { status: 400 });
    }
    if (!slot_id || isNaN(slot_id)) {
      return NextResponse.json({ error: "Slot jadwal wajib dipilih." }, { status: 400 });
    }
    const dosenNames = new Set(
      (await db.select({ nama: users.nama }).from(users).where(eq(users.role, "dosen"))).map(d => d.nama)
    );
    if (!dosenNames.has(dospem1_nama) || (dospem2_nama && !dosenNames.has(dospem2_nama))) {
      return NextResponse.json({ error: "Dosen pembimbing tidak ditemukan di data dosen." }, { status: 400 });
    }

    // File validation (files are only stored after all checks pass, so a rejected submit leaves no orphan files)
    const fileKolokiumInput = formData.get("file-kolokium") as File | null;
    const fileDospemInput = formData.get("file-dospem") as File | null;
    const fileKolokium = fileKolokiumInput && fileKolokiumInput.size > 0 ? fileKolokiumInput : null;
    const fileDospem = fileDospemInput && fileDospemInput.size > 0 ? fileDospemInput : null;

    for (const [file, label] of [[fileKolokium, "Bukti Forum Kolokium"], [fileDospem, "Persetujuan Dosen Pembimbing"]] as const) {
      if (!file) continue;
      if (file.size > 500 * 1024) {
        return NextResponse.json({ error: `Ukuran file ${label} melebihi 500 KB.` }, { status: 400 });
      }
      if (file.type !== "application/pdf") {
        return NextResponse.json({ error: `File ${label} harus berformat PDF.` }, { status: 400 });
      }
    }

    const storeFile = async (file: File) => {
      const fileId = crypto.randomUUID();
      await db.insert(files).values({
        id: fileId,
        name: file.name,
        mimeType: "application/pdf",
        data: Buffer.from(await file.arrayBuffer()).toString("base64"),
      });
      return `/api/files/${fileId}`;
    };

    // Check if period is active
    const periodeIdToUse = periodeId || null;
    let p = null;
    if (periodeIdToUse) {
      const periodeResult = await db.select().from(periode).where(eq(periode.id, periodeIdToUse));
      if (periodeResult.length > 0) p = periodeResult[0];
    } else {
      const openPeriodes = await db.select().from(periode).where(and(
        eq(periode.isOpen, true),
        eq(periode.jenisSeminar, jenisSeminar as "kolokium" | "hasil_penelitian")
      ));
      if (openPeriodes.length > 0) p = openPeriodes[0];
    }

    if (!p || !p.isOpen) {
      return NextResponse.json({ error: "Periode pendaftaran tidak aktif atau tidak ditemukan." }, { status: 400 });
    }

    // The periode must belong to the seminar type being registered
    if (p.jenisSeminar !== jenisSeminar) {
      return NextResponse.json({ error: "Periode yang dipilih tidak sesuai dengan jenis seminar." }, { status: 400 });
    }

    // Registration is only allowed up to and including Batas Pendaftaran (WIB)
    if (p.registrationEndDate && todayIsoWIB() > p.registrationEndDate) {
      return NextResponse.json({ error: "Batas pendaftaran untuk periode ini sudah lewat." }, { status: 400 });
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
      // Prefer waktuMulai (most accurate), then kelasDate (YYYY-MM-DD), then stored tanggalKolokium
      if (kolokium.waktuMulai) {
        const d = new Date(kolokium.waktuMulai);
        const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        finalTanggalKolokium = `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
      } else if (kolokium.kelasDate) {
        // kelasDate is YYYY-MM-DD — parse safely without timezone issues
        const parts = kolokium.kelasDate.split("-");
        if (parts.length === 3) {
          const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
          finalTanggalKolokium = `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
        } else {
          finalTanggalKolokium = kolokium.kelasDate;
        }
      } else {
        finalTanggalKolokium = kolokium.tanggalKolokiumInput || "-";
      }
    }

    // Check if already registered in this period
    const existing = await db
      .select()
      .from(pendaftaran)
      .where(eq(pendaftaran.userId, mhsId));

    const alreadyInPeriode = existing.find(e => e.periodeId === p!.id);
    if (alreadyInPeriode && alreadyInPeriode.statusVerifikasi !== "ditolak") {
      return NextResponse.json({ error: "Anda sudah mendaftar pada periode ini." }, { status: 409 });
    }

    // PARALLEL SLOT LOGIC (same rules for kolokium & hasil_penelitian)
    let slotWaktuMulai: Date | null = null;
    if (slot_id) {
      const slotCheck = await validateSlot({
        slotId: slot_id,
        jenisSeminar,
        periode: p,
        dospem1: dospem1_nama,
        dospem2: dospem2_nama,
        excludePendaftaranId: alreadyInPeriode?.id,
      });
      if ("error" in slotCheck) {
        return NextResponse.json({ error: slotCheck.error }, { status: slotCheck.status });
      }
      slotWaktuMulai = slotCheck.waktuMulai;
    }

    // Required files: on re-registration the previously uploaded file may be kept
    if (!fileDospem && !alreadyInPeriode?.fileApprovalDospem) {
      return NextResponse.json({ error: "File Persetujuan Dosen Pembimbing wajib diunggah." }, { status: 400 });
    }
    if (jenisSeminar === "hasil_penelitian" && !fileKolokium && !alreadyInPeriode?.fileBuktiKolokium) {
      return NextResponse.json({ error: "File Bukti Forum Kolokium wajib diunggah." }, { status: 400 });
    }

    const fileBuktiKolokiumUrl = fileKolokium ? await storeFile(fileKolokium) : null;
    const fileApprovalDospemUrl = fileDospem ? await storeFile(fileDospem) : null;

    if (alreadyInPeriode) {
      // Re-registration after rejection
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

      // Guard against simultaneous submits: if someone else claimed this slot time in the meantime, roll back.
      if (slotWaktuMulai) {
        const others = await pendingClaimsOnSlot(slotWaktuMulai, jenisSeminar, alreadyInPeriode.id);
        if (others.length > 0) {
          await db
            .update(pendaftaran)
            .set({
              judulPenelitian: alreadyInPeriode.judulPenelitian,
              konsentrasi: alreadyInPeriode.konsentrasi,
              dospem1: alreadyInPeriode.dospem1,
              dospem2: alreadyInPeriode.dospem2,
              tanggalKolokium: alreadyInPeriode.tanggalKolokium,
              slotWaktuId: alreadyInPeriode.slotWaktuId,
              fileBuktiKolokium: alreadyInPeriode.fileBuktiKolokium,
              fileApprovalDospem: alreadyInPeriode.fileApprovalDospem,
              statusVerifikasi: alreadyInPeriode.statusVerifikasi,
              catatanAdmin: alreadyInPeriode.catatanAdmin,
              jenisSeminar: alreadyInPeriode.jenisSeminar,
            })
            .where(eq(pendaftaran.id, alreadyInPeriode.id));
          return NextResponse.json({ error: SLOT_TAKEN_MESSAGE }, { status: 409 });
        }
      }

      return NextResponse.json({
        message: "Pendaftaran berhasil disubmit ulang.",
        data: result[0],
      }, { status: 200 });
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

    // Guard against simultaneous submits: the earliest registration (lowest id) keeps the slot,
    // any later one on the same slot time is removed again.
    if (slotWaktuMulai) {
      const others = await pendingClaimsOnSlot(slotWaktuMulai, jenisSeminar, result[0].id);
      if (others.some(o => o.id < result[0].id)) {
        await db.delete(pendaftaran).where(eq(pendaftaran.id, result[0].id));
        return NextResponse.json({ error: SLOT_TAKEN_MESSAGE }, { status: 409 });
      }
    }

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
