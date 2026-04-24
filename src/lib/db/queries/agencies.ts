import { db } from "@/lib/db";
import { agencyCategories } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

/**
 * 거래처 = agency_categories.level='medium' 행 (1:1 통합됨).
 * 기존 호출자와 호환되도록 Agency shape으로 매핑해서 반환한다.
 *
 * Shape: { id, name, majorCategory, mediumCategory, contactName, contactPhone,
 *          commissionRate, deductionRate, isActive, createdAt }
 *   - majorCategory  = parentId (대분류 id)
 *   - mediumCategory = id (자기 자신)
 */
type AgencyRow = {
  id: string;
  name: string;
  majorCategory: string | null;
  mediumCategory: string;
  contactName: string | null;
  contactPhone: string | null;
  commissionRate: number | null;
  deductionRate: number | null;
  isActive: boolean;
  createdAt: Date | null;
};

function toAgency(row: typeof agencyCategories.$inferSelect): AgencyRow {
  return {
    id: row.id,
    name: row.name,
    majorCategory: row.parentId,
    mediumCategory: row.id,
    contactName: row.contactName,
    contactPhone: row.contactPhone,
    commissionRate: row.commissionRate,
    deductionRate: row.deductionRate,
    isActive: row.isActive ?? true,
    createdAt: row.createdAt,
  };
}

export async function getAgencies(activeOnly = true): Promise<AgencyRow[]> {
  const rows = activeOnly
    ? await db
        .select()
        .from(agencyCategories)
        .where(
          and(
            eq(agencyCategories.level, "medium"),
            eq(agencyCategories.isActive, true)
          )
        )
        .orderBy(asc(agencyCategories.name))
    : await db
        .select()
        .from(agencyCategories)
        .where(eq(agencyCategories.level, "medium"))
        .orderBy(asc(agencyCategories.name));

  return rows.map(toAgency);
}

export async function getAgencyById(id: string): Promise<AgencyRow | null> {
  const result = await db
    .select()
    .from(agencyCategories)
    .where(
      and(eq(agencyCategories.id, id), eq(agencyCategories.level, "medium"))
    )
    .limit(1);
  return result[0] ? toAgency(result[0]) : null;
}

/**
 * 거래처 생성 = 중분류 생성 (연락처·수수료 포함).
 * parentId(대분류 id)는 필수.
 */
export async function createAgency(data: {
  id: string;
  name: string;
  majorCategory: string;
  contactName?: string | null;
  contactPhone?: string | null;
  commissionRate?: number | null;
  deductionRate?: number | null;
  isActive?: boolean;
}): Promise<AgencyRow> {
  const result = await db
    .insert(agencyCategories)
    .values({
      id: data.id,
      name: data.name,
      level: "medium",
      parentId: data.majorCategory,
      sortOrder: 0,
      isActive: data.isActive ?? true,
      contactName: data.contactName ?? null,
      contactPhone: data.contactPhone ?? null,
      commissionRate: data.commissionRate ?? null,
      deductionRate: data.deductionRate ?? null,
    })
    .returning();
  return toAgency(result[0]);
}

export async function updateAgency(
  id: string,
  data: Partial<{
    name: string;
    majorCategory: string;
    contactName: string | null;
    contactPhone: string | null;
    commissionRate: number | null;
    deductionRate: number | null;
    isActive: boolean;
  }>
): Promise<AgencyRow | null> {
  const update: Partial<typeof agencyCategories.$inferInsert> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.majorCategory !== undefined) update.parentId = data.majorCategory;
  if (data.contactName !== undefined) update.contactName = data.contactName;
  if (data.contactPhone !== undefined) update.contactPhone = data.contactPhone;
  if (data.commissionRate !== undefined)
    update.commissionRate = data.commissionRate;
  if (data.deductionRate !== undefined)
    update.deductionRate = data.deductionRate;
  if (data.isActive !== undefined) update.isActive = data.isActive;

  const result = await db
    .update(agencyCategories)
    .set(update)
    .where(
      and(eq(agencyCategories.id, id), eq(agencyCategories.level, "medium"))
    )
    .returning();
  return result[0] ? toAgency(result[0]) : null;
}
