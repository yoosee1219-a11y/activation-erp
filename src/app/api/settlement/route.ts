import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { activations, agencies, usims } from "@/lib/db/schema";
import { eq, and, gte, lt, sql, ne, inArray, or } from "drizzle-orm";
import {
  getAgencyIdsByMediumCategories,
  getAgencyIdsByMajorCategory,
} from "@/lib/db/queries/categories";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUB_ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const month =
      searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const agencyId = searchParams.get("agencyId");
    const majorCategory = searchParams.get("majorCategory");
    const mediumCategory = searchParams.get("mediumCategory");

    const monthStart = `${month}-01`;
    const nextMonth = new Date(monthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthEnd = nextMonth.toISOString().slice(0, 10);

    // Get all active agencies
    const agencyList = await db
      .select()
      .from(agencies)
      .where(eq(agencies.isActive, true));

    let targetAgencies = agencyList;
    if (agencyId) {
      targetAgencies = agencyList.filter((a) => a.id === agencyId);
    } else if (mediumCategory) {
      const agencyIds = await getAgencyIdsByMediumCategories([mediumCategory]);
      targetAgencies = agencyList.filter((a) => agencyIds.includes(a.id));
    } else if (majorCategory) {
      const agencyIds = await getAgencyIdsByMajorCategory(majorCategory);
      targetAgencies = agencyList.filter((a) => agencyIds.includes(a.id));
    }

    if (targetAgencies.length === 0) {
      return NextResponse.json({
        month,
        unitCost: 7700,
        agencies: [],
        grandTotal: 0,
      });
    }

    const targetIds = targetAgencies.map((a) => a.id);

    // 날짜 범위 조건 (활성화 또는 해지가 해당 월에 발생)
    const activationDateInRange = and(
      gte(activations.activationDate, monthStart),
      lt(activations.activationDate, monthEnd)
    );
    const terminationDateInRange = and(
      gte(activations.terminationDate, monthStart),
      lt(activations.terminationDate, monthEnd)
    );

    // 1) USIM received (assigned) counts per agency
    const usimReceivedRows = await db
      .select({
        agencyId: usims.agencyId,
        cnt: sql<number>`count(*)::int`,
      })
      .from(usims)
      .where(
        and(
          inArray(usims.agencyId, targetIds),
          gte(usims.assignedDate, monthStart),
          lt(usims.assignedDate, monthEnd)
        )
      )
      .groupBy(usims.agencyId);

    // 2) USIM used (activated) counts per agency
    const usimUsedRows = await db
      .select({
        agencyId: usims.agencyId,
        cnt: sql<number>`count(*)::int`,
      })
      .from(usims)
      .where(
        and(
          inArray(usims.agencyId, targetIds),
          gte(usims.usedDate, monthStart),
          lt(usims.usedDate, monthEnd)
        )
      )
      .groupBy(usims.agencyId);

    // 3) Activation counts per agency (normal + clawback categories)
    const activationRows = await db
      .select({
        agencyId: activations.agencyId,
        normalCount: sql<number>`count(*) filter (where ${activations.activationDate} >= ${monthStart} and ${activations.activationDate} < ${monthEnd} and ${activations.workStatus} != '해지')::int`,
        supplementClawbackCount: sql<number>`count(*) filter (where ${activations.terminationReason} = '보완기한초과' and ${activations.terminationDate} >= ${monthStart} and ${activations.terminationDate} < ${monthEnd})::int`,
        sixMonthClawbackCount: sql<number>`count(*) filter (where ${activations.terminationReason} = '6개월해지' and ${activations.terminationDate} >= ${monthStart} and ${activations.terminationDate} < ${monthEnd})::int`,
        manualClawbackCount: sql<number>`count(*) filter (where ${activations.terminationReason} = '수동해지' and ${activations.terminationDate} >= ${monthStart} and ${activations.terminationDate} < ${monthEnd})::int`,
      })
      .from(activations)
      .where(
        and(
          inArray(activations.agencyId, targetIds),
          or(activationDateInRange, terminationDateInRange)
        )
      )
      .groupBy(activations.agencyId);

    // 4) Detail list - all matching activations
    const detailList = await db
      .select({
        agencyId: activations.agencyId,
        id: activations.id,
        customerName: activations.customerName,
        activationDate: activations.activationDate,
        workStatus: activations.workStatus,
        terminationDate: activations.terminationDate,
        terminationReason: activations.terminationReason,
      })
      .from(activations)
      .where(
        and(
          inArray(activations.agencyId, targetIds),
          or(activationDateInRange, terminationDateInRange)
        )
      );

    // Build lookup maps
    const usimReceivedMap = new Map(usimReceivedRows.map((r) => [r.agencyId, r.cnt]));
    const usimUsedMap = new Map(usimUsedRows.map((r) => [r.agencyId, r.cnt]));
    const activationMap = new Map(activationRows.map((r) => [r.agencyId, r]));
    const detailMap = new Map<string, typeof detailList>();
    for (const d of detailList) {
      if (!d.agencyId) continue;
      if (!detailMap.has(d.agencyId)) detailMap.set(d.agencyId, []);
      detailMap.get(d.agencyId)!.push(d);
    }

    const USIM_UNIT_COST = 7700;
    const results = [];

    for (const agency of targetAgencies) {
      const commissionRate = agency.commissionRate || 0;
      const receivedCount = usimReceivedMap.get(agency.id) || 0;
      const usedCount = usimUsedMap.get(agency.id) || 0;

      const actRow = activationMap.get(agency.id);
      const normalCount = actRow?.normalCount || 0;
      const supplementClawbackCount = actRow?.supplementClawbackCount || 0;
      const sixMonthClawbackCount = actRow?.sixMonthClawbackCount || 0;
      const manualClawbackCount = actRow?.manualClawbackCount || 0;

      // 해당 월에 데이터가 하나도 없는 거래처(소분류)는 결과에서 제외
      const hasAnyData =
        receivedCount > 0 ||
        normalCount > 0 ||
        supplementClawbackCount > 0 ||
        sixMonthClawbackCount > 0 ||
        manualClawbackCount > 0;

      if (!hasAnyData) continue;

      // 유심 사용 = 정상 개통 건수 (개통 시 건당 7,700원 환급)
      const effectiveUsedCount = normalCount;

      const usimCost = receivedCount * -USIM_UNIT_COST;
      const usimRevenue = effectiveUsedCount * USIM_UNIT_COST;
      const usimSubtotal = usimCost + usimRevenue;

      const commissionRevenue = normalCount * commissionRate;
      const supplementClawback = supplementClawbackCount * -commissionRate;
      const sixMonthClawback = sixMonthClawbackCount * -commissionRate;
      const manualClawback = manualClawbackCount * -commissionRate;
      const commissionSubtotal =
        commissionRevenue + supplementClawback + sixMonthClawback + manualClawback;

      results.push({
        agencyId: agency.id,
        agencyName: agency.name,
        commissionRate,
        usim: {
          received: receivedCount,
          used: effectiveUsedCount,
          cost: usimCost,
          revenue: usimRevenue,
          subtotal: usimSubtotal,
        },
        commission: {
          normalCount,
          normalAmount: commissionRevenue,
          supplementClawbackCount,
          supplementClawback,
          sixMonthClawbackCount,
          sixMonthClawback,
          manualClawbackCount,
          manualClawback,
          subtotal: commissionSubtotal,
        },
        total: usimSubtotal + commissionSubtotal,
        details: detailMap.get(agency.id) || [],
      });
    }

    return NextResponse.json({
      month,
      unitCost: USIM_UNIT_COST,
      agencies: results,
      grandTotal: results.reduce((sum, r) => sum + r.total, 0),
    });
  } catch (error) {
    console.error("GET /api/settlement error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
