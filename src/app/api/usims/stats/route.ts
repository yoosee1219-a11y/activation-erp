import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getUsimStockByAgency } from "@/lib/db/queries/usims";
import { resolveAllowedAgencyIds } from "@/lib/db/queries/users";
import { db } from "@/lib/db";
import { activations } from "@/lib/db/schema";
import { sql, inArray, and, isNotNull } from "drizzle-orm";

// 파트너 대시보드용: 거래처별 유심 통계
// (totalAssigned, currentStock, used, cancelled, resetReady)
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 사용자 권한 범위의 agencyIds
    const allowedIds = await resolveAllowedAgencyIds(user);

    // 재고: 어드민은 전체, 그 외는 권한 범위
    const stockRows = await getUsimStockByAgency(
      allowedIds === null ? undefined : allowedIds
    );

    // 사용/취소 카운트 (activations 기반)
    const targetIds =
      allowedIds === null
        ? stockRows.map((s) => s.agencyId)
        : allowedIds;

    let usageMap = new Map<string, { used: number; cancelled: number }>();
    if (targetIds.length > 0) {
      const usageRows = await db
        .select({
          agencyId: activations.agencyId,
          used: sql<number>`coalesce(sum(case when ${activations.workStatus} in ('개통완료','최종완료','진행중','개통요청','보완요청') then 1 else 0 end), 0)::int`,
          cancelled: sql<number>`coalesce(sum(case when ${activations.workStatus} in ('개통취소','해지') then 1 else 0 end), 0)::int`,
        })
        .from(activations)
        .where(
          and(
            inArray(activations.agencyId, targetIds),
            isNotNull(activations.usimNumber)
          )
        )
        .groupBy(activations.agencyId);

      usageMap = new Map(
        usageRows.map((r) => [r.agencyId, { used: r.used, cancelled: r.cancelled }])
      );
    }

    const stats = stockRows.map((s) => {
      const u = usageMap.get(s.agencyId) || { used: 0, cancelled: 0 };
      return {
        agencyId: s.agencyId,
        agencyName: s.agencyName,
        totalAssigned: s.totalAssigned,
        currentStock: Math.max(0, s.currentStock - u.used),
        used: u.used,
        cancelled: u.cancelled,
        resetReady: u.cancelled, // 해지/취소 USIM = 재사용 가능 후보
      };
    });

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("GET /api/usims/stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
