import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { account, userProfiles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword, verifyPassword } from "better-auth/crypto";

export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword || newPassword.length < 4) {
      return NextResponse.json(
        { error: "현재 비밀번호와 4자 이상의 새 비밀번호가 필요합니다." },
        { status: 400 }
      );
    }

    // Get current account
    const accounts = await db
      .select()
      .from(account)
      .where(
        and(
          eq(account.userId, user.id),
          eq(account.providerId, "credential")
        )
      );

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: "계정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Verify current password
    const isValid = await verifyPassword({
      hash: accounts[0].password!,
      password: currentPassword,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "현재 비밀번호가 일치하지 않습니다." },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update account table
    await db
      .update(account)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(
        and(
          eq(account.userId, user.id),
          eq(account.providerId, "credential")
        )
      );

    // Update plainPasswordHint
    await db
      .update(userProfiles)
      .set({ plainPasswordHint: newPassword, updatedAt: new Date() })
      .where(eq(userProfiles.id, user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to change password:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
