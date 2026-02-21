import { NextRequest, NextResponse } from "next/server";
import {
  getActivations,
  createActivation,
} from "@/lib/db/queries/activations";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessAgency } from "@/lib/db/queries/users";

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
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");

    // PARTNER/GUEST는 자기 에이전시만
    if (user.role === "PARTNER" || user.role === "GUEST") {
      if (!user.allowedAgencies.includes("ALL")) {
        if (agencyId && !user.allowedAgencies.includes(agencyId)) {
          return NextResponse.json({ data: [], total: 0, page, pageSize });
        }
        // 특정 거래처 미지정 시 → 허용된 모든 거래처 데이터 반환
        if (!agencyId && user.allowedAgencies.length > 0) {
          if (user.allowedAgencies.length === 1) {
            agencyId = user.allowedAgencies[0];
          } else {
            agencyIds = user.allowedAgencies;
            agencyId = undefined;
          }
        }
      }
    }

    const result = await getActivations({
      agencyId,
      agencyIds,
      status,
      search,
      dateFrom,
      dateTo,
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

    const activation = await createActivation(body);
    return NextResponse.json({ activation }, { status: 201 });
  } catch (error) {
    console.error("Failed to create activation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
