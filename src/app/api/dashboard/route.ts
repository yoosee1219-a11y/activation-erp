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
  getSupplementRequestStats,
  getSupplementRequestDetail,
  getPendingByPeriod,
  getTodayPendingDetail,
  getSupplementStats,
  getSupplementList,
  getTerminationStats,
  getMonthlyCompletedStats,
  getTodayCompletedStats,
  getNameChangeIncomplete,
  getTodayTerminationCount,
  getMonthlyTerminationDetail,
  getTodayTerminationDetail,
  getNoCommitmentStats,
  getMonthlyCompletedDetail,
} from "@/lib/db/queries/activations";
import {
  getAgencyIdsByMajorCategory,
  getAgencyIdsByMediumCategories,
} from "@/lib/db/queries/categories";
import { getSessionUser } from "@/lib/auth/session";
import { resolveAllowedAgencyIds } from "@/lib/db/queries/users";

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

    // PARTNER/GUEST: 허용된 업체만 조회 가능하도록 제한
    if (user.role === "PARTNER" || user.role === "GUEST") {
      const allowedIds = await resolveAllowedAgencyIds(user);
      if (allowedIds !== null) {
        if (allowedIds.length === 0) {
          return NextResponse.json({
            stats: { total: 0, pending: 0, completed: 0, cancelled: 0 },
            monthlyStats: [], weeklyStats: [], dailyStats: [],
            agencyStats: [], arcStats: [], arcUrgentList: [],
            staffStats: [], kpiTotalByAgency: [], kpiPendingDetail: [],
            kpiAutopayDetail: [], supplementRequestStats: [],
            supplementRequestDetail: [], pendingByPeriod: [],
            todayPendingDetail: [], supplementStats: [],
            supplementList: [], terminationStats: { total: 0 },
            monthlyCompleted: [], todayCompleted: [],
            nameChangeIncomplete: [], todayTermination: 0,
            monthlyTerminationDetail: [], todayTerminationDetail: [],
            noCommitmentStats: { totalCount: 0, byAgency: [] },
          });
        }
        agencyIds = allowedIds;
      }
    } else if (agencyIdsParam) {
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

    // 진단용: 각 쿼리 실행 시간 측정 (Vercel Logs에서 확인 가능)
    const t = (label: string, fn: () => Promise<unknown>) => {
      const start = Date.now();
      return fn().then((r) => {
        const ms = Date.now() - start;
        if (ms > 200) console.log(`[dashboard-perf] ${label}: ${ms}ms`);
        return r;
      });
    };
    const totalStart = Date.now();

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
      supplementRequestStats,
      supplementRequestDetail,
      pendingByPeriod,
      todayPendingDetail,
      supplementStats,
      supplementList,
      terminationStats,
      monthlyCompleted,
      todayCompleted,
      nameChangeIncomplete,
      todayTermination,
      monthlyTerminationDetail,
      todayTerminationDetail,
      noCommitmentStats,
      monthlyCompletedDetail,
    ] = await Promise.all([
      t("stats", () => getDashboardStats(agencyId, agencyIds)),
      t("monthlyStats", () => getMonthlyStats(agencyId, agencyIds)),
      t("weeklyStats", () => getWeeklyStats(agencyId, agencyIds)),
      t("dailyStats", () => getDailyStats(agencyId, agencyIds)),
      t("agencyStats", () => getAgencyStats(agencyIds)),
      t("arcStats", () => getArcSupplementStats(agencyIds)),
      t("arcUrgentList", () => getArcUrgentList(agencyId, agencyIds)),
      t("staffStats", () => getStaffStats(agencyIds)),
      t("kpiTotalByAgency", () => getKpiTotalByAgency(agencyIds)),
      t("kpiPendingDetail", () => getKpiPendingDetail(agencyIds)),
      t("kpiAutopayDetail", () => getKpiAutopayDetail(agencyIds)),
      t("supplementRequestStats", () => getSupplementRequestStats(agencyIds)),
      t("supplementRequestDetail", () => getSupplementRequestDetail(agencyIds)),
      t("pendingByPeriod", () => getPendingByPeriod(agencyIds)),
      t("todayPendingDetail", () => getTodayPendingDetail(agencyIds)),
      t("supplementStats", () => getSupplementStats(agencyIds)),
      t("supplementList", () => getSupplementList(agencyIds)),
      t("terminationStats", () => getTerminationStats({ agencyId, agencyIds })),
      t("monthlyCompleted", () => getMonthlyCompletedStats(agencyIds)),
      t("todayCompleted", () => getTodayCompletedStats(agencyIds)),
      t("nameChangeIncomplete", () => getNameChangeIncomplete(agencyIds)),
      t("todayTermination", () => getTodayTerminationCount(agencyIds)),
      t("monthlyTerminationDetail", () => getMonthlyTerminationDetail(agencyIds)),
      t("todayTerminationDetail", () => getTodayTerminationDetail(agencyIds)),
      t("noCommitmentStats", () => getNoCommitmentStats(agencyIds)),
      t("monthlyCompletedDetail", () => getMonthlyCompletedDetail(agencyIds)),
    ]) as [
      Awaited<ReturnType<typeof getDashboardStats>>,
      Awaited<ReturnType<typeof getMonthlyStats>>,
      Awaited<ReturnType<typeof getWeeklyStats>>,
      Awaited<ReturnType<typeof getDailyStats>>,
      Awaited<ReturnType<typeof getAgencyStats>>,
      Awaited<ReturnType<typeof getArcSupplementStats>>,
      Awaited<ReturnType<typeof getArcUrgentList>>,
      Awaited<ReturnType<typeof getStaffStats>>,
      Awaited<ReturnType<typeof getKpiTotalByAgency>>,
      Awaited<ReturnType<typeof getKpiPendingDetail>>,
      Awaited<ReturnType<typeof getKpiAutopayDetail>>,
      Awaited<ReturnType<typeof getSupplementRequestStats>>,
      Awaited<ReturnType<typeof getSupplementRequestDetail>>,
      Awaited<ReturnType<typeof getPendingByPeriod>>,
      Awaited<ReturnType<typeof getTodayPendingDetail>>,
      Awaited<ReturnType<typeof getSupplementStats>>,
      Awaited<ReturnType<typeof getSupplementList>>,
      Awaited<ReturnType<typeof getTerminationStats>>,
      Awaited<ReturnType<typeof getMonthlyCompletedStats>>,
      Awaited<ReturnType<typeof getTodayCompletedStats>>,
      Awaited<ReturnType<typeof getNameChangeIncomplete>>,
      Awaited<ReturnType<typeof getTodayTerminationCount>>,
      Awaited<ReturnType<typeof getMonthlyTerminationDetail>>,
      Awaited<ReturnType<typeof getTodayTerminationDetail>>,
      Awaited<ReturnType<typeof getNoCommitmentStats>>,
      Awaited<ReturnType<typeof getMonthlyCompletedDetail>>,
    ];

    console.log(`[dashboard-perf] TOTAL: ${Date.now() - totalStart}ms`);

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
      supplementRequestStats,
      supplementRequestDetail,
      pendingByPeriod,
      todayPendingDetail,
      supplementStats,
      supplementList,
      terminationStats,
      monthlyCompleted,
      todayCompleted,
      nameChangeIncomplete,
      todayTermination,
      monthlyTerminationDetail,
      todayTerminationDetail,
      noCommitmentStats,
      monthlyCompletedDetail,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
