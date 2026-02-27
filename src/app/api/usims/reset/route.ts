import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { resetUsims } from "@/lib/db/queries/usims";

// POST: CANCELLED → RESET_READY 일괄 초기화
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "ADMIN" && user.role !== "SUB_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { usimIds } = body;

    if (!usimIds || !Array.isArray(usimIds) || usimIds.length === 0) {
      return NextResponse.json(
        { error: "usimIds 배열이 필요합니다." },
        { status: 400 }
      );
    }

    const result = await resetUsims(usimIds);
    return NextResponse.json({
      success: true,
      updated: result.updated,
      message: `${result.updated}건 유심 초기화 완료 (재고 복구)`,
    });
  } catch (error) {
    console.error("Failed to reset usims:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
