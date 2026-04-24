import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { agencyCategories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// PATCH: Update agency commission rate from settlement page
export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUB_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { agencyId, commissionRate, deductionRate } = body;

    if (!agencyId) {
      return NextResponse.json(
        { error: "거래처 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 수수료 또는 차감단가 중 하나는 있어야 함
    const updates: Record<string, number | null> = {};

    if (commissionRate !== undefined) {
      if (typeof commissionRate !== "number" || commissionRate < 0) {
        return NextResponse.json(
          { error: "수수료 단가는 0 이상의 숫자여야 합니다." },
          { status: 400 }
        );
      }
      updates.commissionRate = commissionRate;
    }

    if (deductionRate !== undefined) {
      // null이면 commissionRate로 fallback하도록 초기화
      if (deductionRate === null) {
        updates.deductionRate = null;
      } else if (typeof deductionRate !== "number" || deductionRate < 0) {
        return NextResponse.json(
          { error: "차감 단가는 0 이상의 숫자여야 합니다." },
          { status: 400 }
        );
      } else {
        updates.deductionRate = deductionRate;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "변경할 항목이 없습니다." },
        { status: 400 }
      );
    }

    const result = await db
      .update(agencyCategories)
      .set(updates)
      .where(
        and(
          eq(agencyCategories.id, agencyId),
          eq(agencyCategories.level, "medium")
        )
      )
      .returning({
        id: agencyCategories.id,
        name: agencyCategories.name,
        commissionRate: agencyCategories.commissionRate,
        deductionRate: agencyCategories.deductionRate,
      });

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
