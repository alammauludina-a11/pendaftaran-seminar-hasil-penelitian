import { config } from "dotenv";
config({ path: ".env.local" });
import { db } from "./src/db/index";
import { users, account } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function check() {
  const admin = await db.query.users.findFirst({
    where: eq(users.username, "admin")
  });
  console.log("Admin user:", admin);

  if (admin) {
    const acc = await db.query.account.findFirst({
      where: eq(account.userId, admin.id)
    });
    console.log("Admin account:", acc);
  }
}
check().catch(console.error).finally(() => process.exit(0));
