import { db } from "@/lib/db";
import { activations, agencies } from "@/lib/db/schema";
import { eq, and, desc, sql, count, ilike, gte, lte } from "drizzle-orm";

export async function getActivations(params: {
  agencyId?: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  const {
    agencyId,
    status,
    search,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = 50,
  } = params;

  const conditions = [];

  if (agencyId) {
    conditions.push(eq(activations.agencyId, agencyId));
  }
  if (status) {
    conditions.push(eq(activations.activationStatus, status));
  }
  if (search) {
    conditions.push(ilike(activations.customerName, `%${search}%`));
  }
  if (dateFrom) {
    conditions.push(gte(activations.createdAt, new Date(dateFrom)));
  }
  if (dateTo) {
    conditions.push(lte(activations.createdAt, new Date(dateTo)));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, totalResult] = await Promise.all([
    db
      .select()
      .from(activations)
      .where(where)
      .orderBy(desc(activations.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: count() }).from(activations).where(where),
  ]);

  return {
    data,
    total: totalResult[0]?.count ?? 0,
    page,
    pageSize,
  };
}

export async function getActivationById(id: string) {
  const result = await db
    .select()
    .from(activations)
    .where(eq(activations.id, id))
    .limit(1);

  return result[0] ?? null;
}

export async function createActivation(
  data: typeof activations.$inferInsert
) {
  const result = await db.insert(activations).values(data).returning();
  return result[0];
}

export async function updateActivation(
  id: string,
  data: Partial<typeof activations.$inferInsert>
) {
  const result = await db
    .update(activations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(activations.id, id))
    .returning();
  return result[0];
}

export async function deleteActivation(id: string) {
  await db.delete(activations).where(eq(activations.id, id));
}

export async function getDashboardStats(agencyId?: string) {
  const conditions = agencyId
    ? [eq(activations.agencyId, agencyId)]
    : [];
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult, pendingResult, completedResult, autopayPendingResult] =
    await Promise.all([
      db.select({ count: count() }).from(activations).where(where),
      db
        .select({ count: count() })
        .from(activations)
        .where(
          where
            ? and(where, eq(activations.activationStatus, "대기"))
            : eq(activations.activationStatus, "대기")
        ),
      db
        .select({ count: count() })
        .from(activations)
        .where(
          where
            ? and(where, eq(activations.activationStatus, "개통완료"))
            : eq(activations.activationStatus, "개통완료")
        ),
      db
        .select({ count: count() })
        .from(activations)
        .where(
          where
            ? and(where, eq(activations.autopayRegistered, false))
            : eq(activations.autopayRegistered, false)
        ),
    ]);

  return {
    total: totalResult[0]?.count ?? 0,
    pending: pendingResult[0]?.count ?? 0,
    completed: completedResult[0]?.count ?? 0,
    autopayPending: autopayPendingResult[0]?.count ?? 0,
  };
}

export async function getMonthlyStats(agencyId?: string) {
  const conditions = agencyId
    ? `WHERE agency_id = '${agencyId}'`
    : "";

  const result = await db.execute(sql.raw(`
    SELECT
      TO_CHAR(created_at, 'YYYY-MM') as month,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE activation_status = '개통완료') as completed,
      COUNT(*) FILTER (WHERE activation_status = '대기') as pending
    FROM activations
    ${conditions}
    GROUP BY TO_CHAR(created_at, 'YYYY-MM')
    ORDER BY month DESC
    LIMIT 12
  `));

  return result.rows;
}

export async function getAgencyStats() {
  const result = await db
    .select({
      agencyId: activations.agencyId,
      agencyName: agencies.name,
      total: count(),
    })
    .from(activations)
    .leftJoin(agencies, eq(activations.agencyId, agencies.id))
    .groupBy(activations.agencyId, agencies.name)
    .orderBy(desc(count()));

  return result;
}
