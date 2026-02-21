import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes
  const publicPaths = ["/login", "/api/auth"];
  const isPublic = publicPaths.some((path) => pathname.startsWith(path));

  if (isPublic) {
    return NextResponse.next();
  }

  // Check for session cookie (Better Auth uses "better-auth.session_token")
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value;

  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // API 경로는 세션만 체크 (역할 검증은 각 handler에서)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 역할 기반 리다이렉트
  const userRole = request.cookies.get("user-role")?.value;

  // 쿠키가 없으면 /api/users/me를 통해 쿠키가 설정될 때까지 허용
  // (클라이언트 사이드 useAuth 훅이 /api/users/me 호출 → 쿠키 설정 → 이후 정상 동작)
  if (!userRole) {
    return NextResponse.next();
  }

  if (userRole === "PARTNER" || userRole === "GUEST") {
    // 거래처/게스트가 관리자 페이지 접근 시 → /partner로 리다이렉트
    const adminPaths = ["/activations", "/admin"];
    const isAdminPage =
      pathname === "/" ||
      adminPaths.some((path) => pathname.startsWith(path));

    if (isAdminPage) {
      return NextResponse.redirect(new URL("/partner", request.url));
    }
  }

  // ADMIN/SUB_ADMIN → 모든 경로 접근 가능 (/partner 포함)

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
