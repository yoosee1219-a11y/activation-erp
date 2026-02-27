import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { resolveAllowedAgencyIds } from "@/lib/db/queries/users";
import { getUsims, getUsimsByAgency, assignUsims, deleteUsims } from "@/lib/db/queries/usims";
import {
  getAgencyIdsByMediumCategories,
  getAgencyIdsByMajorCategory,
} from "@/lib/db/queries/categories";

// GET: 유심 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get("agencyId") || undefined;
    const status = searchParams.get("status") as
      | "ASSIGNED"
      | "USED"
      | "CANCELLED"
      | "RESET_READY"
      | undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "100");

    // 멀티셀렉트 파라미터
    const agencyIdsParam = searchParams.get("agencyIds") || undefined;
    const majorCategoriesParam = searchParams.get("majorCategories") || undefined;
    const mediumCategories = searchParams.get("mediumCategories") || undefined;

    let agencyIds: string[] | undefined;

    // PARTNER/GUEST는 허용된 에이전시만
    if (user.role === "PARTNER" || user.role === "GUEST") {
      const allowedIds = await resolveAllowedAgencyIds(user);
      if (allowedIds !== null) {
        if (allowedIds.length === 0) {
          return NextResponse.json({ data: [], total: 0, page, pageSize });
        }
        // 특정 업체 요청 시 권한 확인
        if (agencyId && !allowedIds.includes(agencyId)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        if (agencyId) {
          const result = await getUsimsByAgency(agencyId, { status, page, pageSize });
          return NextResponse.json(result);
        }
        agencyIds = allowedIds;
      }
    } else {
      // ADMIN: 필터 파라미터 처리
      if (agencyId) {
        const result = await getUsimsByAgency(agencyId, { status, page, pageSize });
        return NextResponse.json(result);
      }

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

    const result = await getUsims({ agencyIds, status, search, page, pageSize });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch usims:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: 유심 일괄 배정
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "ADMIN" && user.role !== "SUB_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { agencyId, serialNumbers, assignedDate } = body;

    if (!agencyId || !serialNumbers || !Array.isArray(serialNumbers) || serialNumbers.length === 0) {
      return NextResponse.json(
        { error: "agencyId와 serialNumbers 배열이 필요합니다." },
        { status: 400 }
      );
    }

    if (!assignedDate) {
      return NextResponse.json(
        { error: "assignedDate가 필요합니다." },
        { status: 400 }
      );
    }

    // 일련번호 정리 (공백 제거, 중복 제거)
    const cleaned = [...new Set(serialNumbers.map((s: string) => s.trim()).filter(Boolean))];

    const result = await assignUsims(agencyId, cleaned, assignedDate);
    return NextResponse.json({
      success: true,
      created: result.created,
      duplicates: result.duplicates,
      message: `${result.created}건 배정 완료${result.duplicates.length > 0 ? `, ${result.duplicates.length}건 중복` : ""}`,
    });
  } catch (error) {
    console.error("Failed to assign usims:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: 유심 일괄 삭제 (관리자 전용)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { usimIds } = body;

    if (!usimIds || !Array.isArray(usimIds) || usimIds.length === 0) {
      return NextResponse.json({ error: "usimIds 배열이 필요합니다." }, { status: 400 });
    }

    await deleteUsims(usimIds);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete usims:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
