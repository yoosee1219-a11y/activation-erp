import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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
  if (userRole === "ADMIN") return true;
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
