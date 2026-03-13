import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { transferUsims } from "@/lib/db/queries/usims";
import { db } from "@/lib/db";
import { agencies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUB_ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { fromAgencyId, toAgencyId, quantity, date } = (await request.json()) as {
      fromAgencyId: string;
      toAgencyId: string;
      quantity: number;
      date?: string;
    };

    if (!fromAgencyId || !toAgencyId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "출발/도착 거래처와 수량을 입력해주세요." },
        { status: 400 }
      );
    }

    if (fromAgencyId === toAgencyId) {
      return NextResponse.json(
        { error: "같은 거래처로 이송할 수 없습니다." },
        { status: 400 }
      );
    }

    // 거래처 이름 조회
    const [fromAgency, toAgency] = await Promise.all([
      db.select({ name: agencies.name }).from(agencies).where(eq(agencies.id, fromAgencyId)).limit(1),
      db.select({ name: agencies.name }).from(agencies).where(eq(agencies.id, toAgencyId)).limit(1),
    ]);

    if (fromAgency.length === 0 || toAgency.length === 0) {
      return NextResponse.json(
        { error: "거래처를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const transferDate = date || new Date().toISOString().split("T")[0];

    const result = await transferUsims(
      fromAgencyId,
      fromAgency[0].name,
      toAgencyId,
      toAgency[0].name,
      quantity,
      transferDate,
      { id: user.id, name: user.name, role: user.role }
    );

    return NextResponse.json({
      success: true,
      ...result,
      message: `${fromAgency[0].name} → ${toAgency[0].name} 유심 ${quantity}개 이송 완료`,
    });
  } catch (error) {
    console.error("POST /api/usims/transfer error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
