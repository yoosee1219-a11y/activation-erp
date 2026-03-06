import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { account, userProfiles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";

export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, newPassword } = body;

    if (!userId || !newPassword || newPassword.length < 4) {
      return NextResponse.json(
        { error: "유효한 사용자 ID와 4자 이상 비밀번호가 필요합니다." },
        { status: 400 }
      );
    }

    // Hash password using Better Auth's internal method
    const hashedPassword = await hashPassword(newPassword);

    // Update account table password
    await db
      .update(account)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(
        and(
          eq(account.userId, userId),
          eq(account.providerId, "credential")
        )
      );

    // Update plainPasswordHint in user_profiles
    await db
      .update(userProfiles)
      .set({ plainPasswordHint: newPassword, updatedAt: new Date() })
      .where(eq(userProfiles.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to change password:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
