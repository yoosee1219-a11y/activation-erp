import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { getSessionUser } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !["ADMIN", "SUB_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "파일이 없습니다." },
        { status: 400 }
      );
    }

    // 100MB 제한
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json(
        { error: "파일 크기는 100MB 이하만 가능합니다." },
        { status: 400 }
      );
    }

    const blob = await put(`notices/${Date.now()}_${file.name}`, file, {
      access: "public",
    });

    return NextResponse.json({
      url: blob.url,
      filename: file.name,
    });
  } catch (error) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json(
      { error: "파일 업로드에 실패했습니다." },
      { status: 500 }
    );
  }
}

// 파일 삭제 (공지 삭제 시)
export async function DELETE(request: NextRequest) {
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
