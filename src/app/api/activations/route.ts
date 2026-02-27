import { NextRequest, NextResponse } from "next/server";
import {
  getActivations,
  createActivation,
} from "@/lib/db/queries/activations";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessAgency, resolveAllowedAgencyIds } from "@/lib/db/queries/users";
import {
  getAgencyIdsByMediumCategories,
  getAgencyIdsByMajorCategory,
} from "@/lib/db/queries/categories";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let agencyId = searchParams.get("agencyId") || undefined;
    let agencyIds: string[] | undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const dateFrom = searchParams.get("dateFrom") || undefined;
    const dateTo = searchParams.get("dateTo") || undefined;
    const month = searchParams.get("month") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");

    // 멀티셀렉트 파라미터
    const agencyIdsParam = searchParams.get("agencyIds") || undefined;
    const majorCategoriesParam = searchParams.get("majorCategories") || undefined;
    // 하위호환: 단수
    const mediumCategories = searchParams.get("mediumCategories") || undefined;
    const majorCategory = searchParams.get("majorCategory") || undefined;

    // PARTNER/GUEST는 허용된 에이전시만 (카테고리 기반 해석 포함)
    if (user.role === "PARTNER" || user.role === "GUEST") {
      const allowedIds = await resolveAllowedAgencyIds(user);
      if (allowedIds !== null) {
        if (allowedIds.length === 0) {
          return NextResponse.json({ data: [], total: 0, page, pageSize });
        }
        if (agencyId && !allowedIds.includes(agencyId)) {
          return NextResponse.json({ data: [], total: 0, page, pageSize });
        }
        if (!agencyId) {
          // 중분류 필터가 있으면 교집합 처리
          if (mediumCategories) {
            const catIds = mediumCategories.split(",");
            const catAgencyIds = await getAgencyIdsByMediumCategories(catIds);
            const filtered = catAgencyIds.filter((id) => allowedIds.includes(id));
            if (filtered.length === 0) {
              return NextResponse.json({ data: [], total: 0, page, pageSize });
            }
            agencyIds = filtered;
          } else if (allowedIds.length === 1) {
            agencyId = allowedIds[0];
          } else {
            agencyIds = allowedIds;
          }
        }
      }
    } else {
      // ADMIN/SUB_ADMIN: 멀티셀렉트 파라미터 → agencyIds 변환
      // 우선순위: agencyIds > mediumCategories > majorCategories > majorCategory > agencyId
      if (agencyIdsParam && !agencyId) {
        const ids = agencyIdsParam.split(",").filter(Boolean);
        if (ids.length > 0) agencyIds = ids;
      } else if (mediumCategories && !agencyId) {
        const catIds = mediumCategories.split(",");
        const catAgencyIds = await getAgencyIdsByMediumCategories(catIds);
        if (catAgencyIds.length === 0) {
          return NextResponse.json({ data: [], total: 0, page, pageSize });
        }
        agencyIds = catAgencyIds;
      } else if (majorCategoriesParam && !agencyId) {
        const majorIds = majorCategoriesParam.split(",").filter(Boolean);
        const allIds: string[] = [];
        for (const mId of majorIds) {
          const ids = await getAgencyIdsByMajorCategory(mId);
          allIds.push(...ids);
        }
        agencyIds = [...new Set(allIds)];
        if (agencyIds.length === 0) {
          return NextResponse.json({ data: [], total: 0, page, pageSize });
        }
      } else if (majorCategory && !agencyId) {
        const majAgencyIds = await getAgencyIdsByMajorCategory(majorCategory);
        if (majAgencyIds.length === 0) {
          return NextResponse.json({ data: [], total: 0, page, pageSize });
        }
        agencyIds = majAgencyIds;
      }
    }

    const result = await getActivations({
      agencyId,
      agencyIds,
      status,
      search,
      dateFrom,
      dateTo,
      month,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch activations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role === "GUEST") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // 에이전시 접근 권한 확인
    if (
      !canAccessAgency(user.role, user.allowedAgencies, body.agencyId)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const activation = await createActivation({
      ...body,
      workStatus: body.workStatus || "입력중",
    });
    return NextResponse.json({ activation }, { status: 201 });
  } catch (error) {
    console.error("Failed to create activation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
