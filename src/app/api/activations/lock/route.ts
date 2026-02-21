import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { activations } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.role !== "SUB_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { activationIds, lock } = body as {
      activationIds: string[];
      lock: boolean;
    };

    if (!Array.isArray(activationIds) || activationIds.length === 0) {
      return NextResponse.json(
        { error: "activationIds가 필요합니다." },
        { status: 400 }
      );
    }

    await db
      .update(activations)
      .set({
        isLocked: lock,
        lockedAt: lock ? new Date() : null,
        lockedBy: lock ? user.id : null,
        updatedAt: new Date(),
      })
      .where(inArray(activations.id, activationIds));

    return NextResponse.json({
      success: true,
      count: activationIds.length,
      locked: lock,
    });
  } catch (error) {
    console.error("Failed to toggle lock:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
