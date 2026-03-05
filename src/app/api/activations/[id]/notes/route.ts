import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activationNotes, activations } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessAgency } from "@/lib/db/queries/users";
import { eq, desc } from "drizzle-orm";

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

    // 해당 activation 접근 권한 확인
    const activation = await db
      .select({ agencyId: activations.agencyId })
      .from(activations)
      .where(eq(activations.id, id))
      .limit(1);

    if (!activation[0]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!canAccessAgency(user.role, user.allowedAgencies, activation[0].agencyId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const notes = await db
      .select()
      .from(activationNotes)
      .where(eq(activationNotes.activationId, id))
      .orderBy(desc(activationNotes.createdAt));

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Failed to fetch notes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role === "GUEST") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // 해당 activation 접근 권한 확인
    const activation = await db
      .select({ agencyId: activations.agencyId })
      .from(activations)
      .where(eq(activations.id, id))
      .limit(1);

    if (!activation[0]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!canAccessAgency(user.role, user.allowedAgencies, activation[0].agencyId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const content = body.content?.trim();
    if (!content) {
      return NextResponse.json({ error: "내용을 입력해주세요" }, { status: 400 });
    }

    // 역할 라벨 결정
    const roleLabel = user.role === "ADMIN" || user.role === "SUB_ADMIN" ? "관리자" : "거래처";

    const result = await db.insert(activationNotes).values({
      activationId: id,
      authorId: user.id,
      authorName: user.name,
      authorRole: roleLabel,
      content,
    }).returning();

    return NextResponse.json({ note: result[0] });
  } catch (error) {
    console.error("Failed to create note:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
