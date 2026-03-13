import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { agencies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// PATCH: Update agency commission rate from settlement page
export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUB_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { agencyId, commissionRate } = body;

    if (!agencyId) {
      return NextResponse.json(
        { error: "거래처 ID가 필요합니다." },
        { status: 400 }
      );
    }

    if (typeof commissionRate !== "number" || commissionRate < 0) {
      return NextResponse.json(
        { error: "수수료 단가는 0 이상의 숫자여야 합니다." },
        { status: 400 }
      );
    }

    const result = await db
      .update(agencies)
      .set({ commissionRate })
      .where(eq(agencies.id, agencyId))
      .returning({ id: agencies.id, name: agencies.name, commissionRate: agencies.commissionRate });

    if (result.length === 0) {
      return NextResponse.json(
        { error: "거래처를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      agency: result[0],
    });
  } catch (error) {
    console.error("PATCH /api/settlement/adjust error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
