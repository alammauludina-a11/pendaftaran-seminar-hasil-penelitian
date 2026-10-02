// Server-to-server maintenance endpoints (moving files, backups) authenticate with MAINTENANCE_TOKEN,
// sent as "Authorization: Bearer <token>". Without the env var the endpoints are disabled.
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export function requireMaintenanceToken(request: Request): NextResponse | null {
  const expected = process.env.MAINTENANCE_TOKEN;
  if (!expected || expected.length < 32) {
    return NextResponse.json({ error: "Endpoint pemeliharaan tidak aktif (MAINTENANCE_TOKEN belum diatur)." }, { status: 404 });
  }
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(given), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
