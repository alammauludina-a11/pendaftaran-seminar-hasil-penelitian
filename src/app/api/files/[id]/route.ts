import { NextResponse } from "next/server";
import { db } from "@/db";
import { files, pendaftaran } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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

    const fileRecords = await db.select().from(files).where(eq(files.id, id));
    if (fileRecords.length === 0) {
      return new NextResponse("File not found", { status: 404 });
    }

    const file = fileRecords[0];
    const buffer = Buffer.from(file.data, "base64");

    return new NextResponse(buffer, {
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
