import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSessionUser } from "@/lib/auth/session";
import { del } from "@vercel/blob";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const user = await getSessionUser();
        if (!user || !["ADMIN", "SUB_ADMIN"].includes(user.role)) {
          throw new Error("권한이 없습니다.");
        }

        return {
          allowedContentTypes: [
            "text/html",
            "text/plain",
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/gif",
            "image/webp",
            "application/octet-stream",
          ],
          maximumSizeInBytes: 100 * 1024 * 1024, // 100MB
          tokenPayload: JSON.stringify({ userId: user.id }),
        };
      },
      onUploadCompleted: async () => {
        // 업로드 완료 후 처리 (필요 시)
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}

// 파일 삭제
export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !["ADMIN", "SUB_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { url } = await request.json();
    if (url) {
      await del(url);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/upload error:", error);
    return NextResponse.json(
      { error: "파일 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
