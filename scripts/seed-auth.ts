import { auth } from "../src/lib/auth";
import { db } from "../src/db";
import { users, account } from "../src/db/schema";

// Public sign-up is disabled and profile fields are not user-settable,
// so seed users are inserted directly with a Better Auth password hash.
async function createUser(data: { password: string; username: string } & Omit<typeof users.$inferInsert, "id">) {
    const { password, ...profile } = data;
    const id = crypto.randomUUID();
    const ctx = await auth.$context;
    await db.insert(users).values({ id, ...profile, displayUsername: profile.username });
    await db.insert(account).values({
        id: crypto.randomUUID(),
        accountId: id,
        providerId: "credential",
        userId: id,
        password: await ctx.password.hash(password),
    });
}

async function seedAuth() {
    console.log("Seeding Better Auth Users...");

    try {
        await createUser({
            email: "admin@ipb.ac.id",
            password: "password123",
            name: "Administrator",
            username: "admin",
            role: "admin",
            nama: "Administrator",
            nipNim: "ADMIN001",
            prodi: "",
            statusAktif: "",
            jabatan: ""
        });
        console.log("Admin seeded.");
    } catch (e) {
        console.log("Admin might already exist or error occurred:", e);
    }

    try {
        await createUser({
            email: "siti@apps.ipb.ac.id",
            password: "password123",
            name: "Siti Rahmawati",
            username: "mahasiswa",
            role: "mahasiswa",
            nama: "Siti Rahmawati",
            nipNim: "J3C119001",
            prodi: "Informatika",
            statusAktif: "Aktif",
            jabatan: ""
        });
        console.log("Mahasiswa seeded.");
    } catch (e) {
        console.log("Mahasiswa might already exist or error occurred:", e);
    }
}

seedAuth().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
