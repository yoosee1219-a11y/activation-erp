import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { resolveAllowedAgencyIds } from "@/lib/db/queries/users";
import { getUsimStatsByAgency } from "@/lib/db/queries/usims";
import {
  getAgencyIdsByMediumCategories,
  getAgencyIdsByMajorCategory,
} from "@/lib/db/queries/categories";

// GET: 업체별 유심 재고 통계
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agencyIdsParam = searchParams.get("agencyIds") || undefined;
    const majorCategoriesParam = searchParams.get("majorCategories") || undefined;
    const mediumCategories = searchParams.get("mediumCategories") || undefined;

    let agencyIds: string[] | undefined;

    // PARTNER/GUEST는 허용된 에이전시만
    if (user.role === "PARTNER" || user.role === "GUEST") {
      const allowedIds = await resolveAllowedAgencyIds(user);
      if (allowedIds !== null) {
        if (allowedIds.length === 0) {
          return NextResponse.json({ stats: [] });
        }
        agencyIds = allowedIds;
      }
    } else {
      // ADMIN: 필터 파라미터 처리
      if (agencyIdsParam) {
        agencyIds = agencyIdsParam.split(",").filter(Boolean);
      } else if (mediumCategories) {
        const catIds = mediumCategories.split(",");
        agencyIds = await getAgencyIdsByMediumCategories(catIds);
      } else if (majorCategoriesParam) {
        const majorIds = majorCategoriesParam.split(",").filter(Boolean);
        const allIds: string[] = [];
        for (const mId of majorIds) {
          const ids = await getAgencyIdsByMajorCategory(mId);
          allIds.push(...ids);
        }
        agencyIds = [...new Set(allIds)];
      }
    }

    const stats = await getUsimStatsByAgency(agencyIds);
    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Failed to fetch usim stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
