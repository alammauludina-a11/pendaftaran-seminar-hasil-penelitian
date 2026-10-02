import { NextResponse } from "next/server";
import { db } from "@/db";
import { files, pendaftaran } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isiFile } from "@/lib/file-storage";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Only admins, or the student who uploaded the file (referenced by their own registration), may open it
    const role = (session.user as { role?: string }).role;
    if (role !== "admin") {
      const url = `/api/files/${id}`;
      const owned = await db.select({ id: pendaftaran.id }).from(pendaftaran)
        .where(and(
          eq(pendaftaran.userId, session.user.id),
          or(eq(pendaftaran.fileBuktiKolokium, url), eq(pendaftaran.fileApprovalDospem, url))
        ))
        .limit(1);
      if (owned.length === 0) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Metadata only; the content comes from disk (or the legacy base64 column)
    const [file] = await db.select({ id: files.id, name: files.name, mimeType: files.mimeType, storageKey: files.storageKey })
      .from(files).where(eq(files.id, id)).limit(1);
    const buffer = file ? await isiFile(file) : null;
    if (!file || !buffer) {
      return new NextResponse("File not found", { status: 404 });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.name)}"`,
      },
    });
  } catch (error) {
    console.error("Error fetching file:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
