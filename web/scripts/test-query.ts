import { db } from "../src/db";
import { session } from "../src/db/schema";
import { sql } from "drizzle-orm";

async function main() {
    const s = await db.select({ raw: session.createdAt, max: sql`MAX(${session.createdAt})` }).from(session).limit(1);
    console.log("Session date info:", s);
}
main();
