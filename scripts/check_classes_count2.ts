import { db } from "../src/db";
import { kelasSeminar, pendaftaran } from "../src/db/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
  const data = await db.select().from(kelasSeminar);
  const pendaftaranData = await db.select().from(pendaftaran);
  
  const result = data.map(k => {
    const students = pendaftaranData.filter(p => p.kelasSeminarId === k.id);
    return {
      id: k.id,
      namaKelas: k.namaKelas,
      studentCount: students.length,
      students: students.map(s => s.judulPenelitian) // just to see something
    }
  });
  
  console.log("Classes with student count:");
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
