import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getFileFromDrive } from "@/lib/google-drive/helpers";
import { db } from "@/lib/db";
import { documentFiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { canAccessAgency } from "@/lib/db/queries/users";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId } = await params;

    // 파일 메타데이터 조회 후 업체 접근 권한 확인
    if (user.role === "PARTNER" || user.role === "GUEST") {
      const fileRecord = await db
        .select({ agencyId: documentFiles.agencyId })
        .from(documentFiles)
        .where(eq(documentFiles.googleDriveFileId, fileId))
        .limit(1);
      if (fileRecord.length > 0) {
        if (!canAccessAgency(user.role, user.allowedAgencies, fileRecord[0].agencyId)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    const { metadata, stream } = await getFileFromDrive(fileId);

    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": metadata.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${metadata.name}"`,
      },
    });
  } catch (error) {
    console.error("Failed to download file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
