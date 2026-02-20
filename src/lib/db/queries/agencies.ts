import { db } from "@/lib/db";
import { agencies } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getAgencies(activeOnly = true) {
  if (activeOnly) {
    return db
      .select()
      .from(agencies)
      .where(eq(agencies.isActive, true))
      .orderBy(agencies.name);
  }
  return db.select().from(agencies).orderBy(agencies.name);
}

export async function getAgencyById(id: string) {
  const result = await db
    .select()
    .from(agencies)
    .where(eq(agencies.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createAgency(data: typeof agencies.$inferInsert) {
  const result = await db.insert(agencies).values(data).returning();
  return result[0];
}

export async function updateAgency(
  id: string,
  data: Partial<typeof agencies.$inferInsert>
) {
  const result = await db
    .update(agencies)
    .set(data)
    .where(eq(agencies.id, id))
    .returning();
  return result[0];
}
