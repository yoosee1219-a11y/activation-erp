import { NextRequest, NextResponse } from "next/server";
import { getAgencies, createAgency } from "@/lib/db/queries/agencies";
import { getSessionUser } from "@/lib/auth/session";
import { resolveAllowedAgencyIds } from "@/lib/db/queries/users";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let agencyList = await getAgencies(true);

    // PARTNER/GUEST는 허용된 에이전시만 (카테고리 기반 해석 포함)
    if (user.role === "PARTNER" || user.role === "GUEST") {
      const allowedIds = await resolveAllowedAgencyIds(user);
      if (allowedIds !== null) {
        agencyList = agencyList.filter((a) => allowedIds.includes(a.id));
      }
    }

    return NextResponse.json({ agencies: agencyList });
  } catch (error) {
    console.error("Failed to fetch agencies:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const agency = await createAgency(body);
    return NextResponse.json({ agency }, { status: 201 });
  } catch (error) {
    console.error("Failed to create agency:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
