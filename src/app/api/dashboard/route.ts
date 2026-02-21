import { NextRequest, NextResponse } from "next/server";
import {
  getDashboardStats,
  getMonthlyStats,
  getAgencyStats,
  getArcSupplementStats,
  getArcUrgentList,
  getStaffStats,
  getDailyStats,
  getWeeklyStats,
  getKpiTotalByAgency,
  getKpiPendingDetail,
  getKpiAutopayDetail,
} from "@/lib/db/queries/activations";
import { getSessionUser } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get("agencyId") || undefined;

    const [
      stats,
      monthlyStats,
      weeklyStats,
      dailyStats,
      agencyStats,
      arcStats,
      arcUrgentList,
      staffStats,
      kpiTotalByAgency,
      kpiPendingDetail,
      kpiAutopayDetail,
    ] = await Promise.all([
      getDashboardStats(agencyId),
      getMonthlyStats(agencyId),
      getWeeklyStats(agencyId),
      getDailyStats(agencyId),
      getAgencyStats(),
      getArcSupplementStats(),
      getArcUrgentList(agencyId),
      getStaffStats(),
      getKpiTotalByAgency(),
      getKpiPendingDetail(),
      getKpiAutopayDetail(),
    ]);

    return NextResponse.json({
      stats,
      monthlyStats,
      weeklyStats,
      dailyStats,
      agencyStats,
      arcStats,
      arcUrgentList,
      staffStats,
      kpiTotalByAgency,
      kpiPendingDetail,
      kpiAutopayDetail,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
