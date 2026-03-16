import { db } from "@/lib/db";
import { activations, activationNotes, agencies } from "@/lib/db/schema";
import { eq, and, desc, sql, count, ilike, gte, lte, lt, ne, inArray, isNotNull } from "drizzle-orm";

// neon-http 드라이버에서 ANY(${array})가 배열 직렬화 실패하므로
// IN (...) + sql.join()으로 안전하게 처리
function inList(ids: string[]) {
  return sql.join(ids.map(id => sql`${id}`), sql`, `);
}

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
    conditions.push(eq(activations.workStatus, status));
  }
  if (search) {
    conditions.push(ilike(activations.customerName, `%${search}%`));
  }
  if (dateFrom) {
    conditions.push(
      sql`COALESCE(${activations.activationDate}, ${activations.entryDate}, ${activations.createdAt}::date) >= ${dateFrom}`
    );
  }
  if (dateTo) {
    conditions.push(
      sql`COALESCE(${activations.activationDate}, ${activations.entryDate}, ${activations.createdAt}::date) <= ${dateTo}`
    );
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

  // Get note counts for fetched activations
  let noteCounts: Record<string, number> = {};
  if (data.length > 0) {
    const ids = data.map(d => d.id);
    const noteResult = await db.execute(sql`
      SELECT activation_id, COUNT(*)::int as cnt
      FROM activation_notes
      WHERE activation_id IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})
      GROUP BY activation_id
    `);
    noteResult.rows.forEach((r: any) => {
      noteCounts[r.activation_id] = Number(r.cnt);
    });
  }

  return {
    data: data.map(d => ({ ...d, noteCount: noteCounts[d.id] || 0 })),
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

export async function getDashboardStats(agencyId?: string, agencyIds?: string[]) {
  const conditions = [];
  if (agencyIds && agencyIds.length > 0) {
    conditions.push(inArray(activations.agencyId, agencyIds));
  } else if (agencyId) {
    conditions.push(eq(activations.agencyId, agencyId));
  }
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

export async function getMonthlyStats(agencyId?: string, agencyIds?: string[]) {
  const agencyFilter = agencyIds && agencyIds.length > 0
    ? sql`WHERE agency_id IN (${inList(agencyIds)})`
    : agencyId ? sql`WHERE agency_id = ${agencyId}` : sql``;

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

export async function getAgencyStats(agencyIds?: string[]) {
  const agencyFilter = agencyIds && agencyIds.length > 0
    ? sql`WHERE a.agency_id IN (${inList(agencyIds)})`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      a.agency_id as "agencyId",
      ag.name as "agencyName",
      COUNT(*) as "total",
      COUNT(*) FILTER (WHERE a.activation_status = '개통완료') as "completed",
      COUNT(*) FILTER (WHERE a.activation_status = '대기') as "pending",
      COUNT(*) FILTER (WHERE a.activation_status = '개통취소') as "cancelled",
      COUNT(*) FILTER (WHERE a.work_status = '진행중') as "working",
      COUNT(*) FILTER (WHERE a.autopay_registered = false) as "autopayPending"
    FROM activations a
    LEFT JOIN agencies ag ON a.agency_id = ag.id
    ${agencyFilter}
    GROUP BY a.agency_id, ag.name
    ORDER BY ag.name
  `);
  return result.rows;
}

export async function getArcSupplementStats(agencyIds?: string[]) {
  const agencyFilter = agencyIds && agencyIds.length > 0
    ? sql`WHERE a.agency_id IN (${inList(agencyIds)})`
    : sql``;

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
    ${agencyFilter}
    GROUP BY a.agency_id, ag.name
    HAVING COUNT(*) FILTER (
      WHERE a.arc_supplement IS NULL OR a.arc_supplement = ''
    ) > 0
    ORDER BY ag.name
  `);
  return result.rows;
}

export async function getStaffStats(agencyIds?: string[]) {
  const agencyFilter = agencyIds && agencyIds.length > 0
    ? sql`WHERE a.agency_id IN (${inList(agencyIds)})`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      COALESCE(a.person_in_charge, '미배정') as "staff",
      COUNT(*) as "total",
      COUNT(*) FILTER (WHERE a.activation_status = '개통완료') as "completed",
      COUNT(*) FILTER (WHERE a.activation_status = '대기') as "pending",
      COUNT(*) FILTER (WHERE a.work_status = '진행중') as "working",
      COUNT(*) FILTER (WHERE a.work_status = '개통완료') as "done",
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
    ${agencyFilter}
    GROUP BY COALESCE(a.person_in_charge, '미배정')
    ORDER BY "staff"
  `);
  return result.rows;
}

export async function getDailyStats(agencyId?: string, agencyIds?: string[]) {
  const agencyFilter = agencyIds && agencyIds.length > 0
    ? sql`AND agency_id IN (${inList(agencyIds)})`
    : agencyId ? sql`AND agency_id = ${agencyId}` : sql``;

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

export async function getWeeklyStats(agencyId?: string, agencyIds?: string[]) {
  const agencyFilter = agencyIds && agencyIds.length > 0
    ? sql`AND agency_id IN (${inList(agencyIds)})`
    : agencyId ? sql`AND agency_id = ${agencyId}` : sql``;

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

// ── 보완요청 대기건 통계 ──
export async function getSupplementRequestStats(agencyIds?: string[]) {
  const agencyFilter = agencyIds && agencyIds.length > 0
    ? sql`AND a.agency_id IN (${inList(agencyIds)})`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      COUNT(*) as "total",
      COUNT(*) FILTER (WHERE a.work_status = '보완요청') as "workStatusCount",
      COUNT(*) FILTER (
        WHERE a.application_docs_review = '보완요청'
           OR a.name_change_docs_review = '보완요청'
           OR a.arc_review = '보완요청'
           OR a.autopay_review = '보완요청'
      ) as "reviewCount"
    FROM activations a
    WHERE (
      a.work_status = '보완요청'
      OR a.application_docs_review = '보완요청'
      OR a.name_change_docs_review = '보완요청'
      OR a.arc_review = '보완요청'
      OR a.autopay_review = '보완요청'
    )
    ${agencyFilter}
  `);
  return result.rows[0] || { total: 0, workStatusCount: 0, reviewCount: 0 };
}

// 보완요청 대기건 상세 리스트
export async function getSupplementRequestDetail(agencyIds?: string[]) {
  const agencyFilter = agencyIds && agencyIds.length > 0
    ? sql`AND a.agency_id IN (${inList(agencyIds)})`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      a.id,
      a.agency_id as "agencyId",
      COALESCE(ag.name, a.agency_id) as "agencyName",
      a.customer_name as "customerName",
      a.new_phone_number as "newPhoneNumber",
      a.person_in_charge as "personInCharge",
      a.work_status as "workStatus",
      a.application_docs_review as "applicationDocsReview",
      a.name_change_docs_review as "nameChangeDocsReview",
      a.arc_review as "arcReview",
      a.autopay_review as "autopayReview"
    FROM activations a
    LEFT JOIN agencies ag ON a.agency_id = ag.id
    WHERE (
      a.work_status = '보완요청'
      OR a.application_docs_review = '보완요청'
      OR a.name_change_docs_review = '보완요청'
      OR a.arc_review = '보완요청'
      OR a.autopay_review = '보완요청'
    )
    ${agencyFilter}
    ORDER BY a.created_at DESC
  `);
  return result.rows;
}

// ── 개통대기 당월/당일 통계 (담당자 배정+작업중이면 제외) ──
export async function getPendingByPeriod(agencyIds?: string[]) {
  const agencyFilter = agencyIds && agencyIds.length > 0
    ? sql`AND agency_id IN (${inList(agencyIds)})`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      COUNT(*) as "totalPending",
      COUNT(*) FILTER (
        WHERE TO_CHAR(COALESCE(activation_date, entry_date, created_at::date), 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
      ) as "monthlyPending",
      COUNT(*) FILTER (
        WHERE COALESCE(activation_date, entry_date, created_at::date) = CURRENT_DATE
      ) as "todayPending"
    FROM activations
    WHERE work_status IN ('입력중', '개통요청')
      ${agencyFilter}
  `);
  return result.rows[0] || { totalPending: 0, monthlyPending: 0, todayPending: 0 };
}

// 개통대기 당일 상세 리스트 (입국예정일이 오늘인 건)
export async function getTodayPendingDetail(agencyIds?: string[]) {
  const agencyFilter = agencyIds && agencyIds.length > 0
    ? sql`AND a.agency_id IN (${inList(agencyIds)})`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      a.id,
      a.agency_id as "agencyId",
      COALESCE(ag.name, a.agency_id) as "agencyName",
      a.customer_name as "customerName",
      a.new_phone_number as "newPhoneNumber",
      a.entry_date as "entryDate",
      a.person_in_charge as "personInCharge"
    FROM activations a
    LEFT JOIN agencies ag ON a.agency_id = ag.id
    WHERE a.work_status IN ('입력중', '개통요청')
      AND COALESCE(a.activation_date, a.entry_date, a.created_at::date) = CURRENT_DATE
      ${agencyFilter}
    ORDER BY a.entry_date ASC NULLS LAST
  `);
  return result.rows;
}

// KPI 상세: 전체 개통 - 거래처별 건수
export async function getKpiTotalByAgency(agencyIds?: string[]) {
  const agencyFilter = agencyIds && agencyIds.length > 0
    ? sql`WHERE a.agency_id IN (${inList(agencyIds)})`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      a.agency_id as "agencyId",
      COALESCE(ag.name, a.agency_id) as "agencyName",
      COUNT(*) as "count"
    FROM activations a
    LEFT JOIN agencies ag ON a.agency_id = ag.id
    ${agencyFilter}
    GROUP BY a.agency_id, ag.name
    ORDER BY "count" DESC
  `);
  return result.rows;
}

// KPI 상세: 대기 중 - 거래처별 + 입국예정일
export async function getKpiPendingDetail(agencyIds?: string[]) {
  const agencyFilter = agencyIds && agencyIds.length > 0
    ? sql`AND a.agency_id IN (${inList(agencyIds)})`
    : sql``;

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
    ${agencyFilter}
    ORDER BY a.entry_date ASC NULLS LAST
  `);
  return result.rows;
}

// KPI 상세: 자동이체 미등록 - 거래처별 + 개통일 기준 남은기한
export async function getKpiAutopayDetail(agencyIds?: string[]) {
  const agencyFilter = agencyIds && agencyIds.length > 0
    ? sql`AND a.agency_id IN (${inList(agencyIds)})`
    : sql``;

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
    ${agencyFilter}
    ORDER BY a.activation_date ASC NULLS LAST
  `);
  return result.rows;
}

export async function getArcUrgentList(agencyId?: string, agencyIds?: string[]) {
  const agencyFilter = agencyIds && agencyIds.length > 0
    ? sql`AND a.agency_id IN (${inList(agencyIds)})`
    : agencyId ? sql`AND a.agency_id = ${agencyId}` : sql``;
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

// ── 서류 보완 패널: 모바일보완/명의변경보완 분리 통계 ──
export async function getSupplementStats(agencyIds?: string[]) {
  const agencyFilter = agencyIds && agencyIds.length > 0
    ? sql`WHERE a.agency_id IN (${inList(agencyIds)})`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      a.agency_id as "agencyId",
      ag.name as "agencyName",
      -- 모바일보완: workStatus='보완요청'
      COUNT(*) FILTER (WHERE a.work_status = '보완요청') as "mobileTotal",
      COUNT(*) FILTER (WHERE a.work_status = '보완요청'
        AND a.arc_supplement_deadline IS NOT NULL
        AND a.arc_supplement_deadline < CURRENT_DATE) as "mobileOverdue",
      COUNT(*) FILTER (WHERE a.work_status = '보완요청'
        AND a.arc_supplement_deadline IS NOT NULL
        AND a.arc_supplement_deadline >= CURRENT_DATE
        AND a.arc_supplement_deadline <= CURRENT_DATE + INTERVAL '30 days') as "mobileWithin30",
      COUNT(*) FILTER (WHERE a.work_status = '보완요청'
        AND a.arc_supplement_deadline IS NOT NULL
        AND a.arc_supplement_deadline > CURRENT_DATE + INTERVAL '30 days'
        AND a.arc_supplement_deadline <= CURRENT_DATE + INTERVAL '60 days') as "mobileWithin60",
      -- 명의변경보완: workStatus='개통완료' AND (명의변경서류검수 or 외국인등록증검수 or 자동이체검수가 완료가 아닌 건)
      COUNT(*) FILTER (WHERE a.work_status = '개통완료'
        AND (COALESCE(a.name_change_docs_review, '') != '완료'
             OR COALESCE(a.arc_review, '') != '완료'
             OR COALESCE(a.autopay_review, '') != '완료')) as "nameChangeTotal",
      COUNT(*) FILTER (WHERE a.work_status = '개통완료'
        AND (COALESCE(a.name_change_docs_review, '') != '완료'
             OR COALESCE(a.arc_review, '') != '완료'
             OR COALESCE(a.autopay_review, '') != '완료')
        AND a.arc_supplement_deadline IS NOT NULL
        AND a.arc_supplement_deadline < CURRENT_DATE) as "nameChangeOverdue",
      COUNT(*) FILTER (WHERE a.work_status = '개통완료'
        AND (COALESCE(a.name_change_docs_review, '') != '완료'
             OR COALESCE(a.arc_review, '') != '완료'
             OR COALESCE(a.autopay_review, '') != '완료')
        AND a.arc_supplement_deadline IS NOT NULL
        AND a.arc_supplement_deadline >= CURRENT_DATE
        AND a.arc_supplement_deadline <= CURRENT_DATE + INTERVAL '30 days') as "nameChangeWithin30",
      COUNT(*) FILTER (WHERE a.work_status = '개통완료'
        AND (COALESCE(a.name_change_docs_review, '') != '완료'
             OR COALESCE(a.arc_review, '') != '완료'
             OR COALESCE(a.autopay_review, '') != '완료')
        AND a.arc_supplement_deadline IS NOT NULL
        AND a.arc_supplement_deadline > CURRENT_DATE + INTERVAL '30 days'
        AND a.arc_supplement_deadline <= CURRENT_DATE + INTERVAL '60 days') as "nameChangeWithin60"
    FROM activations a
    LEFT JOIN agencies ag ON a.agency_id = ag.id
    ${agencyFilter}
    GROUP BY a.agency_id, ag.name
    HAVING COUNT(*) FILTER (WHERE a.work_status = '보완요청') > 0
        OR COUNT(*) FILTER (WHERE a.work_status = '개통완료'
           AND (COALESCE(a.name_change_docs_review, '') != '완료'
                OR COALESCE(a.arc_review, '') != '완료'
                OR COALESCE(a.autopay_review, '') != '완료')) > 0
    ORDER BY ag.name
  `);
  return result.rows;
}

// ── 서류 보완 패널: 모바일보완/명의변경보완 전체 리스트 ──
export async function getSupplementList(agencyIds?: string[]) {
  const agencyFilter = agencyIds && agencyIds.length > 0
    ? sql`AND a.agency_id IN (${inList(agencyIds)})`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      a.id,
      a.agency_id as "agencyId",
      COALESCE(ag.name, a.agency_id) as "agencyName",
      a.customer_name as "customerName",
      a.new_phone_number as "newPhoneNumber",
      a.person_in_charge as "personInCharge",
      a.work_status as "workStatus",
      a.name_change_docs_review as "nameChangeDocsReview",
      a.arc_review as "arcReview",
      a.autopay_review as "autopayReview",
      a.arc_supplement_deadline as "arcSupplementDeadline",
      CASE
        WHEN a.arc_supplement_deadline IS NOT NULL
        THEN (a.arc_supplement_deadline - CURRENT_DATE)
        ELSE NULL
      END as "daysLeft",
      CASE
        WHEN a.work_status = '보완요청' THEN 'mobile'
        WHEN a.work_status = '개통완료'
          AND (COALESCE(a.name_change_docs_review, '') != '완료'
               OR COALESCE(a.arc_review, '') != '완료'
               OR COALESCE(a.autopay_review, '') != '완료')
        THEN 'nameChange'
      END as "supplementType"
    FROM activations a
    LEFT JOIN agencies ag ON a.agency_id = ag.id
    WHERE (
      a.work_status = '보완요청'
      OR (
        a.work_status = '개통완료'
        AND (COALESCE(a.name_change_docs_review, '') != '완료'
             OR COALESCE(a.arc_review, '') != '완료'
             OR COALESCE(a.autopay_review, '') != '완료')
      )
    )
    ${agencyFilter}
    ORDER BY a.arc_supplement_deadline ASC NULLS LAST
  `);
  return result.rows;
}

// ── 해지 통계 (당월 해지 건수 + 해지예고 건수 + 거래처별 breakdown) ──
export async function getTerminationStats(filters?: {
  agencyId?: string;
  agencyIds?: string[];
}) {
  const conditions = [];
  if (filters?.agencyId) {
    conditions.push(eq(activations.agencyId, filters.agencyId));
  }
  if (filters?.agencyIds && filters.agencyIds.length > 0) {
    conditions.push(inArray(activations.agencyId, filters.agencyIds));
  }

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthEnd = nextMonth.toISOString().split("T")[0];

  // Monthly termination count
  const monthlyResult = await db.select({ count: count() }).from(activations)
    .where(and(
      eq(activations.workStatus, "해지"),
      gte(activations.terminationDate, monthStart),
      lt(activations.terminationDate, monthEnd),
      ...(conditions.length > 0 ? conditions : [])
    ));

  // Alert count (해지예고 중)
  const alertResult = await db.select({ count: count() }).from(activations)
    .where(and(
      isNotNull(activations.terminationAlertDate),
      ne(activations.workStatus, "해지"),
      ...(conditions.length > 0 ? conditions : [])
    ));

  // 당월 해지 거래처별 breakdown
  const agencyFilter = filters?.agencyIds && filters.agencyIds.length > 0
    ? sql`AND a.agency_id IN (${inList(filters.agencyIds)})`
    : filters?.agencyId
      ? sql`AND a.agency_id = ${filters.agencyId}`
      : sql``;

  const byAgencyResult = await db.execute(sql`
    SELECT a.agency_id as "agencyId", COALESCE(ag.name, a.agency_id) as "agencyName", COUNT(*) as "count"
    FROM activations a
    LEFT JOIN agencies ag ON a.agency_id = ag.id
    WHERE a.work_status = '해지'
      AND a.termination_date >= ${monthStart}
      AND a.termination_date < ${monthEnd}
      ${agencyFilter}
    GROUP BY a.agency_id, ag.name
    ORDER BY COUNT(*) DESC
  `);

  return {
    monthlyCount: Number(monthlyResult[0]?.count || 0),
    alertCount: Number(alertResult[0]?.count || 0),
    byAgency: byAgencyResult.rows as Array<{ agencyId: string; agencyName: string; count: number }>,
  };
}

// ── KPI 카드: 당월 개통완료 (거래처별 breakdown 포함) ──
// 기준: work_status가 '개통완료'이고 개통일(activation_date) 기준 당월인 건
export async function getMonthlyCompletedStats(agencyIds?: string[]) {
  const agencyFilter = agencyIds && agencyIds.length > 0
    ? sql`AND a.agency_id IN (${inList(agencyIds)})`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      COALESCE(SUM(sub.cnt), 0) as "totalCount",
      COALESCE(json_agg(json_build_object('agencyId', sub.agency_id, 'agencyName', sub.agency_name, 'count', sub.cnt)), '[]'::json) as "byAgency"
    FROM (
      SELECT a.agency_id, COALESCE(ag.name, a.agency_id) as agency_name, COUNT(*) as cnt
      FROM activations a
      LEFT JOIN agencies ag ON a.agency_id = ag.id
      WHERE a.work_status IN ('개통완료', '완료')
        AND TO_CHAR(COALESCE(a.activation_date, a.entry_date, a.created_at::date), 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
        ${agencyFilter}
      GROUP BY a.agency_id, ag.name
    ) sub
  `);
  const row = result.rows[0] || { totalCount: 0, byAgency: [] };
  return {
    totalCount: Number(row.totalCount || 0),
    byAgency: Array.isArray(row.byAgency) ? row.byAgency : [],
  };
}

// ── KPI 카드: 당일 개통완료 상세 ──
// 기준: work_status가 '개통완료'이고 개통일(activation_date) 기준 오늘인 건
export async function getTodayCompletedStats(agencyIds?: string[]) {
  const agencyFilter = agencyIds && agencyIds.length > 0
    ? sql`AND a.agency_id IN (${inList(agencyIds)})`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      a.id,
      a.agency_id as "agencyId",
      COALESCE(ag.name, a.agency_id) as "agencyName",
      a.customer_name as "customerName",
      a.new_phone_number as "newPhoneNumber",
      a.activation_date as "activationDate"
    FROM activations a
    LEFT JOIN agencies ag ON a.agency_id = ag.id
    WHERE a.work_status IN ('개통완료', '완료')
      AND COALESCE(a.activation_date, a.entry_date, a.created_at::date) = CURRENT_DATE
      ${agencyFilter}
    ORDER BY a.activation_date DESC NULLS LAST
  `);
  return result.rows;
}

// ── KPI 카드: 명의변경 미보완 상세 ──
// 기준: work_status가 '개통완료'이고 3개 검수 중 하나라도 '완료'가 아닌 건 (전체, 월 필터 없음)
export async function getNameChangeIncomplete(agencyIds?: string[]) {
  const agencyFilter = agencyIds && agencyIds.length > 0
    ? sql`AND a.agency_id IN (${inList(agencyIds)})`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      a.id,
      a.agency_id as "agencyId",
      COALESCE(ag.name, a.agency_id) as "agencyName",
      a.customer_name as "customerName",
      a.new_phone_number as "newPhoneNumber",
      a.name_change_docs_review as "nameChangeDocsReview",
      a.arc_review as "arcReview",
      a.autopay_review as "autopayReview"
    FROM activations a
    LEFT JOIN agencies ag ON a.agency_id = ag.id
    WHERE a.work_status IN ('개통완료', '완료')
      AND (COALESCE(a.name_change_docs_review, '') != '완료'
           OR COALESCE(a.arc_review, '') != '완료'
           OR COALESCE(a.autopay_review, '') != '완료')
      ${agencyFilter}
    ORDER BY a.created_at DESC
  `);
  return result.rows;
}

// ── KPI 카드: 당일 해지 상세 (건수 + 거래처별 + 상세 목록) ──
export async function getTodayTerminationCount(agencyIds?: string[]) {
  const agencyFilter = agencyIds && agencyIds.length > 0
    ? sql`AND a.agency_id IN (${inList(agencyIds)})`
    : sql``;

  const countResult = await db.execute(sql`
    SELECT COUNT(*) as "count"
    FROM activations a
    WHERE a.work_status = '해지'
      AND a.termination_date = CURRENT_DATE
      ${agencyFilter}
  `);

  return {
    count: Number(countResult.rows[0]?.count || 0),
  };
}

// ── KPI 카드: 당월 해지 상세 목록 ──
export async function getMonthlyTerminationDetail(agencyIds?: string[]) {
  const agencyFilter = agencyIds && agencyIds.length > 0
    ? sql`AND a.agency_id IN (${inList(agencyIds)})`
    : sql``;

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthEnd = nextMonth.toISOString().split("T")[0];

  const result = await db.execute(sql`
    SELECT
      a.id,
      a.agency_id as "agencyId",
      COALESCE(ag.name, a.agency_id) as "agencyName",
      a.customer_name as "customerName",
      a.new_phone_number as "newPhoneNumber",
      a.termination_date as "terminationDate",
      a.termination_reason as "terminationReason",
      a.work_status as "workStatus"
    FROM activations a
    LEFT JOIN agencies ag ON a.agency_id = ag.id
    WHERE a.work_status = '해지'
      AND a.termination_date >= ${monthStart}
      AND a.termination_date < ${monthEnd}
      ${agencyFilter}
    ORDER BY a.termination_date DESC
  `);
  return result.rows;
}

// ── KPI 카드: 당일 해지 상세 목록 ──
export async function getTodayTerminationDetail(agencyIds?: string[]) {
  const agencyFilter = agencyIds && agencyIds.length > 0
    ? sql`AND a.agency_id IN (${inList(agencyIds)})`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      a.id,
      a.agency_id as "agencyId",
      COALESCE(ag.name, a.agency_id) as "agencyName",
      a.customer_name as "customerName",
      a.new_phone_number as "newPhoneNumber",
      a.termination_date as "terminationDate",
      a.termination_reason as "terminationReason",
      a.work_status as "workStatus"
    FROM activations a
    LEFT JOIN agencies ag ON a.agency_id = ag.id
    WHERE a.work_status = '해지'
      AND a.termination_date = CURRENT_DATE
      ${agencyFilter}
    ORDER BY a.termination_date DESC
  `);
  return result.rows;
}
