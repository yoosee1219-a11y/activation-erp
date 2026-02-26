import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { activations, agencies } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

const CSV_HEADERS = [
  "업체명(유학원)",
  "고객명",
  "유심번호",
  "입국예정일",
  "가입번호",
  "신규개통번호",
  "가상계좌번호",
  "가입유형",
  "요금제",
  "확정기변",
  "선택약정",
  "개통일자",
  "개통여부",
  "담당자",
  "가입신청서류",
  "서류검수1",
  "명의변경서류",
  "서류검수2",
  "외국인등록증+자동이체정보",
  "서류검수3",
  "외국인등록증보완",
  "외국인등록증보완기한",
  "자동이체등록여부",
  "비고",
  "확정기변선택약정날짜",
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

    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get("agencyId");
    const status = searchParams.get("status");

    // 조건 빌드
    const conditions = [];
    if (user.role === "PARTNER") {
      if (user.allowedAgencies.length > 0) {
        conditions.push(inArray(activations.agencyId, user.allowedAgencies));
      } else {
        return new Response("", { status: 200 });
      }
    } else if (agencyId && agencyId !== "all") {
      conditions.push(eq(activations.agencyId, agencyId));
    }
    if (status) {
      conditions.push(eq(activations.activationStatus, status));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // 거래처 이름 매핑
    const allAgencies = await db.select().from(agencies);
    const agencyNameMap = new Map(allAgencies.map((a) => [a.id, a.name]));

    // 데이터 조회
    const data = await db
      .select()
      .from(activations)
      .where(where)
      .orderBy(desc(activations.createdAt));

    // CSV 생성
    const csvRows = [CSV_HEADERS.map(escapeCSV).join(",")];

    for (const row of data) {
      const csvRow = [
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
        escapeCSV(row.arcAutopayInfo),
        escapeCSV(row.arcAutopayReview),
        escapeCSV(row.arcSupplement),
        escapeCSV(row.arcSupplementDeadline),
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
