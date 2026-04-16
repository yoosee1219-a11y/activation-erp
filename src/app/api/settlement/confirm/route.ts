import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { activations } from "@/lib/db/schema";
import { and, eq, gte, lt, isNull, sql } from "drizzle-orm";

// POST: 월 단위 차감확정 — 해당 월 차감 대상 건을 일괄 마킹
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUB_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { month } = body; // "2026-03"

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "올바른 정산월 형식이 아닙니다. (YYYY-MM)" },
        { status: 400 }
      );
    }

    const monthStart = `${month}-01`;
    const nextMonth = new Date(monthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthEnd = nextMonth.toISOString().slice(0, 10);

    // 이미 확정된 건이 있는지 확인
    const alreadySettled = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(activations)
      .where(eq(activations.deductionSettledMonth, month));

    if ((alreadySettled[0]?.cnt || 0) > 0) {
      return NextResponse.json(
        { error: `${month} 정산은 이미 확정되었습니다. (${alreadySettled[0].cnt}건)` },
        { status: 409 }
      );
    }

    // 차감 대상: 해당 월에 해지된 건 중 약정선택 건 (terminationReason이 있는 건)
    const now = new Date();
    const result = await db
      .update(activations)
      .set({
        deductionSettledAt: now,
        deductionSettledMonth: month,
      })
      .where(
        and(
          gte(activations.terminationDate, monthStart),
          lt(activations.terminationDate, monthEnd),
          eq(activations.selectedCommitment, true),
          sql`${activations.terminationReason} IS NOT NULL`,
          isNull(activations.deductionSettledAt)
        )
      )
      .returning({ id: activations.id });

    return NextResponse.json({
      success: true,
      month,
      settledCount: result.length,
      settledAt: now.toISOString(),
    });
  } catch (error) {
    console.error("POST /api/settlement/confirm error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: 특정 월의 확정 상태 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUB_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (!month) {
      return NextResponse.json(
        { error: "month 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const result = await db
      .select({
        cnt: sql<number>`count(*)::int`,
        settledAt: sql<string>`max(${activations.deductionSettledAt})`,
      })
      .from(activations)
      .where(eq(activations.deductionSettledMonth, month));

    const count = result[0]?.cnt || 0;
    return NextResponse.json({
      month,
      isSettled: count > 0,
      settledCount: count,
      settledAt: result[0]?.settledAt || null,
    });
  } catch (error) {
    console.error("GET /api/settlement/confirm error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
