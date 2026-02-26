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
import {
  getAgencyIdsByMajorCategory,
  getAgencyIdsByMediumCategories,
} from "@/lib/db/queries/categories";
import { getSessionUser } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    // 하위호환: 단일 agencyId
    const agencyId = searchParams.get("agencyId") || undefined;
    // 멀티셀렉트: 복수 agencyIds (comma-separated)
    const agencyIdsParam = searchParams.get("agencyIds") || undefined;
    // 멀티셀렉트: 복수 majorCategories (comma-separated)
    const majorCategoriesParam = searchParams.get("majorCategories") || undefined;
    // 하위호환: 단일 majorCategory
    const majorCategory = searchParams.get("majorCategory") || undefined;
    const mediumCategoriesParam = searchParams.get("mediumCategories") || undefined;

    // 카테고리/거래처 파라미터를 agencyIds로 변환
    // 우선순위: agencyIds > mediumCategories > majorCategories > majorCategory > agencyId
    let agencyIds: string[] | undefined;

    if (agencyIdsParam) {
      agencyIds = agencyIdsParam.split(",").filter(Boolean);
      if (agencyIds.length === 0) agencyIds = undefined;
    } else if (mediumCategoriesParam) {
      const mediumIds = mediumCategoriesParam.split(",").filter(Boolean);
      agencyIds = await getAgencyIdsByMediumCategories(mediumIds);
      if (agencyIds.length === 0) agencyIds = ["__no_match__"];
    } else if (majorCategoriesParam) {
      const majorIds = majorCategoriesParam.split(",").filter(Boolean);
      const allIds: string[] = [];
      for (const mId of majorIds) {
        const ids = await getAgencyIdsByMajorCategory(mId);
        allIds.push(...ids);
      }
      agencyIds = [...new Set(allIds)];
      if (agencyIds.length === 0) agencyIds = ["__no_match__"];
    } else if (majorCategory) {
      agencyIds = await getAgencyIdsByMajorCategory(majorCategory);
      if (agencyIds.length === 0) agencyIds = ["__no_match__"];
    }

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
      getDashboardStats(agencyId, agencyIds),
      getMonthlyStats(agencyId, agencyIds),
      getWeeklyStats(agencyId, agencyIds),
      getDailyStats(agencyId, agencyIds),
      getAgencyStats(agencyIds),
      getArcSupplementStats(agencyIds),
      getArcUrgentList(agencyId, agencyIds),
      getStaffStats(agencyIds),
      getKpiTotalByAgency(agencyIds),
      getKpiPendingDetail(agencyIds),
      getKpiAutopayDetail(agencyIds),
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
