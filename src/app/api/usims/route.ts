import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  assignUsims,
  getUsimStockByAgency,
  getUsimLogs,
} from "@/lib/db/queries/usims";
import { db } from "@/lib/db";
import { agencyCategories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET: 거래처별 재고 현황 + 이력
export async function GET() {
  const user = await getSessionUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUB_ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [stock, logs] = await Promise.all([
      getUsimStockByAgency(),
      getUsimLogs(200),
    ]);

    return NextResponse.json({ stock, logs });
  } catch (error) {
    console.error("GET /api/usims error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: 유심 배정
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUB_ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { agencyId, quantity, date, usimModel } = (await request.json()) as {
      agencyId: string;
      quantity: number;
      date?: string;
      usimModel?: string;
    };

    if (!agencyId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "거래처와 수량을 입력해주세요." },
        { status: 400 }
      );
    }

    const agency = await db
      .select({ name: agencyCategories.name })
      .from(agencyCategories)
      .where(eq(agencyCategories.id, agencyId))
      .limit(1);

    if (agency.length === 0) {
      return NextResponse.json(
        { error: "거래처를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const assignDate = date || new Date().toISOString().split("T")[0];

    const result = await assignUsims(
      agencyId,
      agency[0].name,
      quantity,
      assignDate,
      { id: user.id, name: user.name, role: user.role },
      usimModel
    );

    const modelLabel = usimModel ? ` [${usimModel}]` : "";
    return NextResponse.json({
      success: true,
      ...result,
      message: `${agency[0].name}에 유심${modelLabel} ${quantity}개 배정 완료`,
    });
  } catch (error) {
    console.error("POST /api/usims error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
