import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activations, activationLogs } from "@/lib/db/schema";
import { and, eq, lt, lte, isNull, isNotNull, ne, sql } from "drizzle-orm";


export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  let alertCount = 0;
  let terminateCount = 0;

  try {
    // Step 1: Set termination alert for overdue items (no alert yet)
    const overdueItems = await db
      .select({
        id: activations.id,
        customerName: activations.customerName,
        agencyId: activations.agencyId,
      })
      .from(activations)
      .where(
        and(
          lt(activations.arcSupplementDeadline, today),
          ne(
            sql`COALESCE(${activations.supplementStatus}, '')`,
            "완료"
          ),
          eq(activations.workStatus, "개통완료"),
          isNull(activations.terminationAlertDate)
        )
      );

    for (const item of overdueItems) {
      await db
        .update(activations)
        .set({ terminationAlertDate: today })
        .where(eq(activations.id, item.id));

      await db.insert(activationLogs).values({
        activationId: item.id,
        userId: "system",
        userName: "시스템",
        userRole: "SYSTEM",
        action: "termination_alert",
        details: "시스템: 보완기한 초과로 해지예고 설정 (7일 유예)",
      });
      alertCount++;
    }

    // Step 2: Auto-terminate items where alert was set 7+ days ago
    const alertedItems = await db
      .select({
        id: activations.id,
        customerName: activations.customerName,
        agencyId: activations.agencyId,
      })
      .from(activations)
      .where(
        and(
          isNotNull(activations.terminationAlertDate),
          lte(activations.terminationAlertDate, sevenDaysAgoStr),
          ne(activations.workStatus, "해지"),
          ne(
            sql`COALESCE(${activations.supplementStatus}, '')`,
            "완료"
          )
        )
      );

    for (const item of alertedItems) {
      await db
        .update(activations)
        .set({
          workStatus: "해지",
          terminationDate: today,
          terminationReason: "보완기한초과",
          isLocked: true,
          lockedAt: new Date(),
          lockedBy: "system",
        })
        .where(eq(activations.id, item.id));

      await db.insert(activationLogs).values({
        activationId: item.id,
        userId: "system",
        userName: "시스템",
        userRole: "SYSTEM",
        action: "termination",
        details: "시스템: 자동 해지 처리 (보완기한초과, 7일 유예 경과)",
      });
      terminateCount++;
    }

    return NextResponse.json({
      success: true,
      alertCount,
      terminateCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron termination error:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
