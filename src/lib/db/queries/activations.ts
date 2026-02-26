import { db } from "@/lib/db";
import { activations, agencies } from "@/lib/db/schema";
import { eq, and, desc, sql, count, ilike, gte, lte, inArray } from "drizzle-orm";

export async function getActivations(params: {
  agencyId?: string;
  agencyIds?: string[];
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  month?: string;
  page?: number;
  pageSize?: number;
}) {
  const {
    agencyId,
    agencyIds,
    status,
    search,
    dateFrom,
    dateTo,
    month,
    page = 1,
    pageSize = 50,
  } = params;

  const conditions = [];

  if (agencyIds && agencyIds.length > 0) {
    conditions.push(inArray(activations.agencyId, agencyIds));
  } else if (agencyId) {
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
  if (month) {
    conditions.push(
      sql`TO_CHAR(COALESCE(${activations.activationDate}, ${activations.entryDate}, ${activations.createdAt}::date), 'YYYY-MM') = ${month}`
    );
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

export async function getAvailableMonths(agencyId?: string) {
  const agencyFilter = agencyId ? sql`WHERE agency_id = ${agencyId}` : sql``;

  const result = await db.execute(sql`
    SELECT
      TO_CHAR(COALESCE(activation_date, entry_date, created_at::date), 'YYYY-MM') as month,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE activation_status = '개통완료') as completed,
      COUNT(*) FILTER (WHERE activation_status = '대기') as pending,
      COUNT(*) FILTER (WHERE activation_status = '개통취소') as cancelled
    FROM activations
    ${agencyFilter}
    GROUP BY TO_CHAR(COALESCE(activation_date, entry_date, created_at::date), 'YYYY-MM')
    ORDER BY month DESC
  `);
  return result.rows;
}

export async function getMonthlyStats(agencyId?: string) {
  const agencyFilter = agencyId ? sql`WHERE agency_id = ${agencyId}` : sql``;

  const result = await db.execute(sql`
    SELECT
      TO_CHAR(COALESCE(activation_date, entry_date, created_at::date), 'YYYY-MM') as month,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE activation_status = '개통완료') as completed,
      COUNT(*) FILTER (WHERE activation_status = '대기') as pending
    FROM activations
    ${agencyFilter}
    GROUP BY TO_CHAR(COALESCE(activation_date, entry_date, created_at::date), 'YYYY-MM')
    ORDER BY month DESC
    LIMIT 12
  `);

  return result.rows;
}

export async function getAgencyStats() {
  const result = await db.execute(sql`
    SELECT
      a.agency_id as "agencyId",
      ag.name as "agencyName",
      COUNT(*) as "total",
      COUNT(*) FILTER (WHERE a.activation_status = '개통완료') as "completed",
      COUNT(*) FILTER (WHERE a.activation_status = '대기') as "pending",
      COUNT(*) FILTER (WHERE a.activation_status = '개통취소') as "cancelled",
      COUNT(*) FILTER (WHERE a.work_status = '작업중') as "working",
      COUNT(*) FILTER (WHERE a.autopay_registered = false) as "autopayPending"
    FROM activations a
    LEFT JOIN agencies ag ON a.agency_id = ag.id
    GROUP BY a.agency_id, ag.name
    ORDER BY ag.name
  `);
  return result.rows;
}

export async function getArcSupplementStats() {
  const result = await db.execute(sql`
    SELECT
      a.agency_id as "agencyId",
      ag.name as "agencyName",
      COUNT(*) FILTER (
        WHERE a.arc_supplement IS NULL OR a.arc_supplement = ''
      ) as "unresolved",
      COUNT(*) FILTER (
        WHERE a.arc_supplement_deadline IS NOT NULL
          AND a.arc_supplement_deadline < CURRENT_DATE + INTERVAL '30 days'
          AND a.arc_supplement_deadline >= CURRENT_DATE
          AND (a.arc_supplement IS NULL OR a.arc_supplement = '')
      ) as "urgentCount",
      COUNT(*) FILTER (
        WHERE a.arc_supplement_deadline IS NOT NULL
          AND a.arc_supplement_deadline < CURRENT_DATE
          AND (a.arc_supplement IS NULL OR a.arc_supplement = '')
      ) as "overdueCount"
    FROM activations a
    LEFT JOIN agencies ag ON a.agency_id = ag.id
    GROUP BY a.agency_id, ag.name
    HAVING COUNT(*) FILTER (
      WHERE a.arc_supplement IS NULL OR a.arc_supplement = ''
    ) > 0
    ORDER BY ag.name
  `);
  return result.rows;
}

export async function getStaffStats() {
  const result = await db.execute(sql`
    SELECT
      COALESCE(a.person_in_charge, '미배정') as "staff",
      COUNT(*) as "total",
      COUNT(*) FILTER (WHERE a.activation_status = '개통완료') as "completed",
      COUNT(*) FILTER (WHERE a.activation_status = '대기') as "pending",
      COUNT(*) FILTER (WHERE a.work_status = '작업중') as "working",
      COUNT(*) FILTER (WHERE a.work_status = '완료') as "done",
      COUNT(*) FILTER (
        WHERE a.arc_supplement_deadline IS NOT NULL
          AND (a.arc_supplement IS NULL OR a.arc_supplement = '')
      ) as "arcUnresolved",
      COUNT(*) FILTER (
        WHERE a.arc_supplement_deadline IS NOT NULL
          AND a.arc_supplement_deadline < CURRENT_DATE
          AND (a.arc_supplement IS NULL OR a.arc_supplement = '')
      ) as "arcOverdue"
    FROM activations a
    GROUP BY COALESCE(a.person_in_charge, '미배정')
    ORDER BY "staff"
  `);
  return result.rows;
}

export async function getDailyStats(agencyId?: string) {
  const agencyFilter = agencyId ? sql`AND agency_id = ${agencyId}` : sql``;

  const result = await db.execute(sql`
    SELECT
      TO_CHAR(COALESCE(activation_date, entry_date, created_at::date), 'MM/DD') as label,
      TO_CHAR(COALESCE(activation_date, entry_date, created_at::date), 'YYYY-MM-DD') as date,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE activation_status = '개통완료') as completed,
      COUNT(*) FILTER (WHERE activation_status = '대기') as pending
    FROM activations
    WHERE COALESCE(activation_date, entry_date, created_at::date) >= CURRENT_DATE - INTERVAL '30 days'
    ${agencyFilter}
    GROUP BY TO_CHAR(COALESCE(activation_date, entry_date, created_at::date), 'YYYY-MM-DD'),
             TO_CHAR(COALESCE(activation_date, entry_date, created_at::date), 'MM/DD')
    ORDER BY date DESC
    LIMIT 30
  `);
  return result.rows;
}

export async function getWeeklyStats(agencyId?: string) {
  const agencyFilter = agencyId ? sql`AND agency_id = ${agencyId}` : sql``;

  const result = await db.execute(sql`
    SELECT
      TO_CHAR(DATE_TRUNC('week', COALESCE(activation_date, entry_date, created_at::date)), 'MM/DD') || '~' as label,
      TO_CHAR(DATE_TRUNC('week', COALESCE(activation_date, entry_date, created_at::date)), 'YYYY-MM-DD') as week,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE activation_status = '개통완료') as completed,
      COUNT(*) FILTER (WHERE activation_status = '대기') as pending
    FROM activations
    WHERE COALESCE(activation_date, entry_date, created_at::date) >= CURRENT_DATE - INTERVAL '12 weeks'
    ${agencyFilter}
    GROUP BY DATE_TRUNC('week', COALESCE(activation_date, entry_date, created_at::date))
    ORDER BY week DESC
    LIMIT 12
  `);
  return result.rows;
}

// KPI 상세: 전체 개통 - 거래처별 건수
export async function getKpiTotalByAgency() {
  const result = await db.execute(sql`
    SELECT
      a.agency_id as "agencyId",
      COALESCE(ag.name, a.agency_id) as "agencyName",
      COUNT(*) as "count"
    FROM activations a
    LEFT JOIN agencies ag ON a.agency_id = ag.id
    GROUP BY a.agency_id, ag.name
    ORDER BY "count" DESC
  `);
  return result.rows;
}

// KPI 상세: 대기 중 - 거래처별 + 입국예정일
export async function getKpiPendingDetail() {
  const result = await db.execute(sql`
    SELECT
      a.id,
      a.agency_id as "agencyId",
      COALESCE(ag.name, a.agency_id) as "agencyName",
      a.customer_name as "customerName",
      a.entry_date as "entryDate",
      a.new_phone_number as "newPhoneNumber"
    FROM activations a
    LEFT JOIN agencies ag ON a.agency_id = ag.id
    WHERE a.activation_status = '대기'
    ORDER BY a.entry_date ASC NULLS LAST
  `);
  return result.rows;
}

// KPI 상세: 자동이체 미등록 - 거래처별 + 개통일 기준 남은기한
export async function getKpiAutopayDetail() {
  const result = await db.execute(sql`
    SELECT
      a.id,
      a.agency_id as "agencyId",
      COALESCE(ag.name, a.agency_id) as "agencyName",
      a.customer_name as "customerName",
      a.new_phone_number as "newPhoneNumber",
      a.activation_date as "activationDate",
      CASE
        WHEN a.activation_date IS NOT NULL
        THEN (a.activation_date::date + 30 - CURRENT_DATE)
        ELSE NULL
      END as "daysLeft"
    FROM activations a
    LEFT JOIN agencies ag ON a.agency_id = ag.id
    WHERE a.autopay_registered = false
    ORDER BY a.activation_date ASC NULLS LAST
  `);
  return result.rows;
}

export async function getArcUrgentList(agencyId?: string) {
  const agencyFilter = agencyId ? sql`AND a.agency_id = ${agencyId}` : sql``;
  const result = await db.execute(sql`
    SELECT
      a.id,
      a.agency_id as "agencyId",
      ag.name as "agencyName",
      a.customer_name as "customerName",
      a.new_phone_number as "newPhoneNumber",
      a.person_in_charge as "personInCharge",
      a.arc_supplement_deadline as "arcSupplementDeadline",
      a.arc_supplement as "arcSupplement",
      (a.arc_supplement_deadline - CURRENT_DATE) as "daysLeft"
    FROM activations a
    LEFT JOIN agencies ag ON a.agency_id = ag.id
    WHERE a.arc_supplement_deadline IS NOT NULL
      AND a.arc_supplement_deadline <= CURRENT_DATE + INTERVAL '30 days'
      AND (a.arc_supplement IS NULL OR a.arc_supplement = '')
      ${agencyFilter}
    ORDER BY a.arc_supplement_deadline ASC
  `);
  return result.rows;
}
