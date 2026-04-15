import { NextResponse } from "next/server";
import { getAvailableMonths } from "@/lib/db/queries/activations";
import { getSessionUser } from "@/lib/auth/session";
import { resolveAllowedAgencyIds } from "@/lib/db/queries/users";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // PARTNER/GUEST: 허용된 에이전시만 카운트
    let agencyIds: string[] | undefined;
    if (user.role === "PARTNER" || user.role === "GUEST") {
      const allowedIds = await resolveAllowedAgencyIds(user);
      if (allowedIds !== null) {
        if (allowedIds.length === 0) {
          return NextResponse.json({ months: [] });
        }
        agencyIds = allowedIds;
      }
    }

    const months = await getAvailableMonths(undefined, agencyIds);
    return NextResponse.json({ months });
  } catch (error) {
    console.error("Failed to fetch months:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
