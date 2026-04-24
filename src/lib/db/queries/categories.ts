import { db } from "@/lib/db";
import { agencyCategories } from "@/lib/db/schema";
import { eq, and, inArray, count } from "drizzle-orm";

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

// 중분류 = 거래처 (1:1). 아래 함수들은 agency_categories(level='medium')만 본다.
export async function getAgencyIdsByMediumCategories(
  mediumCategoryIds: string[]
) {
  if (mediumCategoryIds.length === 0) return [];
  const result = await db
    .select({ id: agencyCategories.id })
    .from(agencyCategories)
    .where(
      and(
        eq(agencyCategories.level, "medium"),
        inArray(agencyCategories.id, mediumCategoryIds),
        eq(agencyCategories.isActive, true)
      )
    );
  return result.map((r) => r.id);
}

export async function getAgencyIdsByMajorCategory(majorId: string) {
  const result = await db
    .select({ id: agencyCategories.id })
    .from(agencyCategories)
    .where(
      and(
        eq(agencyCategories.level, "medium"),
        eq(agencyCategories.parentId, majorId),
        eq(agencyCategories.isActive, true)
      )
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

// ── 연결된 거래처(=중분류) 수 확인 ──
// 중분류 = 거래처이므로, 대분류 id에 속한 활성 중분류 수를 셈.
// 자기 자신(medium id)에 대한 호출은 0 반환 (자기 자신을 삭제하면 연결된 거래처 없음).
export async function getLinkedAgencyCount(categoryId: string) {
  const result = await db
    .select({ cnt: count() })
    .from(agencyCategories)
    .where(
      and(
        eq(agencyCategories.level, "medium"),
        eq(agencyCategories.parentId, categoryId),
        eq(agencyCategories.isActive, true)
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

export class CategoryAlreadyActiveError extends Error {
  constructor(public id: string) {
    super(`Category "${id}" already exists and is active`);
    this.name = "CategoryAlreadyActiveError";
  }
}

export async function createCategory(data: {
  id: string;
  name: string;
  level: "major" | "medium";
  parentId?: string;
  sortOrder?: number;
}) {
  // 동일 id가 이미 존재하면 활성/비활성 분기
  const existing = await db
    .select()
    .from(agencyCategories)
    .where(eq(agencyCategories.id, data.id))
    .limit(1);

  if (existing.length > 0) {
    if (existing[0].isActive) {
      throw new CategoryAlreadyActiveError(data.id);
    }
    // soft-deleted 상태면 부활
    const resurrected = await db
      .update(agencyCategories)
      .set({
        name: data.name,
        level: data.level,
        parentId: data.parentId ?? null,
        sortOrder: data.sortOrder ?? 0,
        isActive: true,
      })
      .where(eq(agencyCategories.id, data.id))
      .returning();
    return resurrected[0];
  }

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
