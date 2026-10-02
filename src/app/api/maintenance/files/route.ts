// Maintenance for uploaded files (token protected, see lib/maintenance-auth).
//   GET                              → storage status; with ?daftar=1 also every file's id, size and sha256 (used by backups)
//   POST {"aksi":"pindahkan"}        → move up to `batas` legacy base64 files to disk (keeps the base64 copy)
//   POST {"aksi":"kosongkan"}        → empty the base64 copy of files verified on disk
import { NextResponse } from "next/server";
import { db } from "@/db";
import { files } from "@/db/schema";
import { requireMaintenanceToken } from "@/lib/maintenance-auth";
import { kosongkanBase64, pindahkanKeDisk, statusPenyimpanan } from "@/lib/file-storage";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = requireMaintenanceToken(request);
  if (denied) return denied;
  const status = await statusPenyimpanan();
  if (new URL(request.url).searchParams.get("daftar") !== "1") return NextResponse.json(status);
  const daftar = await db.select({ id: files.id, storageKey: files.storageKey, size: files.size, sha256: files.sha256 }).from(files);
  return NextResponse.json({ ...status, daftar });
}

export async function POST(request: Request) {
  const denied = requireMaintenanceToken(request);
  if (denied) return denied;
  try {
    const body = await request.json().catch(() => ({}));
    const batas = Math.min(Math.max(Number(body?.batas) || 50, 1), 200);
    if (body?.aksi === "pindahkan") return NextResponse.json(await pindahkanKeDisk(batas));
    if (body?.aksi === "kosongkan") return NextResponse.json(await kosongkanBase64(batas));
    return NextResponse.json({ error: 'aksi harus "pindahkan" atau "kosongkan"' }, { status: 400 });
  } catch (error) {
    console.error("Maintenance files:", error);
    return NextResponse.json({ error: String((error as Error)?.message ?? error) }, { status: 500 });
  }
}
