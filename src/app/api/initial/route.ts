import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getCategoryTree } from "@/lib/db/queries/categories";
import { getAgencies } from "@/lib/db/queries/agencies";
import { resolveAllowedAgencyIds } from "@/lib/db/queries/users";

/**
 * 페이지 진입 시 한 번에 가져오는 묶음 endpoint.
 * 기존: /api/users/me + /api/categories + /api/agencies (3 round-trip)
 * 개선: /api/initial (1 round-trip)
 */
export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { user: null, categories: [], agencies: [] },
      { status: 401 }
    );
  }

  // 병렬 fetch (서버 안에서)
  const [categories, agenciesAll] = await Promise.all([
    getCategoryTree(),
    getAgencies(true),
  ]);

  // PARTNER/GUEST는 허용된 에이전시만
  let agencies = agenciesAll;
  if (user.role === "PARTNER" || user.role === "GUEST") {
    const allowedIds = await resolveAllowedAgencyIds(user);
    if (allowedIds !== null) {
      agencies = agenciesAll.filter((a) => allowedIds.includes(a.id));
    }
  }

  const response = NextResponse.json(
    { user, categories, agencies },
    {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=300",
      },
    }
  );

  // user-role 쿠키 (미들웨어용)
  response.cookies.set("user-role", user.role, {
    path: "/",
    maxAge: 60 * 60 * 24,
    httpOnly: true,
    sameSite: "lax",
  });

  return response;
}
