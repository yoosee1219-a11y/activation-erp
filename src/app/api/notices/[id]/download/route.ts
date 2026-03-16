import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getNoticeById } from "@/lib/db/queries/notices";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const notice = await getNoticeById(id);
    if (!notice || !notice.attachmentName || !notice.attachmentData) {
      return NextResponse.json(
        { error: "첨부파일이 없습니다." },
        { status: 404 }
      );
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(notice.attachmentData);

    // 파일 확장자로 MIME 타입 결정
    const ext = notice.attachmentName.split(".").pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      html: "text/html",
      htm: "text/html",
      txt: "text/plain",
      pdf: "application/pdf",
    };
    const contentType = mimeMap[ext || ""] || "application/octet-stream";

    // ?download=true 이면 다운로드, 기본은 미리보기 (inline)
    const isDownload = request.nextUrl.searchParams.get("download") === "true";
    const disposition = isDownload
      ? `attachment; filename*=UTF-8''${encodeURIComponent(notice.attachmentName)}`
      : `inline; filename*=UTF-8''${encodeURIComponent(notice.attachmentName)}`;

    return new NextResponse(data, {
      headers: {
        "Content-Type": `${contentType}; charset=utf-8`,
        "Content-Disposition": disposition,
      },
    });
  } catch (error) {
    console.error("GET /api/notices/[id]/download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
