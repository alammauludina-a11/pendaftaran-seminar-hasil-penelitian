import { db } from "../src/db";
import { kelasSeminar, pendaftaran } from "../src/db/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
  const classes = await db.select({
    id: kelasSeminar.id,
    namaKelas: kelasSeminar.namaKelas,
    studentCount: sql<number>`(SELECT COUNT(*) FROM ${pendaftaran} WHERE ${pendaftaran.kelasSeminarId} = ${kelasSeminar.id})`
  }).from(kelasSeminar);
  
  console.log("Classes with student count:");
  console.log(JSON.stringify(classes, null, 2));
}

main().catch(console.error);
