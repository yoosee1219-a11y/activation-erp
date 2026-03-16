import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getNotices, createNotice } from "@/lib/db/queries/notices";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "2mb",
    },
  },
};

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const list = await getNotices();
    return NextResponse.json({ notices: list });
  } catch (error) {
    console.error("GET /api/notices error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !["ADMIN", "SUB_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, isImportant, videoUrl, attachmentName, attachmentData } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: "제목과 내용은 필수입니다." },
        { status: 400 }
      );
    }

    const notice = await createNotice({
      title: title.trim(),
      content: content.trim(),
      isImportant: !!isImportant,
      videoUrl: videoUrl?.trim() || undefined,
      attachmentName: attachmentName || undefined,
      attachmentData: attachmentData || undefined,
      createdBy: user.id,
      createdByName: user.name,
    });

    return NextResponse.json({ notice }, { status: 201 });
  } catch (error) {
    console.error("POST /api/notices error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
