import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { activations, agencies, usims } from "@/lib/db/schema";
import { eq, and, gte, lt, sql, count, ne } from "drizzle-orm";
import {
  getAgencyIdsByMediumCategories,
  getAgencyIdsByMajorCategory,
} from "@/lib/db/queries/categories";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  // Get all agencies (or specific one)
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

  const USIM_UNIT_COST = 7700;
  const results = [];

  for (const agency of targetAgencies) {
    const commissionRate = agency.commissionRate || 0;

    // USIM received this month (assigned)
    const usimReceived = await db
      .select({ count: count() })
      .from(usims)
      .where(
        and(
          eq(usims.agencyId, agency.id),
          gte(usims.assignedDate, monthStart),
          lt(usims.assignedDate, monthEnd)
        )
      );

    // USIM used this month (activated)
    const usimUsed = await db
      .select({ count: count() })
      .from(usims)
      .where(
        and(
          eq(usims.agencyId, agency.id),
          gte(usims.usedDate, monthStart),
          lt(usims.usedDate, monthEnd)
        )
      );

    // Normal activations this month
    const normalActivations = await db
      .select({ count: count() })
      .from(activations)
      .where(
        and(
          eq(activations.agencyId, agency.id),
          gte(activations.activationDate, monthStart),
          lt(activations.activationDate, monthEnd),
          ne(activations.workStatus, "해지")
        )
      );

    // Clawback: terminations this month (보완기한초과)
    const clawbackSupplement = await db
      .select({ count: count() })
      .from(activations)
      .where(
        and(
          eq(activations.agencyId, agency.id),
          eq(activations.terminationReason, "보완기한초과"),
          gte(activations.terminationDate, monthStart),
          lt(activations.terminationDate, monthEnd)
        )
      );

    // Clawback: terminations this month (6개월해지)
    const clawback6Month = await db
      .select({ count: count() })
      .from(activations)
      .where(
        and(
          eq(activations.agencyId, agency.id),
          eq(activations.terminationReason, "6개월해지"),
          gte(activations.terminationDate, monthStart),
          lt(activations.terminationDate, monthEnd)
        )
      );

    // Clawback: manual termination
    const clawbackManual = await db
      .select({ count: count() })
      .from(activations)
      .where(
        and(
          eq(activations.agencyId, agency.id),
          eq(activations.terminationReason, "수동해지"),
          gte(activations.terminationDate, monthStart),
          lt(activations.terminationDate, monthEnd)
        )
      );

    // Detail list of activations this month
    const detailList = await db
      .select({
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
          eq(activations.agencyId, agency.id),
          sql`(
            (${activations.activationDate} >= ${monthStart} AND ${activations.activationDate} < ${monthEnd})
            OR
            (${activations.terminationDate} >= ${monthStart} AND ${activations.terminationDate} < ${monthEnd})
          )`
        )
      );

    const receivedCount = Number(usimReceived[0]?.count || 0);
    const usedCount = Number(usimUsed[0]?.count || 0);
    const normalCount = Number(normalActivations[0]?.count || 0);
    const supplementClawbackCount = Number(clawbackSupplement[0]?.count || 0);
    const sixMonthClawbackCount = Number(clawback6Month[0]?.count || 0);
    const manualClawbackCount = Number(clawbackManual[0]?.count || 0);

    const usimCost = receivedCount * -USIM_UNIT_COST;
    const usimRevenue = usedCount * USIM_UNIT_COST;
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
        used: usedCount,
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
      details: detailList,
    });
  }

  return NextResponse.json({
    month,
    unitCost: USIM_UNIT_COST,
    agencies: results,
    grandTotal: results.reduce((sum, r) => sum + r.total, 0),
  });
}
