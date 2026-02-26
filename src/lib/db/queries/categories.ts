import { db } from "@/lib/db";
import { agencyCategories, agencies } from "@/lib/db/schema";
import { eq, and, or, inArray, count } from "drizzle-orm";

export async function getMajorCategories() {
  return db
    .select()
    .from(agencyCategories)
    .where(
      and(
        eq(agencyCategories.level, "major"),
        eq(agencyCategories.isActive, true)
      )
    )
    .orderBy(agencyCategories.sortOrder);
}

export async function getMediumCategories(majorId: string) {
  return db
    .select()
    .from(agencyCategories)
    .where(
      and(
        eq(agencyCategories.level, "medium"),
        eq(agencyCategories.parentId, majorId),
        eq(agencyCategories.isActive, true)
      )
    )
    .orderBy(agencyCategories.sortOrder);
}

export async function getCategoryTree() {
  const all = await db
    .select()
    .from(agencyCategories)
    .where(eq(agencyCategories.isActive, true))
    .orderBy(agencyCategories.sortOrder);

  const majors = all.filter((c) => c.level === "major");
  return majors.map((major) => ({
    ...major,
    children: all.filter(
      (c) => c.level === "medium" && c.parentId === major.id
    ),
  }));
}

export async function getAgencyIdsByMediumCategories(
  mediumCategoryIds: string[]
) {
  if (mediumCategoryIds.length === 0) return [];
  const result = await db
    .select({ id: agencies.id })
    .from(agencies)
    .where(
      and(
        inArray(agencies.mediumCategory, mediumCategoryIds),
        eq(agencies.isActive, true)
      )
    );
  return result.map((r) => r.id);
}

export async function getAgencyIdsByMajorCategory(majorId: string) {
  const result = await db
    .select({ id: agencies.id })
    .from(agencies)
    .where(
      and(eq(agencies.majorCategory, majorId), eq(agencies.isActive, true))
    );
  return result.map((r) => r.id);
}

// ── 수정 ──
export async function updateCategory(id: string, data: { name: string }) {
  const result = await db
    .update(agencyCategories)
    .set({ name: data.name })
    .where(eq(agencyCategories.id, id))
    .returning();
  return result[0];
}

// ── 소프트 삭제 ──
export async function softDeleteCategory(id: string) {
  const result = await db
    .update(agencyCategories)
    .set({ isActive: false })
    .where(eq(agencyCategories.id, id))
    .returning();
  return result[0];
}

// ── 연결된 거래처 수 확인 ──
export async function getLinkedAgencyCount(categoryId: string) {
  const result = await db
    .select({ cnt: count() })
    .from(agencies)
    .where(
      and(
        or(
          eq(agencies.majorCategory, categoryId),
          eq(agencies.mediumCategory, categoryId)
        ),
        eq(agencies.isActive, true)
      )
    );
  return result[0]?.cnt ?? 0;
}

// ── 대분류에 소속된 활성 중분류 수 확인 ──
export async function getChildCategoryCount(majorId: string) {
  const result = await db
    .select({ cnt: count() })
    .from(agencyCategories)
    .where(
      and(
        eq(agencyCategories.parentId, majorId),
        eq(agencyCategories.level, "medium"),
        eq(agencyCategories.isActive, true)
      )
    );
  return result[0]?.cnt ?? 0;
}

export async function createCategory(data: {
  id: string;
  name: string;
  level: "major" | "medium";
  parentId?: string;
  sortOrder?: number;
}) {
  const result = await db
    .insert(agencyCategories)
    .values({
      id: data.id,
      name: data.name,
      level: data.level,
      parentId: data.parentId ?? null,
      sortOrder: data.sortOrder ?? 0,
      isActive: true,
    })
    .returning();
  return result[0];
}
