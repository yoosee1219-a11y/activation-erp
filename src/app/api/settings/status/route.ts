import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activationStatusConfig } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const statuses = await db
      .select()
      .from(activationStatusConfig)
      .orderBy(asc(activationStatusConfig.sortOrder));

    return NextResponse.json({ statuses });
  } catch (error) {
    console.error("Failed to fetch statuses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUB_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { statusKey, statusLabel, color, sortOrder } = body;

    if (!statusKey || !statusLabel) {
      return NextResponse.json(
        { error: "statusKey와 statusLabel은 필수입니다." },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(activationStatusConfig)
      .values({
        statusKey,
        statusLabel,
        color: color || "#6b7280",
        sortOrder: sortOrder ?? 0,
        isActive: true,
      })
      .returning();

    return NextResponse.json({ status: created }, { status: 201 });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("unique")
    ) {
      return NextResponse.json(
        { error: "이미 존재하는 상태 키입니다." },
        { status: 409 }
      );
    }
    console.error("Failed to create status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
