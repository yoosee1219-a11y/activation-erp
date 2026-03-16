import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  getNoticeById,
  updateNotice,
  deleteNotice,
} from "@/lib/db/queries/notices";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const notice = await getNoticeById(id);
    if (!notice) {
      return NextResponse.json(
        { error: "공지사항을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ notice });
  } catch (error) {
    console.error("GET /api/notices/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || !["ADMIN", "SUB_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await getNoticeById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "공지사항을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updateData: {
      title?: string; content?: string; isImportant?: boolean;
      videoUrl?: string | null; attachmentName?: string | null; attachmentData?: string | null;
    } = {};

    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.content !== undefined) updateData.content = body.content.trim();
    if (body.isImportant !== undefined) updateData.isImportant = !!body.isImportant;
    if (body.videoUrl !== undefined) updateData.videoUrl = body.videoUrl?.trim() || null;
    if (body.attachmentName !== undefined) updateData.attachmentName = body.attachmentName || null;
    if (body.attachmentData !== undefined) updateData.attachmentData = body.attachmentData || null;

    const updated = await updateNotice(id, updateData);
    return NextResponse.json({ notice: updated });
  } catch (error) {
    console.error("PATCH /api/notices/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || !["ADMIN", "SUB_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await getNoticeById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "공지사항을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await deleteNotice(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/notices/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
