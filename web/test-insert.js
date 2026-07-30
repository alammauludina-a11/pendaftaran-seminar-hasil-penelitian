const { db } = require('./src/db/index.js');
const { users } = require('./src/db/schema.js');

async function main() {
  try {
    const newUser = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        email: "test@student.ipb.ac.id",
        role: "mahasiswa",
        name: "Test User",
        nama: "Test User",
        nipNim: "999999",
        angkatan: "60",
        prodi: "Akuntansi",
        statusAktif: "Aktif",
        emailVerified: false,
      })
      .returning();
    console.log("Success:", newUser);
  } catch (e) {
    console.error("DB Error:", e);
  }
}

main();
