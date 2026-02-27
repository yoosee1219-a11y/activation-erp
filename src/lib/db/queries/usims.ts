import { db } from "@/lib/db";
import { usims, agencies, activations } from "@/lib/db/schema";
import { eq, and, inArray, sql, count, desc, asc } from "drizzle-orm";

// ─── Types ───
export type UsimStatus = "ASSIGNED" | "USED" | "CANCELLED" | "RESET_READY";

export interface UsimRow {
  id: string;
  usimSerialNumber: string;
  agencyId: string;
  agencyName?: string;
  status: string;
  assignedDate: string;
  usedDate: string | null;
  cancelledDate: string | null;
  resetDate: string | null;
  usedActivationId: string | null;
  notes: string | null;
  createdAt: Date | null;
}

export interface UsimAgencyStats {
  agencyId: string;
  agencyName: string;
  totalAssigned: number; // 전체 배정 (ASSIGNED + USED + CANCELLED + RESET_READY)
  currentStock: number; // 현재 재고 (ASSIGNED + RESET_READY)
  used: number; // 사용 완료 (USED)
  cancelled: number; // 개통취소 (CANCELLED)
  resetReady: number; // 초기화 완료 (RESET_READY)
}

// ─── 업체별 유심 목록 조회 ───
export async function getUsimsByAgency(
  agencyId: string,
  opts?: {
    status?: UsimStatus;
    page?: number;
    pageSize?: number;
  }
) {
  const page = opts?.page || 1;
  const pageSize = opts?.pageSize || 100;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(usims.agencyId, agencyId)];
  if (opts?.status) {
    conditions.push(eq(usims.status, opts.status));
  }

  const whereClause = and(...conditions);

  const [data, totalResult] = await Promise.all([
    db
      .select({
        id: usims.id,
        usimSerialNumber: usims.usimSerialNumber,
        agencyId: usims.agencyId,
        status: usims.status,
        assignedDate: usims.assignedDate,
        usedDate: usims.usedDate,
        cancelledDate: usims.cancelledDate,
        resetDate: usims.resetDate,
        usedActivationId: usims.usedActivationId,
        notes: usims.notes,
        createdAt: usims.createdAt,
      })
      .from(usims)
      .where(whereClause)
      .orderBy(asc(usims.usimSerialNumber))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(usims)
      .where(whereClause),
  ]);

  return {
    data,
    total: totalResult[0]?.count || 0,
    page,
    pageSize,
  };
}

// ─── 전체 유심 목록 (관리자용, 다중 업체) ───
export async function getUsims(opts?: {
  agencyIds?: string[];
  status?: UsimStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = opts?.page || 1;
  const pageSize = opts?.pageSize || 100;
  const offset = (page - 1) * pageSize;

  const conditions: ReturnType<typeof eq>[] = [];

  if (opts?.agencyIds && opts.agencyIds.length > 0) {
    conditions.push(inArray(usims.agencyId, opts.agencyIds));
  }
  if (opts?.status) {
    conditions.push(eq(usims.status, opts.status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // search는 usimSerialNumber LIKE 로 처리
  const searchCondition = opts?.search
    ? and(
        ...[
          ...conditions,
          sql`${usims.usimSerialNumber} ILIKE ${"%" + opts.search + "%"}`,
        ]
      )
    : whereClause;

  const [data, totalResult] = await Promise.all([
    db
      .select({
        id: usims.id,
        usimSerialNumber: usims.usimSerialNumber,
        agencyId: usims.agencyId,
        agencyName: agencies.name,
        status: usims.status,
        assignedDate: usims.assignedDate,
        usedDate: usims.usedDate,
        cancelledDate: usims.cancelledDate,
        resetDate: usims.resetDate,
        usedActivationId: usims.usedActivationId,
        notes: usims.notes,
        createdAt: usims.createdAt,
      })
      .from(usims)
      .leftJoin(agencies, eq(usims.agencyId, agencies.id))
      .where(searchCondition)
      .orderBy(asc(usims.agencyId), asc(usims.usimSerialNumber))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(usims)
      .where(searchCondition),
  ]);

  return {
    data,
    total: totalResult[0]?.count || 0,
    page,
    pageSize,
  };
}

// ─── 업체별 유심 재고 통계 ───
export async function getUsimStatsByAgency(agencyIds?: string[]): Promise<UsimAgencyStats[]> {
  const conditions = agencyIds && agencyIds.length > 0
    ? inArray(usims.agencyId, agencyIds)
    : undefined;

  const rows = await db
    .select({
      agencyId: usims.agencyId,
      agencyName: agencies.name,
      status: usims.status,
      cnt: count(),
    })
    .from(usims)
    .leftJoin(agencies, eq(usims.agencyId, agencies.id))
    .where(conditions)
    .groupBy(usims.agencyId, agencies.name, usims.status);

  // Aggregate by agency
  const map = new Map<string, UsimAgencyStats>();
  for (const row of rows) {
    if (!map.has(row.agencyId)) {
      map.set(row.agencyId, {
        agencyId: row.agencyId,
        agencyName: row.agencyName || row.agencyId,
        totalAssigned: 0,
        currentStock: 0,
        used: 0,
        cancelled: 0,
        resetReady: 0,
      });
    }
    const s = map.get(row.agencyId)!;
    const c = Number(row.cnt);
    s.totalAssigned += c;
    switch (row.status) {
      case "ASSIGNED":
        s.currentStock += c;
        break;
      case "USED":
        s.used += c;
        break;
      case "CANCELLED":
        s.cancelled += c;
        break;
      case "RESET_READY":
        s.currentStock += c;
        s.resetReady += c;
        break;
    }
  }

  return Array.from(map.values()).sort((a, b) => a.agencyName.localeCompare(b.agencyName));
}

// ─── 유심 일괄 배정 ───
export async function assignUsims(
  agencyId: string,
  serialNumbers: string[],
  assignedDate: string
) {
  if (serialNumbers.length === 0) return { created: 0, duplicates: [] };

  // 이미 존재하는 유심 확인
  const existing = await db
    .select({ usimSerialNumber: usims.usimSerialNumber })
    .from(usims)
    .where(inArray(usims.usimSerialNumber, serialNumbers));

  const existingSet = new Set(existing.map((e) => e.usimSerialNumber));
  const newSerials = serialNumbers.filter((s) => !existingSet.has(s));
  const duplicates = serialNumbers.filter((s) => existingSet.has(s));

  if (newSerials.length > 0) {
    await db.insert(usims).values(
      newSerials.map((serial) => ({
        usimSerialNumber: serial,
        agencyId,
        status: "ASSIGNED" as const,
        assignedDate,
      }))
    );
  }

  return { created: newSerials.length, duplicates };
}

// ─── 유심 상태 변경 (단건) ───
export async function updateUsimStatus(
  usimId: string,
  status: UsimStatus,
  extra?: { usedActivationId?: string; notes?: string }
) {
  const now = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };

  switch (status) {
    case "USED":
      updateData.usedDate = now;
      if (extra?.usedActivationId) updateData.usedActivationId = extra.usedActivationId;
      break;
    case "CANCELLED":
      updateData.cancelledDate = now;
      break;
    case "RESET_READY":
      updateData.resetDate = now;
      break;
    case "ASSIGNED":
      // 초기화 (재배정 등)
      updateData.usedDate = null;
      updateData.cancelledDate = null;
      updateData.resetDate = null;
      updateData.usedActivationId = null;
      break;
  }

  if (extra?.notes !== undefined) updateData.notes = extra.notes;

  const result = await db
    .update(usims)
    .set(updateData)
    .where(eq(usims.id, usimId))
    .returning();

  return result[0];
}

// ─── 유심 일괄 초기화 (CANCELLED → RESET_READY) ───
export async function resetUsims(usimIds: string[]) {
  if (usimIds.length === 0) return { updated: 0 };

  const now = new Date().toISOString().split("T")[0];
  const result = await db
    .update(usims)
    .set({
      status: "RESET_READY",
      resetDate: now,
      updatedAt: new Date(),
    })
    .where(
      and(
        inArray(usims.id, usimIds),
        eq(usims.status, "CANCELLED")
      )
    )
    .returning();

  return { updated: result.length };
}

// ─── 유심번호로 유심 찾기 (개통 연동용) ───
export async function findUsimBySerialNumber(serialNumber: string) {
  const rows = await db
    .select()
    .from(usims)
    .where(eq(usims.usimSerialNumber, serialNumber))
    .limit(1);

  return rows[0] || null;
}

// ─── 유심 사용 처리 (개통 시 자동) ───
export async function markUsimUsed(
  serialNumber: string,
  agencyId: string,
  activationId: string
) {
  const now = new Date().toISOString().split("T")[0];

  // 해당 업체에 배정된 사용 가능 유심인지 확인 (ASSIGNED 또는 RESET_READY)
  const usim = await db
    .select()
    .from(usims)
    .where(
      and(
        eq(usims.usimSerialNumber, serialNumber),
        eq(usims.agencyId, agencyId),
        inArray(usims.status, ["ASSIGNED", "RESET_READY"])
      )
    )
    .limit(1);

  if (usim.length === 0) return null; // 매칭 안됨 (배정 안됨 or 이미 사용)

  const result = await db
    .update(usims)
    .set({
      status: "USED",
      usedDate: now,
      usedActivationId: activationId,
      updatedAt: new Date(),
    })
    .where(eq(usims.id, usim[0].id))
    .returning();

  return result[0];
}

// ─── 유심 개통취소 처리 ───
export async function markUsimCancelled(activationId: string) {
  const now = new Date().toISOString().split("T")[0];

  const result = await db
    .update(usims)
    .set({
      status: "CANCELLED",
      cancelledDate: now,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(usims.usedActivationId, activationId),
        eq(usims.status, "USED")
      )
    )
    .returning();

  return result[0] || null;
}

// ─── 유심 삭제 (관리자 전용) ───
export async function deleteUsim(usimId: string) {
  await db.delete(usims).where(eq(usims.id, usimId));
}

// ─── 유심 일괄 삭제 (관리자 전용) ───
export async function deleteUsims(usimIds: string[]) {
  if (usimIds.length === 0) return;
  await db.delete(usims).where(inArray(usims.id, usimIds));
}
