import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  // httpOnly 쿠키는 서버에서만 삭제 가능
  response.cookies.set("user-role", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
  });

  return response;
}
