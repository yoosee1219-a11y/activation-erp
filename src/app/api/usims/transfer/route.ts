import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { usims, agencies } from "@/lib/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";
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
    const {
      sourceAgencyId,
      sourceAgencyIds: rawSourceAgencyIds,
      targetAgencyId,
      targetAgencyIds: rawTargetAgencyIds,
      count,
      notes,
      usimIds: rawUsimIds,
    } = body;

    // Support both single ID and array of IDs
    const sourceIds: string[] = rawSourceAgencyIds || (sourceAgencyId ? [sourceAgencyId] : []);
    const targetIds: string[] = rawTargetAgencyIds || (targetAgencyId ? [targetAgencyId] : []);

    // Validate required fields
    if (sourceIds.length === 0 || targetIds.length === 0 || !count) {
      return NextResponse.json(
        { error: "출발/도착 업체와 수량이 필요합니다." },
        { status: 400 }
      );
    }

    if (typeof count !== "number" || count <= 0) {
      return NextResponse.json(
        { error: "이송 수량은 1 이상이어야 합니다." },
        { status: 400 }
      );
    }

    // Validate source and target don't fully overlap
    const sourceSet = new Set(sourceIds);
    const targetSet = new Set(targetIds);
    const allOverlap = sourceIds.every((id) => targetSet.has(id)) && targetIds.every((id) => sourceSet.has(id));
    if (allOverlap) {
      return NextResponse.json(
        { error: "출발 그룹과 도착 그룹이 동일합니다." },
        { status: 400 }
      );
    }

    // Validate agencies exist
    const [sourceAgencyList, targetAgencyList] = await Promise.all([
      db.select().from(agencies).where(inArray(agencies.id, sourceIds)),
      db.select().from(agencies).where(inArray(agencies.id, targetIds)),
    ]);

    if (sourceAgencyList.length === 0) {
      return NextResponse.json(
        { error: "출발 업체를 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    if (targetAgencyList.length === 0) {
      return NextResponse.json(
        { error: "도착 업체를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 유심 선택: usimIds가 제공되면 특정 유심, 아니면 배정일 오래된 순으로 count개
    let selectedUsims: { id: string; usimSerialNumber: string }[];

    if (rawUsimIds && Array.isArray(rawUsimIds) && rawUsimIds.length > 0) {
      // 특정 유심 ID 지정 모드
      selectedUsims = await db
        .select({ id: usims.id, usimSerialNumber: usims.usimSerialNumber })
        .from(usims)
        .where(
          and(
            inArray(usims.id, rawUsimIds),
            inArray(usims.agencyId, sourceIds),
            eq(usims.status, "ASSIGNED")
          )
        );

      if (selectedUsims.length !== rawUsimIds.length) {
        return NextResponse.json(
          {
            error: `선택한 유심 중 일부가 유효하지 않습니다. (요청: ${rawUsimIds.length}건, 유효: ${selectedUsims.length}건)`,
          },
          { status: 400 }
        );
      }
    } else {
      // 수량 기반 선택 모드 (배정일 오래된 순)
      selectedUsims = await db
        .select({ id: usims.id, usimSerialNumber: usims.usimSerialNumber })
        .from(usims)
        .where(
          and(
            inArray(usims.agencyId, sourceIds),
            eq(usims.status, "ASSIGNED")
          )
        )
        .orderBy(asc(usims.assignedDate), asc(usims.createdAt))
        .limit(count);

      if (selectedUsims.length < count) {
        return NextResponse.json(
          {
            error: `출발 그룹의 배정 가능 유심이 부족합니다. (요청: ${count}건, 가용: ${selectedUsims.length}건)`,
          },
          { status: 400 }
        );
      }
    }

    // Assign USIMs to the first target agency
    const primaryTargetId = targetIds[0];
    const usimIdList = selectedUsims.map((u) => u.id);
    let updatedCount = 0;

    for (const usimId of usimIdList) {
      await db
        .update(usims)
        .set({
          agencyId: primaryTargetId,
          updatedAt: new Date(),
        })
        .where(eq(usims.id, usimId));
      updatedCount++;
    }

    // Log the transfer
    const sourceNames = sourceAgencyList.map((a) => a.name).join(", ");
    const targetNames = targetAgencyList.map((a) => a.name).join(", ");
    const notesText = notes ? ` (메모: ${notes})` : "";

    try {
      await addUsimLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: "transfer",
        details: `유심 이송: [${sourceNames}] -> [${targetNames}] ${updatedCount}건${notesText}`,
        agencyId: sourceIds[0],
        agencyName: sourceAgencyList[0].name,
        targetAgencyId: primaryTargetId,
        targetAgencyName: targetAgencyList[0].name,
        usimCount: updatedCount,
      });
    } catch (logError) {
      console.error("Failed to write usim transfer log:", logError);
    }

    return NextResponse.json({
      success: true,
      transferred: updatedCount,
      message: `유심 ${updatedCount}건 이송 완료`,
    });
  } catch (error) {
    console.error("Failed to transfer usims:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
