import { db } from "@/lib/db";
import { userProfiles, agencyCategories } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import type { UserRole } from "@/types";

export async function getUserProfile(userId: string) {
  const result = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, userId))
    .limit(1);
  return result[0] ?? null;
}

export async function getAllUsers() {
  return db.select().from(userProfiles).orderBy(userProfiles.name);
}

export async function createUserProfile(data: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  allowedAgencies: string[];
  allowedMajorCategory?: string | null;
  allowedMediumCategories?: string[];
}) {
  const result = await db.insert(userProfiles).values(data).returning();
  return result[0];
}

export async function updateUserProfile(
  id: string,
  data: Partial<{
    name: string;
    role: UserRole;
    allowedAgencies: string[];
    allowedMajorCategory: string | null;
    allowedMediumCategories: string[];
  }>
) {
  const result = await db
    .update(userProfiles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(userProfiles.id, id))
    .returning();
  return result[0];
}

export async function deleteUserProfile(id: string) {
  await db.delete(userProfiles).where(eq(userProfiles.id, id));
}

export function canAccessAgency(
  userRole: UserRole,
  allowedAgencies: string[],
  agencyId: string
): boolean {
  if (userRole === "ADMIN" || userRole === "SUB_ADMIN") return true;
  if (allowedAgencies.includes("ALL")) return true;
  return allowedAgencies.includes(agencyId);
}

export function getAccessibleAgencyFilter(
  userRole: UserRole,
  allowedAgencies: string[]
): string[] | null {
  if (userRole === "ADMIN" || allowedAgencies.includes("ALL")) {
    return null; // 전체 접근
  }
  return allowedAgencies;
}

/**
 * 사용자의 카테고리/에이전시 설정을 기반으로 접근 가능한 agencyId[] 반환.
 * - ADMIN / ALL → null (전체 접근)
 * - allowedAgencies에 직접 지정된 값이 있으면 → 그대로 반환 (하위 호환)
 * - allowedMediumCategories → 해당 중분류에 속하는 agencies 조회
 * - allowedMajorCategory만 → 해당 대분류에 속하는 agencies 조회
 */
export async function resolveAllowedAgencyIds(user: {
  role: string;
  allowedAgencies: string[];
  allowedMajorCategory: string | null;
  allowedMediumCategories: string[];
}): Promise<string[] | null> {
  if (user.role === "ADMIN" || user.role === "SUB_ADMIN") return null;
  if (user.allowedAgencies.includes("ALL")) return null;

  // 직접 지정된 에이전시가 있으면 우선 사용 (하위 호환)
  if (user.allowedAgencies.length > 0) {
    return user.allowedAgencies;
  }

  // 중분류 기반 해석 (중분류 = 거래처)
  if (user.allowedMediumCategories.length > 0) {
    const result = await db
      .select({ id: agencyCategories.id })
      .from(agencyCategories)
      .where(
        and(
          eq(agencyCategories.level, "medium"),
          inArray(agencyCategories.id, user.allowedMediumCategories),
          eq(agencyCategories.isActive, true)
        )
      );
    return result.map((r) => r.id);
  }

  // 대분류 기반 해석 → 하위 중분류 전체
  if (user.allowedMajorCategory) {
    const result = await db
      .select({ id: agencyCategories.id })
      .from(agencyCategories)
      .where(
        and(
          eq(agencyCategories.level, "medium"),
          eq(agencyCategories.parentId, user.allowedMajorCategory),
          eq(agencyCategories.isActive, true)
        )
      );
    return result.map((r) => r.id);
  }

  return [];
}
