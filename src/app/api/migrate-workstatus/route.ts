import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { activations } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

// 일회용 마이그레이션: workStatus "대기" → "개통요청"
// 실행 후 이 파일을 삭제해도 됩니다.
export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await db
      .update(activations)
      .set({ workStatus: "개통요청" })
      .where(eq(activations.workStatus, "대기"));

    // workStatus가 NULL인 행도 업데이트
    await db.execute(
      sql`UPDATE activations SET work_status = '개통요청' WHERE work_status IS NULL`
    );

    return NextResponse.json({
      success: true,
      message: "workStatus '대기' → '개통요청' 마이그레이션 완료",
    });
  } catch (error) {
    console.error("Migration failed:", error);
    return NextResponse.json(
      { error: "Migration failed" },
      { status: 500 }
    );
  }
}
