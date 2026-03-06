import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { usims, agencies } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { addUsimLog } from "@/lib/db/queries/usim-logs";

// POST: Transfer USIMs from one agency to another
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
    const { sourceAgencyId, targetAgencyId, count, notes } = body;

    // Validate required fields
    if (!sourceAgencyId || !targetAgencyId || !count) {
      return NextResponse.json(
        { error: "sourceAgencyId, targetAgencyId, count 필드가 필요합니다." },
        { status: 400 }
      );
    }

    if (typeof count !== "number" || count <= 0) {
      return NextResponse.json(
        { error: "이송 수량은 1 이상이어야 합니다." },
        { status: 400 }
      );
    }

    // Validate source and target are different
    if (sourceAgencyId === targetAgencyId) {
      return NextResponse.json(
        { error: "출발 업체와 도착 업체가 동일합니다." },
        { status: 400 }
      );
    }

    // Validate both agencies exist
    const [sourceAgency, targetAgency] = await Promise.all([
      db.select().from(agencies).where(eq(agencies.id, sourceAgencyId)).limit(1),
      db.select().from(agencies).where(eq(agencies.id, targetAgencyId)).limit(1),
    ]);

    if (sourceAgency.length === 0) {
      return NextResponse.json(
        { error: "출발 업체를 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    if (targetAgency.length === 0) {
      return NextResponse.json(
        { error: "도착 업체를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Find ASSIGNED USIMs from source agency, ordered by assignedDate ASC
    const availableUsims = await db
      .select({ id: usims.id, usimSerialNumber: usims.usimSerialNumber })
      .from(usims)
      .where(
        and(
          eq(usims.agencyId, sourceAgencyId),
          eq(usims.status, "ASSIGNED")
        )
      )
      .orderBy(asc(usims.assignedDate), asc(usims.createdAt))
      .limit(count);

    if (availableUsims.length < count) {
      return NextResponse.json(
        {
          error: `출발 업체의 배정 가능 유심이 부족합니다. (요청: ${count}건, 가용: ${availableUsims.length}건)`,
        },
        { status: 400 }
      );
    }

    // Update agencyId for selected USIMs
    const usimIds = availableUsims.map((u) => u.id);
    let updatedCount = 0;

    for (const usimId of usimIds) {
      await db
        .update(usims)
        .set({
          agencyId: targetAgencyId,
          updatedAt: new Date(),
        })
        .where(eq(usims.id, usimId));
      updatedCount++;
    }

    // Log the transfer
    const sourceAgencyName = sourceAgency[0].name;
    const targetAgencyName = targetAgency[0].name;
    const notesText = notes ? ` (메모: ${notes})` : "";

    try {
      await addUsimLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: "transfer",
        details: `유심 이송: ${sourceAgencyName} -> ${targetAgencyName} ${updatedCount}건${notesText}`,
        agencyId: sourceAgencyId,
        agencyName: sourceAgencyName,
        targetAgencyId: targetAgencyId,
        targetAgencyName: targetAgencyName,
        usimCount: updatedCount,
      });
    } catch (logError) {
      console.error("Failed to write usim transfer log:", logError);
    }

    return NextResponse.json({
      success: true,
      transferred: updatedCount,
      message: `${sourceAgencyName} -> ${targetAgencyName} 유심 ${updatedCount}건 이송 완료`,
    });
  } catch (error) {
    console.error("Failed to transfer usims:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
