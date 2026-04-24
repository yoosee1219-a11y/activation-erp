import { db } from "@/lib/db";
import { usimLogs, agencyCategories, activations } from "@/lib/db/schema";
import { eq, and, inArray, sql, gte, lt, desc } from "drizzle-orm";

// ─── Types ───
export interface UsimStockRow {
  agencyId: string;
  agencyName: string;
  totalAssigned: number; // 총 배정 수량
  transferIn: number; // 이송 입고
  transferOut: number; // 이송 출고
  currentStock: number; // 현재 재고 (배정 + 입고 - 출고)
}

export interface UsimLogRow {
  id: string;
  action: string;
  agencyId: string | null;
  agencyName: string | null;
  targetAgencyId: string | null;
  targetAgencyName: string | null;
  usimCount: number | null;
  details: string;
  userName: string;
  createdAt: Date | null;
}

// ─── 유심 배정 (수량) ───
export async function assignUsims(
  agencyId: string,
  agencyName: string,
  quantity: number,
  date: string,
  performedBy: { id: string; name: string; role: string }
) {
  await db.insert(usimLogs).values({
    userId: performedBy.id,
    userName: performedBy.name,
    userRole: performedBy.role,
    action: "assign",
    agencyId,
    agencyName,
    usimCount: quantity,
    details: `${agencyName}에 유심 ${quantity}개 배정 (${date})`,
  });

  return { assigned: quantity };
}

// ─── 유심 이송 (수량) ───
export async function transferUsims(
  fromAgencyId: string,
  fromAgencyName: string,
  toAgencyId: string,
  toAgencyName: string,
  quantity: number,
  date: string,
  performedBy: { id: string; name: string; role: string }
) {
  // 출고 기록
  await db.insert(usimLogs).values({
    userId: performedBy.id,
    userName: performedBy.name,
    userRole: performedBy.role,
    action: "transfer",
    agencyId: fromAgencyId,
    agencyName: fromAgencyName,
    targetAgencyId: toAgencyId,
    targetAgencyName: toAgencyName,
    usimCount: -quantity, // 출고는 마이너스
    details: `${fromAgencyName} → ${toAgencyName} 유심 ${quantity}개 이송 (${date})`,
  });

  // 입고 기록
  await db.insert(usimLogs).values({
    userId: performedBy.id,
    userName: performedBy.name,
    userRole: performedBy.role,
    action: "transfer",
    agencyId: toAgencyId,
    agencyName: toAgencyName,
    targetAgencyId: fromAgencyId,
    targetAgencyName: fromAgencyName,
    usimCount: quantity, // 입고는 플러스
    details: `${fromAgencyName} → ${toAgencyName} 유심 ${quantity}개 이송 (${date})`,
  });

  return { transferred: quantity };
}

// ─── 거래처별 유심 재고 현황 ───
export async function getUsimStockByAgency(
  agencyIds?: string[]
): Promise<UsimStockRow[]> {
  // usim_logs에서 거래처별 합산
  const conditions = agencyIds && agencyIds.length > 0
    ? inArray(usimLogs.agencyId, agencyIds)
    : undefined;

  const rows = await db
    .select({
      agencyId: usimLogs.agencyId,
      action: usimLogs.action,
      total: sql<number>`coalesce(sum(${usimLogs.usimCount}), 0)::int`,
    })
    .from(usimLogs)
    .where(conditions)
    .groupBy(usimLogs.agencyId, usimLogs.action);

  // 거래처(=중분류) 이름 조회
  const allAgencies = await db
    .select({ id: agencyCategories.id, name: agencyCategories.name })
    .from(agencyCategories)
    .where(eq(agencyCategories.level, "medium"));
  const agencyMap = new Map(allAgencies.map((a) => [a.id, a.name]));

  // 집계
  const stockMap = new Map<string, UsimStockRow>();
  for (const row of rows) {
    if (!row.agencyId) continue;
    if (!stockMap.has(row.agencyId)) {
      stockMap.set(row.agencyId, {
        agencyId: row.agencyId,
        agencyName: agencyMap.get(row.agencyId) || row.agencyId,
        totalAssigned: 0,
        transferIn: 0,
        transferOut: 0,
        currentStock: 0,
      });
    }
    const s = stockMap.get(row.agencyId)!;
    if (row.action === "assign") {
      s.totalAssigned += row.total;
    } else if (row.action === "transfer") {
      if (row.total > 0) s.transferIn += row.total;
      else s.transferOut += Math.abs(row.total);
    } else if (row.action === "adjust") {
      s.totalAssigned += row.total; // 수동 조정은 배정에 합산
    }
  }

  // 현재 재고 계산
  for (const s of stockMap.values()) {
    s.currentStock = s.totalAssigned + s.transferIn - s.transferOut;
  }

  return Array.from(stockMap.values()).sort((a, b) =>
    a.agencyName.localeCompare(b.agencyName)
  );
}

// ─── 이력 조회 ───
export async function getUsimLogs(limit = 100): Promise<UsimLogRow[]> {
  return db
    .select({
      id: usimLogs.id,
      action: usimLogs.action,
      agencyId: usimLogs.agencyId,
      agencyName: usimLogs.agencyName,
      targetAgencyId: usimLogs.targetAgencyId,
      targetAgencyName: usimLogs.targetAgencyName,
      usimCount: usimLogs.usimCount,
      details: usimLogs.details,
      userName: usimLogs.userName,
      createdAt: usimLogs.createdAt,
    })
    .from(usimLogs)
    .orderBy(desc(usimLogs.createdAt))
    .limit(limit);
}

// ─── 정산용: 해당 월 거래처별 유심 입고 수량 ───
export async function getMonthlyUsimReceived(
  agencyIds: string[],
  monthStart: string,
  monthEnd: string
): Promise<Map<string, number>> {
  if (agencyIds.length === 0) return new Map();

  // assign + transfer 입고(양수)만 합산
  const rows = await db
    .select({
      agencyId: usimLogs.agencyId,
      total: sql<number>`coalesce(sum(case when ${usimLogs.usimCount} > 0 then ${usimLogs.usimCount} else 0 end), 0)::int`,
    })
    .from(usimLogs)
    .where(
      and(
        inArray(usimLogs.agencyId, agencyIds),
        inArray(usimLogs.action, ["assign"]),
        gte(usimLogs.createdAt, new Date(monthStart)),
        lt(usimLogs.createdAt, new Date(monthEnd))
      )
    )
    .groupBy(usimLogs.agencyId);

  return new Map(rows.map((r) => [r.agencyId!, r.total]));
}
