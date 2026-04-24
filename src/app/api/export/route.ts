import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { activations, agencyCategories } from "@/lib/db/schema";
import { eq, and, desc, inArray, gte, lt } from "drizzle-orm";
import { resolveAllowedAgencyIds } from "@/lib/db/queries/users";
import {
  getAgencyIdsByMediumCategories,
  getAgencyIdsByMajorCategory,
} from "@/lib/db/queries/categories";

const CSV_HEADERS = [
  "대분류",
  "중분류",
  "업체명(유학원)",
  "고객명",
  "유심번호",
  "입국예정일",
  "가입번호",
  "신규개통번호",
  "가상계좌번호",
  "가입유형",
  "요금제",
  "단말정보등록",
  "약정여부",
  "개통일자",
  "개통여부",
  "담당자",
  "가입신청서류",
  "가입신청서류검수",
  "명의변경서류",
  "명의변경서류검수",
  "외국인등록증",
  "외국인등록증검수",
  "자동이체",
  "자동이체검수",
  "보완기한",
  "보완상태",
  "자동이체등록여부",
  "비고",
  "단말정보등록약정여부날짜",
  "개통날짜",
  "진행상황",
];

function escapeCSV(value: string | null | undefined | boolean): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "boolean" ? (value ? "TRUE" : "FALSE") : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // GUEST는 내보내기 불가
    if (user.role === "GUEST") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get("agencyId");
    const status = searchParams.get("status");
    const month = searchParams.get("month");
    const mediumCategories = searchParams.get("mediumCategories");
    const majorCategories = searchParams.get("majorCategories");

    // 조건 빌드
    const conditions = [];
    if (month) {
      const monthStart = `${month}-01`;
      const nextMonth = new Date(monthStart);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const monthEnd = nextMonth.toISOString().slice(0, 10);
      conditions.push(gte(activations.activationDate, monthStart));
      conditions.push(lt(activations.activationDate, monthEnd));
    }
    if (user.role === "PARTNER") {
      const allowedIds = await resolveAllowedAgencyIds(user);
      if (allowedIds !== null) {
        if (allowedIds.length === 0) return new Response("", { status: 200 });
        conditions.push(inArray(activations.agencyId, allowedIds));
      }
    } else if (agencyId && agencyId !== "all") {
      conditions.push(eq(activations.agencyId, agencyId));
    } else if (mediumCategories) {
      const catIds = mediumCategories.split(",").filter(Boolean);
      const catAgencyIds = await getAgencyIdsByMediumCategories(catIds);
      if (catAgencyIds.length > 0) {
        conditions.push(inArray(activations.agencyId, catAgencyIds));
      }
    } else if (majorCategories) {
      const majorIds = majorCategories.split(",").filter(Boolean);
      const allIds: string[] = [];
      for (const mId of majorIds) {
        const ids = await getAgencyIdsByMajorCategory(mId);
        allIds.push(...ids);
      }
      if (allIds.length > 0) {
        conditions.push(inArray(activations.agencyId, [...new Set(allIds)]));
      }
    }
    if (status) {
      conditions.push(eq(activations.workStatus, status));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // 거래처(=중분류) 이름/대분류 매핑
    const allCategories = await db.select().from(agencyCategories);
    const categoryNameMap = new Map(allCategories.map((c) => [c.id, c.name]));
    const mediums = allCategories.filter((c) => c.level === "medium");
    const agencyNameMap = new Map(mediums.map((m) => [m.id, m.name]));
    const agencyMajorMap = new Map(mediums.map((m) => [m.id, m.parentId]));
    const agencyMediumMap = new Map(mediums.map((m) => [m.id, m.id])); // self-reference

    // 데이터 조회
    const data = await db
      .select()
      .from(activations)
      .where(where)
      .orderBy(desc(activations.createdAt));

    // CSV 생성
    const csvRows = [CSV_HEADERS.map(escapeCSV).join(",")];

    for (const row of data) {
      const majorCatId = agencyMajorMap.get(row.agencyId);
      const mediumCatId = agencyMediumMap.get(row.agencyId);
      const csvRow = [
        escapeCSV(majorCatId ? categoryNameMap.get(majorCatId) || majorCatId : ""),
        escapeCSV(mediumCatId ? categoryNameMap.get(mediumCatId) || mediumCatId : ""),
        escapeCSV(agencyNameMap.get(row.agencyId) || row.agencyId),
        escapeCSV(row.customerName),
        escapeCSV(row.usimNumber),
        escapeCSV(row.entryDate),
        escapeCSV(row.subscriptionNumber),
        escapeCSV(row.newPhoneNumber),
        escapeCSV(row.virtualAccount),
        escapeCSV(row.subscriptionType),
        escapeCSV(row.ratePlan),
        escapeCSV(row.deviceChangeConfirmed),
        escapeCSV(row.selectedCommitment),
        escapeCSV(row.activationDate),
        escapeCSV(row.activationStatus),
        escapeCSV(row.personInCharge),
        escapeCSV(row.applicationDocs),
        escapeCSV(row.applicationDocsReview),
        escapeCSV(row.nameChangeDocs),
        escapeCSV(row.nameChangeDocsReview),
        escapeCSV(row.arcInfo || row.arcAutopayInfo),
        escapeCSV(row.arcReview || row.arcAutopayReview),
        escapeCSV(row.autopayInfo),
        escapeCSV(row.autopayReview),
        escapeCSV(row.arcSupplementDeadline),
        escapeCSV(row.supplementStatus),
        escapeCSV(row.autopayRegistered),
        escapeCSV(row.notes),
        escapeCSV(row.commitmentDate),
        escapeCSV(row.activationDate),
        escapeCSV(row.workStatus),
      ].join(",");
      csvRows.push(csvRow);
    }

    // UTF-8 BOM + CSV
    const BOM = "\uFEFF";
    const csvContent = BOM + csvRows.join("\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="activations_export_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "내보내기 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
