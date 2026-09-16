import { db } from "./src/db";
import { users } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const result = await db.select().from(users).where(eq(users.role, "mahasiswa")).limit(5);
  console.log(result.map(u => ({ id: u.id, name: u.name, angkatan: u.angkatan })));
}
main();
