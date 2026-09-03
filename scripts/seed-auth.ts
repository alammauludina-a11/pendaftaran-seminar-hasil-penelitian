import { auth } from "../src/lib/auth";
import { headers } from "next/headers";

async function seedAuth() {
    console.log("Seeding Better Auth Users...");

    try {
        await auth.api.signUpEmail({
            body: {
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
            }
        });
        console.log("Admin seeded.");
    } catch (e) {
        console.log("Admin might already exist or error occurred:", e);
    }

    try {
        await auth.api.signUpEmail({
            body: {
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
            }
        });
        console.log("Mahasiswa seeded.");
    } catch (e) {
        console.log("Mahasiswa might already exist or error occurred:", e);
    }
}

seedAuth().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
