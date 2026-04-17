import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { resolveAllowedAgencyIds } from "@/lib/db/queries/users";
import { db } from "@/lib/db";
import { activations, agencies } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

// Vercel 서버리스 타임아웃 연장
export const maxDuration = 60;

// CSV 헤더 → DB 필드 매핑
const HEADER_MAP: Record<string, string> = {
  // 기본 정보
  "업체명(유학원)": "agencyId",
  "업체명": "agencyId",
  "거래처명": "agencyId",
  "고객명": "customerName",
  "유심번호": "usimNumber",
  "입국예정일": "entryDate",
  // 가입 정보
  "가입번호": "subscriptionNumber",
  "신규개통번호": "newPhoneNumber",
  "가상계좌번호": "virtualAccount",
  "가입유형": "subscriptionType",
  "요금제": "ratePlan",
  // 개통 상태
  "확정기변": "deviceChangeConfirmed",
  "단말정보등록": "deviceChangeConfirmed",
  "선택약정": "selectedCommitment",
  "약정여부": "selectedCommitment",
  "개통일자": "activationDate",
  "개통날짜": "activationDate2",
  "개통여부": "activationStatus",
  "담당자": "personInCharge",
  // 서류 (고유 헤더명 지원)
  "가입신청서류": "applicationDocs",
  "가입신청서류 검수": "applicationDocsReview",
  "명의변경서류": "nameChangeDocs",
  "명의변경서류 검수": "nameChangeDocsReview",
  // 외국인등록증 / 자동이체
  "외국인등록증 정보": "arcInfo",
  "외국인등록증": "arcInfo",
  "외국인등록증 검수": "arcReview",
  "자동이체 정보": "autopayInfo",
  "자동이체": "autopayInfo",
  "자동이체 검수": "autopayReview",
  "외국인등록증 보완": "arcSupplement",
  "외국인등록증 보완기한": "arcSupplementDeadline",
  "보완기한": "arcSupplementDeadline",
  "보완상태": "supplementStatus",
  "자동이체 등록여부": "autopayRegistered",
  // 기타
  "확정기변 선택약정 날짜": "commitmentDate",
  "단말정보등록 약정여부 날짜": "commitmentDate",
  "비고": "notes",
  "개통방법": "activationMethod",
};

// 멀티라인 헤더를 정규화하는 매핑
const MULTILINE_HEADER_MAP: Record<string, string> = {
  "서류\n검수": "_reviewField",
  "외국인등록증\n+ 자동이체 정보": "arcInfo",
  "외국인등록증 정보": "arcInfo",
  "외국인등록증": "arcInfo",
  "자동이체 정보": "autopayInfo",
  "자동이체": "autopayInfo",
  "외국인등록증\n보완": "arcSupplement",
  "외국인등록증\n보완기한": "arcSupplementDeadline",
  "보완기한": "arcSupplementDeadline",
  "자동이체\n등록여부": "autopayRegistered",
  "확정기변\n선택약정\n날짜": "commitmentDate",
  "단말정보등록\n약정여부\n날짜": "commitmentDate",
  "가입신청서류\n(여권,사증발급확인서,입학허가서,가입서류)": "applicationDocs",
  "외국인등록증 검수": "arcReview",
  "자동이체 검수": "autopayReview",
  "보완상태": "supplementStatus",
};

// 날짜 변환: 다양한 형식 → YYYY-MM-DD
function parseDate(value: string): string | null {
  if (!value || value.trim() === "") return null;
  const v = value.trim();

  // 25/12/03 형식 (YY/MM/DD)
  const shortMatch = v.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (shortMatch) {
    return `20${shortMatch[1]}-${shortMatch[2]}-${shortMatch[3]}`;
  }

  // 2025. 12. 18 또는 2025.12.18 형식
  const dotMatch = v.match(/^(\d{4})\.?\s*(\d{1,2})\.?\s*(\d{1,2})\.?$/);
  if (dotMatch) {
    return `${dotMatch[1]}-${dotMatch[2].padStart(2, "0")}-${dotMatch[3].padStart(2, "0")}`;
  }

  // 2025-12-18 형식 (이미 정상)
  const isoMatch = v.match(/^\d{4}-\d{2}-\d{2}$/);
  if (isoMatch) return v;

  // 2025/12/18 형식
  const slashMatch = v.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (slashMatch) {
    return `${slashMatch[1]}-${slashMatch[2].padStart(2, "0")}-${slashMatch[3].padStart(2, "0")}`;
  }

  // 12/18/2025 형식 (MM/DD/YYYY — 미국식)
  const usMatch = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    return `${usMatch[3]}-${usMatch[1].padStart(2, "0")}-${usMatch[2].padStart(2, "0")}`;
  }

  // 2025-12-18T00:00:00 형식 (ISO datetime)
  const isoDatetimeMatch = v.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (isoDatetimeMatch) return isoDatetimeMatch[1];

  // Excel 시리얼 날짜 (44000~47000 범위 = 2020~2028년)
  const numVal = Number(v);
  if (!isNaN(numVal) && numVal >= 40000 && numVal <= 50000) {
    const epoch = new Date(1899, 11, 30); // Excel epoch
    epoch.setDate(epoch.getDate() + numVal);
    const y = epoch.getFullYear();
    const m = String(epoch.getMonth() + 1).padStart(2, "0");
    const d = String(epoch.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return null;
}

// 과학표기법(5.14784E+11) → 원래 숫자 문자열로 변환
// parseFloat 대신 문자열 조작으로 부동소수점 정밀도 손실 방지
function parseNumericText(value: string): string {
  if (!value) return "";
  const v = value.trim();
  // 과학표기법 패턴: 5.11041E+11, 1.23e+10, 5.11041234567E+11 등
  const sciMatch = v.match(/^(\d+\.?\d*)[eE][+]?(\d+)$/);
  if (sciMatch) {
    const mantissa = sciMatch[1]; // "5.11041" or "5"
    const exp = parseInt(sciMatch[2], 10); // 11
    const parts = mantissa.split(".");
    const intPart = parts[0]; // "5"
    const decPart = parts[1] || ""; // "11041"
    const combined = intPart + decPart; // "511041"
    const zerosNeeded = exp - decPart.length; // 11 - 5 = 6
    if (zerosNeeded >= 0) {
      return combined + "0".repeat(zerosNeeded);
    }
    // 소수점이 필요한 경우 (전화번호/가입번호에서는 발생 안 함)
    return combined.slice(0, combined.length + zerosNeeded);
  }
  // 숫자에 소수점 있으면 제거 (511041000000.0 → 511041000000)
  if (/^\d+\.0*$/.test(v)) {
    return v.split(".")[0];
  }
  return v;
}

// 불리언 변환
function parseBool(value: string): boolean {
  if (!value) return false;
  const v = value.trim().toUpperCase();
  return v === "TRUE" || v === "O" || v === "완료" || v === "지로";
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUB_ADMIN" && user.role !== "PARTNER")) {
      return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    let { rows, defaultAgencyId, defaultMajorCategory, defaultMediumCategory } = body as {
      rows: Record<string, string>[];
      defaultAgencyId?: string;
      defaultMajorCategory?: string;
      defaultMediumCategory?: string;
    };

    // PARTNER: 허용된 에이전시로만 import 가능
    if (user.role === "PARTNER") {
      const allowedIds = await resolveAllowedAgencyIds(user);
      if (!allowedIds || allowedIds.length === 0) {
        return NextResponse.json({ error: "접근 가능한 거래처가 없습니다." }, { status: 403 });
      }
      if (!defaultAgencyId) {
        defaultAgencyId = allowedIds[0];
      }
      if (!allowedIds.includes(defaultAgencyId)) {
        return NextResponse.json({ error: "해당 거래처에 접근 권한이 없습니다." }, { status: 403 });
      }
    }

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "데이터가 없습니다." }, { status: 400 });
    }

    // 거래처 목록 조회 (이름 → ID 매핑)
    const allAgencies = await db.select().from(agencies);
    const agencyNameMap = new Map<string, string>();
    for (const a of allAgencies) {
      agencyNameMap.set(a.name.toLowerCase(), a.id);
      agencyNameMap.set(a.id.toLowerCase(), a.id);
    }

    const results = {
      inserted: 0,
      skipped: 0,
      duplicates: 0,
      errors: [] as string[],
      newAgencies: [] as string[],
    };

    // 행별 상태 추적: 'inserted' | 'duplicate' | 'skipped' | 'error'
    const rowStatuses: Record<number, string> = {};

    // 알 수 없는 거래처 수집
    const unknownAgencies = new Set<string>();
    for (const row of rows) {
      const agencyName = row.agencyId || row["업체명(유학원)"] || "";
      if (agencyName && !agencyNameMap.has(agencyName.toLowerCase())) {
        unknownAgencies.add(agencyName);
      }
    }

    // 알 수 없는 거래처 자동 생성
    for (const name of unknownAgencies) {
      const id = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_가-힣]/g, "");
      try {
        await db.insert(agencies).values({
          id: id || `agency_${Date.now()}`,
          name,
          isActive: true,
          majorCategory: defaultMajorCategory || null,
          mediumCategory: defaultMediumCategory || null,
        });
        agencyNameMap.set(name.toLowerCase(), id);
        results.newAgencies.push(name);
      } catch {
        const existing = allAgencies.find(
          (a) => a.name.toLowerCase() === name.toLowerCase()
        );
        if (existing) {
          agencyNameMap.set(name.toLowerCase(), existing.id);
        }
      }
    }

    // 기존 데이터 조회 (중복 방지용)
    const existingActivations = await db
      .select({
        customerName: activations.customerName,
        agencyId: activations.agencyId,
        activationDate: activations.activationDate,
        entryDate: activations.entryDate,
        usimNumber: activations.usimNumber,
      })
      .from(activations);

    // 중복 판별용 Set들 (날짜가 있는 경우만 키 등록)
    const existingByActivationDate = new Set<string>();
    const existingByEntryDate = new Set<string>();
    const existingByUsim = new Set<string>();
    for (const ea of existingActivations) {
      const name = ea.customerName?.toLowerCase() || "";
      if (ea.activationDate) {
        existingByActivationDate.add(`${name}|${ea.agencyId}|${ea.activationDate}`);
      }
      if (ea.entryDate) {
        existingByEntryDate.add(`${name}|${ea.agencyId}|${ea.entryDate}`);
      }
      if (ea.usimNumber) {
        existingByUsim.add(ea.usimNumber);
      }
    }

    // 데이터 준비 (배치 인서트용)
    const batchValues: (typeof activations.$inferInsert)[] = [];
    const batchRowIndices: number[] = []; // batchValues와 1:1 대응하는 원본 행 인덱스

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const customerName = (row.customerName || "").trim();
        if (!customerName) {
          results.skipped++;
          rowStatuses[i] = "skipped";
          continue;
        }

        // 거래처 ID 결정
        const agencyRaw = (row.agencyId || "").trim();
        const agencyId = agencyNameMap.get(agencyRaw.toLowerCase()) || defaultAgencyId || "";
        if (!agencyId) {
          results.errors.push(`행 ${i + 1}: 거래처를 찾을 수 없음 (${agencyRaw})`);
          results.skipped++;
          rowStatuses[i] = "error";
          continue;
        }

        const activationDate = parseDate(row.activationDate || "") || parseDate(row.activationDate2 || "");
        const entryDate = parseDate(row.entryDate || "");

        // 중복 체크: 날짜가 있는 경우만 해당 키로 비교, 둘 다 없으면 유심번호로 비교
        const nameLower = customerName.toLowerCase();
        let isDuplicate = false;

        if (activationDate) {
          const key = `${nameLower}|${agencyId}|${activationDate}`;
          if (existingByActivationDate.has(key)) isDuplicate = true;
        }
        if (!isDuplicate && entryDate) {
          const key = `${nameLower}|${agencyId}|${entryDate}`;
          if (existingByEntryDate.has(key)) isDuplicate = true;
        }
        // 날짜가 모두 없는 경우: 유심번호로 중복 판별
        const usimNumber = parseNumericText(row.usimNumber || "");
        if (!isDuplicate && !activationDate && !entryDate && usimNumber) {
          if (existingByUsim.has(usimNumber)) isDuplicate = true;
        }

        if (isDuplicate) {
          results.duplicates++;
          rowStatuses[i] = "duplicate";
          continue;
        }

        // 같은 배치 내 중복도 방지
        if (activationDate) {
          existingByActivationDate.add(`${nameLower}|${agencyId}|${activationDate}`);
        }
        if (entryDate) {
          existingByEntryDate.add(`${nameLower}|${agencyId}|${entryDate}`);
        }
        if (usimNumber) {
          existingByUsim.add(usimNumber);
        }

        batchRowIndices.push(i);
        batchValues.push({
          agencyId,
          customerName,
          usimNumber: parseNumericText(row.usimNumber || "") || null,
          entryDate,
          subscriptionNumber: parseNumericText(row.subscriptionNumber || "") || null,
          newPhoneNumber: parseNumericText(row.newPhoneNumber || "") || null,
          virtualAccount: parseNumericText(row.virtualAccount || "") || null,
          subscriptionType: row.subscriptionType || "신규",
          ratePlan: row.ratePlan || null,
          deviceChangeConfirmed: parseBool(row.deviceChangeConfirmed || ""),
          selectedCommitment: parseBool(row.selectedCommitment || ""),
          activationDate,
          activationStatus: row.activationStatus || "대기",
          personInCharge: row.personInCharge || null,
          applicationDocs: row.applicationDocs || null,
          applicationDocsReview: row.applicationDocsReview || null,
          nameChangeDocs: row.nameChangeDocs || null,
          nameChangeDocsReview: row.nameChangeDocsReview || null,
          arcAutopayInfo: row.arcAutopayInfo || row.arcInfo || null,
          arcAutopayReview: row.arcAutopayReview || row.arcReview || null,
          arcInfo: row.arcInfo || row.arcAutopayInfo || null,
          arcReview: row.arcReview || row.arcAutopayReview || null,
          autopayInfo: row.autopayInfo || null,
          autopayReview: row.autopayReview || null,
          arcSupplement: row.arcSupplement || null,
          arcSupplementDeadline: parseDate(row.arcSupplementDeadline || ""),
          supplementStatus: row.supplementStatus || null,
          autopayRegistered: parseBool(row.autopayRegistered || ""),
          notes: row.notes || null,
          commitmentDate: parseDate(row.commitmentDate || ""),
          activationMethod: row.activationMethod || null,
          workStatus: row.activationStatus === "개통완료" ? "개통완료" : "입력중",
          // 개통완료 + 개통날짜 있으면 보완기한 자동설정 (외국인등록증 제외)
          ...(row.activationStatus === "개통완료" && activationDate && row.activationMethod !== "외국인등록증" && !parseDate(row.arcSupplementDeadline || "")
            ? (() => {
                const dl = new Date(activationDate);
                dl.setDate(dl.getDate() + 99);
                return { arcSupplementDeadline: dl.toISOString().split("T")[0] };
              })()
            : {}),
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        results.errors.push(`행 ${i + 1}: ${message}`);
        results.skipped++;
        rowStatuses[i] = "error";
      }
    }

    // 배치 인서트 (50건씩 나눠서)
    const BATCH_SIZE = 50;
    for (let i = 0; i < batchValues.length; i += BATCH_SIZE) {
      const batch = batchValues.slice(i, i + BATCH_SIZE);
      const indices = batchRowIndices.slice(i, i + BATCH_SIZE);
      try {
        await db.insert(activations).values(batch);
        results.inserted += batch.length;
        for (const idx of indices) rowStatuses[idx] = "inserted";
      } catch (err: unknown) {
        // 배치 실패 시 개별 삽입으로 폴백
        for (let j = 0; j < batch.length; j++) {
          try {
            await db.insert(activations).values(batch[j]);
            results.inserted++;
            rowStatuses[indices[j]] = "inserted";
          } catch (innerErr: unknown) {
            const message = innerErr instanceof Error ? innerErr.message : String(innerErr);
            results.errors.push(`${batch[j].customerName}: ${message}`);
            results.skipped++;
            rowStatuses[indices[j]] = "error";
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      rowStatuses,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "가져오기 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
