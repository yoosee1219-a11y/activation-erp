import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes
  const publicPaths = ["/login", "/api/auth"];
  const isPublic = publicPaths.some((path) => pathname.startsWith(path));

  if (isPublic) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Check for session cookie (Better Auth uses "__Secure-" prefix on HTTPS)
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // API 경로는 세션만 체크 (역할 검증은 각 handler에서 getSessionUser()로 서버사이드 검증)
  if (pathname.startsWith("/api/")) {
    return addSecurityHeaders(NextResponse.next());
  }

  // 역할 기반 리다이렉트 (httpOnly 쿠키 — JS 조작 불가)
  const userRole = request.cookies.get("user-role")?.value;

  // 유효한 역할 값만 허용 (쿠키 위조 방지)
  const validRoles = ["ADMIN", "SUB_ADMIN", "PARTNER", "GUEST"];
  const safeRole = userRole && validRoles.includes(userRole) ? userRole : null;

  // 쿠키가 없거나 유효하지 않으면 허용 (클라이언트가 /api/users/me 호출 후 쿠키 설정)
  if (!safeRole) {
    return addSecurityHeaders(NextResponse.next());
  }

  if (safeRole === "PARTNER" || safeRole === "GUEST") {
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

  return addSecurityHeaders(NextResponse.next());
}

/** 모든 응답에 보안 헤더 추가 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
