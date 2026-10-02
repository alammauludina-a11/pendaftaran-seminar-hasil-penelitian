// Raw content of one uploaded file for backups (token protected, see lib/maintenance-auth).
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { files } from "@/db/schema";
import { requireMaintenanceToken } from "@/lib/maintenance-auth";
import { isiFile } from "@/lib/file-storage";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireMaintenanceToken(request);
  if (denied) return denied;
  const { id } = await params;
  const [file] = await db.select({ id: files.id, storageKey: files.storageKey }).from(files).where(eq(files.id, id)).limit(1);
  const isi = file ? await isiFile(file) : null;
  if (!isi) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  return new NextResponse(new Uint8Array(isi), { headers: { "Content-Type": "application/pdf" } });
}
