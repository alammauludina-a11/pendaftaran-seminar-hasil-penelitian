import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "./index";
import { users, periode, slotWaktu, pendaftaran } from "./schema";

async function seed() {
  console.log("Seeding database...");

  const { auth } = await import("../lib/auth");

  console.log("Cleaning old dummy data...");
  await db.delete(pendaftaran);
  await db.delete(slotWaktu);
  await db.delete(periode);
  await db.delete(users);
  
  try {
    const { account, session } = await import("./schema");
    await db.delete(account);
    await db.delete(session);
  } catch (e) {}


  // Helper to safely create users and ignore if they exist
  async function seedUser(data: any) {
    try {
      const res = await auth.api.signUpEmail({ body: data });
      return res.user.id;
    } catch (e) {
      console.log(`User ${data.email} might already exist or error:`);
      console.error(e);
      const { eq } = await import("drizzle-orm");
      const existing = await db.query.users.findFirst({ where: eq(users.email, data.email) });
      return existing?.id;
    }
  }

  const adminId = await seedUser({
    email: "admin@ipb.ac.id",
    username: "admin",
    password: "password123",
    name: "Administrator",
    role: "admin",
    nama: "Administrator",
    nipNim: "ADMIN001",
    prodi: "",
    statusAktif: "",
    jabatan: ""
  });

  const dosen1Id = await seedUser({
    email: "irma@ipb.ac.id",
    username: "irma",
    password: "password123",
    name: "Dr. Irma, M.Si",
    role: "dosen",
    nama: "Dr. Irma, M.Si",
    nipNim: "198001012005011001",
    prodi: "Informatika",
    jabatan: "Lektor Kepala"
  });

  const dosen2Id = await seedUser({
    email: "andi@ipb.ac.id",
    username: "andi",
    password: "password123",
    name: "Dr. Andi Setiawan, M.Kom",
    role: "dosen",
    nama: "Dr. Andi Setiawan, M.Kom",
    nipNim: "198202022006021002",
    prodi: "Informatika",
    jabatan: "Lektor"
  });

  const mhs1Id = await seedUser({
    email: "siti@apps.ipb.ac.id",
    username: "siti",
    password: "password123",
    name: "Siti Rahmawati",
    role: "mahasiswa",
    nama: "Siti Rahmawati",
    nipNim: "J3C119001",
    prodi: "Informatika",
    statusAktif: "Aktif"
  });

  const mhs2Id = await seedUser({
    email: "budi@apps.ipb.ac.id",
    username: "budi",
    password: "password123",
    name: "Budi Santoso",
    role: "mahasiswa",
    nama: "Budi Santoso",
    nipNim: "J3C119002",
    prodi: "Informatika",
    statusAktif: "Aktif"
  });

  console.log("Seeded Users");

  // Seed Periode
  const p1Id = 1;
  const p2Id = 2;
  await db.insert(periode).values([
    {
      id: p1Id,
      angkatan: "AKN 60",
      startDate: "2026-10-01",
      endDate: "2026-11-30",
      registrationEndDate: "2026-10-14",
      isOpen: true,
      batasKelas: 10,
      isDraft: false,
    },
    {
      id: p2Id,
      angkatan: "AKN 59",
      startDate: "2026-03-01",
      endDate: "2026-04-30",
      registrationEndDate: "2026-03-14",
      isOpen: false,
      batasKelas: 15,
      isDraft: false,
    },
  ]);

  console.log("Seeded Periode");

  // Seed Slot Waktu
  const slotsToInsert = [];
  let slotIdCounter = 1;
  const dates = ["2026-10-25", "2026-10-26", "2026-10-27"];
  
  for (const date of dates) {
    for (let hour = 8; hour <= 16; hour++) {
      const hourStr = hour.toString().padStart(2, '0');
      const startIso = `${date}T${hourStr}:00:00+07:00`;
      const endIso = `${date}T${hourStr}:50:00+07:00`;
      
      // Entry 1
      slotsToInsert.push({
        id: slotIdCounter++,

        waktuMulai: new Date(startIso),
        waktuSelesai: new Date(endIso),
        tersedia: true,
      });

      // Entry 2
      slotsToInsert.push({
        id: slotIdCounter++,

        waktuMulai: new Date(startIso),
        waktuSelesai: new Date(endIso),
        tersedia: true,
      });
    }
  }

  await db.insert(slotWaktu).values(slotsToInsert);

  console.log("Seeded Slot Waktu");

  // Seed Pendaftaran
  await db.insert(pendaftaran).values([
    {
      userId: mhs1Id as string,
      periodeId: p1Id,
      judulPenelitian: "Sistem Pakar Diagnosa Penyakit Tanaman",
      konsentrasi: "Rekayasa Perangkat Lunak",
      dospem1: "Dr. Irma, M.Si",
      dospem2: "",
      statusVerifikasi: "menunggu",
    },
    {
      userId: mhs2Id as string,
      periodeId: p1Id,
      judulPenelitian: "Analisis Sentimen Pengguna Twitter terhadap Pemilu",
      konsentrasi: "Kecerdasan Buatan",
      dospem1: "Dr. Andi Setiawan, M.Kom",
      dospem2: "",
      statusVerifikasi: "disetujui",
      catatanAdmin: "Berkas lengkap",
      ruanganDisetujui: "Ruang Sidang 1",
      pembahas: "Dr. Irma, M.Si",
      isFinalized: true,
      isReleased: false,
    },
  ]);

  console.log("Seeded Pendaftaran");

  console.log("Seeding complete!");
}

seed()
  .catch((e) => {
    console.error("Seeding failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
