import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const response = NextResponse.json({ user });

  // 미들웨어에서 역할 기반 리다이렉트를 위한 쿠키 설정
  // httpOnly: true → JS 접근 불가 (XSS 방지), 미들웨어는 서버사이드이므로 읽기 가능
  response.cookies.set("user-role", user.role, {
    path: "/",
    maxAge: 60 * 60 * 24, // 24시간 (역할 변경 시 빠르게 반영)
    httpOnly: true,
    sameSite: "lax",
  });

  return response;
}
