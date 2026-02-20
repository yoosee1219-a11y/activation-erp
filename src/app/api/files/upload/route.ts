import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { uploadFileToDrive } from "@/lib/google-drive/helpers";
import { db } from "@/lib/db";
import { documentFiles } from "@/lib/db/schema";
import { canAccessAgency } from "@/lib/db/queries/users";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role === "GUEST") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const activationId = formData.get("activationId") as string;
    const agencyId = formData.get("agencyId") as string;
    const fileType = formData.get("fileType") as string;

    if (!file || !agencyId || !fileType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!canAccessAgency(user.role, user.allowedAgencies, agencyId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadFileToDrive(
      buffer,
      file.name,
      file.type,
      agencyId
    );

    // DB에 메타데이터 저장
    const [doc] = await db
      .insert(documentFiles)
      .values({
        activationId: activationId || null,
        agencyId,
        fileType,
        fileName: file.name,
        googleDriveFileId: result.fileId,
        googleDriveLink: result.webViewLink,
        uploadedBy: user.id,
      })
      .returning();

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (error) {
    console.error("Failed to upload file:", error);

    if (error instanceof Error && error.message.includes("not configured")) {
      return NextResponse.json(
        { error: "Google Drive가 설정되지 않았습니다." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
