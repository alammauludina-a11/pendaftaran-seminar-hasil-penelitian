import { db } from "../../../../db";
import { requireAdmin } from "@/lib/admin-auth";
import { users, session } from "../../../../db/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const userLogins = await db
      .select({
        id: users.id,
        nama: users.nama,
        nipNim: users.nipNim,
        role: users.role,
        lastLogin: sql<Date | null>`MAX(${session.createdAt})`,
        loginCount: sql<number>`COUNT(${session.id})`,
        history: sql<string>`json_group_array(${session.createdAt})`
      })
      .from(users)
      .leftJoin(session, eq(users.id, session.userId))
      .groupBy(users.id)
      .orderBy(sql`MAX(${session.createdAt}) DESC NULLS LAST`);

    const mappedLogins = userLogins.map(u => {
      let parsedHistory: any[] = [];
      try {
        parsedHistory = JSON.parse(u.history || "[]");
      } catch (e) {}
      
      const historyDates = parsedHistory
        .filter(t => t !== null)
        .map(t => new Date(Number(t) * (Number(t) < 1e12 ? 1000 : 1)))
        .sort((a, b) => b.getTime() - a.getTime());

      return {
        ...u,
        lastLogin: u.lastLogin ? new Date(Number(u.lastLogin) * (Number(u.lastLogin) < 1e12 ? 1000 : 1)) : null,
        history: historyDates
      };
    });

    const totalLogins = userLogins.reduce((acc, u) => acc + (u.loginCount || 0), 0);
    const mahasiswaLogins = userLogins.filter(u => u.role === 'mahasiswa').reduce((acc, u) => acc + (u.loginCount || 0), 0);
    const dosenLogins = userLogins.filter(u => u.role === 'dosen').reduce((acc, u) => acc + (u.loginCount || 0), 0);

    return NextResponse.json({
      userLogins: mappedLogins,
      totalLogins,
      mahasiswaLogins,
      dosenLogins
    });
  } catch (error: any) {
    console.error("Error fetching logs:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch logs" }, { status: 500 });
  }
}
