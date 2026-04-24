import { NextRequest, NextResponse } from "next/server";
import {
  getActivationById,
  updateActivation,
  deleteActivation,
} from "@/lib/db/queries/activations";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessAgency } from "@/lib/db/queries/users";

import { addActivationLog } from "@/lib/db/queries/activation-logs";
import { updateActivationSchema } from "@/lib/validations/activation";
import { db } from "@/lib/db";
import { agencyCategories, account } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// 거래처(PARTNER)가 편집할 수 있는 필드 (전체 목록)
const PARTNER_EDITABLE_FIELDS = new Set([
  // 기본 정보 (입력중/보완요청 상태에서만)
  "customerName",
  "usimNumber",
  "entryDate",
  "subscriptionType",
  "ratePlan",
  // 서류 (입력중/보완요청 상태에서만, 개통완료 후에도 보완 서류는 개별 검수 기준)
  "applicationDocs",
  "nameChangeDocs",
  "arcInfo",
  "autopayInfo",
  // 검수 상태 (파트너가 "진행요청"으로 변경 가능)
  "applicationDocsReview",
  "nameChangeDocsReview",
  "arcReview",
  "autopayReview",
  // 진행상황 (입력중→개통요청, 보완요청→개통요청)
  "workStatus",
  // 고객 추가메모
  "customerMemo",
  // 개통방법
  "activationMethod",
  // 명의변경 정보
  "combinedUnitNameChange",
  "billingAccountNameChange",
  "existingBillingAccount",
  "newBillingAccount",
  // 보류 사유
  "holdReason",
  // 하위호환: 기존 필드 유지
  "arcAutopayInfo",
  "arcSupplement",
]);

// 서류 필드 (문서 파일 업로드 필드)
const DOCUMENT_FIELDS = new Set([
  "applicationDocs",
  "nameChangeDocs",
  "arcInfo",
  "autopayInfo",
  "arcAutopayInfo", // 하위호환
]);

// 검수 필드 (파트너가 "진행요청"으로만 변경 가능)
const REVIEW_FIELDS = new Set([
  "applicationDocsReview",
  "nameChangeDocsReview",
  "arcReview",
  "autopayReview",
]);

// 서류 → 검수 필드 매핑 (서류별 잠금 판단용)
const DOC_TO_REVIEW_MAP: Record<string, string> = {
  applicationDocs: "applicationDocsReview",
  nameChangeDocs: "nameChangeDocsReview",
  arcInfo: "arcReview",
  autopayInfo: "autopayReview",
};

// 기본 정보 필드
const PARTNER_BASIC_FIELDS = new Set([
  "customerName",
  "usimNumber",
  "entryDate",
  "subscriptionType",
  "ratePlan",
]);

// 파트너가 편집 가능한 상태 (입력중 + 보완요청)
const PARTNER_EDITABLE_STATUSES = new Set(["입력중", "보완요청"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const activation = await getActivationById(id);

    if (!activation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (
      !canAccessAgency(user.role, user.allowedAgencies, activation.agencyId)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ activation });
  } catch (error) {
    console.error("Failed to fetch activation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role === "GUEST") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await getActivationById(id);

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (
      !canAccessAgency(user.role, user.allowedAgencies, existing.agencyId)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawBody = await request.json();

    // 입력값 검증 (zod)
    const parsed = updateActivationSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다", details: parsed.error.issues },
        { status: 400 }
      );
    }
    // 빈 문자열 → null 변환 (PostgreSQL date/text 필드 호환)
    const body = Object.fromEntries(
      Object.entries(parsed.data).map(([key, value]) => [
        key,
        value === "" ? null : value,
      ])
    ) as typeof parsed.data;

    // PARTNER 역할 제한 (workStatus 기반 통합 권한)
    if (user.role === "PARTNER") {
      const requestedFields = Object.keys(body);
      const currentWorkStatus = existing.workStatus || "입력중";
      const isEditable = PARTNER_EDITABLE_STATUSES.has(currentWorkStatus);
      const isPostSubmission = ["개통요청", "진행중", "개통완료"].includes(currentWorkStatus);

      // 1) 관리자 전용 필드 수정 시도 → 거부
      const forbiddenFields = requestedFields.filter(
        (f) => !PARTNER_EDITABLE_FIELDS.has(f)
      );
      if (forbiddenFields.length > 0) {
        return NextResponse.json(
          { error: `수정 권한이 없는 필드: ${forbiddenFields.join(", ")}` },
          { status: 403 }
        );
      }

      // 2) workStatus 변경 검증
      if (body.workStatus !== undefined) {
        // 입력중 → 개통요청, 보완요청 → 개통요청만 허용
        if (!isEditable) {
          return NextResponse.json(
            { error: "현재 상태에서는 진행상황을 변경할 수 없습니다." },
            { status: 403 }
          );
        }
        if (body.workStatus !== "개통요청") {
          return NextResponse.json(
            { error: "개통요청으로만 변경할 수 있습니다." },
            { status: 403 }
          );
        }
      }

      // 3) 기본 정보 필드: 입력중/보완요청 상태에서만 편집 가능
      const basicAttempt = requestedFields.filter((f) => PARTNER_BASIC_FIELDS.has(f));
      if (basicAttempt.length > 0 && !isEditable) {
        return NextResponse.json(
          { error: "현재 상태에서는 기본 정보를 수정할 수 없습니다." },
          { status: 403 }
        );
      }

      // 4) 검수 필드: 파트너는 "진행요청"으로만 변경 가능
      for (const field of requestedFields) {
        if (REVIEW_FIELDS.has(field)) {
          const newValue = (body as Record<string, unknown>)[field];
          if (newValue !== "진행요청") {
            return NextResponse.json(
              { error: `검수 상태는 "진행요청"으로만 변경할 수 있습니다.` },
              { status: 403 }
            );
          }
        }
      }

      // 5) 서류 필드: 서류별 잠금 로직
      for (const field of requestedFields) {
        if (DOCUMENT_FIELDS.has(field)) {
          if (isPostSubmission) {
            // 개통요청/진행중/개통완료 후: 검수 상태 기반 잠금
            const reviewField = DOC_TO_REVIEW_MAP[field];
            if (reviewField) {
              const reviewValue = (existing as Record<string, unknown>)[reviewField] as string | null;
              // "진행요청" 또는 "완료"이면 해당 서류 잠금
              if (reviewValue === "진행요청" || reviewValue === "완료") {
                return NextResponse.json(
                  { error: `해당 서류는 검수 ${reviewValue} 상태이므로 수정할 수 없습니다.` },
                  { status: 403 }
                );
              }
              // "보완요청"이면 편집 가능 (continue)
            }
          } else if (!isEditable) {
            // 입력중/보완요청 외 상태에서 서류 수정 불가
            return NextResponse.json(
              { error: "현재 상태에서는 서류를 수정할 수 없습니다." },
              { status: 403 }
            );
          }
        }
      }
    }

    // 자동 잠금 제어 (workStatus 기반 통합)
    const updateData: Record<string, unknown> = { ...body };

    if (user.role === "PARTNER") {
      // 파트너가 개통요청으로 변경 → 자동 잠금
      if (body.workStatus === "개통요청") {
        updateData.isLocked = true;
        updateData.lockedAt = new Date();
        updateData.lockedBy = user.id;
      }
    }

    if (user.role === "ADMIN" || user.role === "SUB_ADMIN") {
      if (body.workStatus) {
        if (body.workStatus === "보완요청" || body.workStatus === "입력중") {
          // 보완요청/입력중 → 잠금 해제 (파트너 편집 가능)
          updateData.isLocked = false;
          updateData.lockedAt = null;
          updateData.lockedBy = null;
        } else if (body.workStatus === "개통요청" || body.workStatus === "진행중") {
          // 개통요청/진행중 → 잠금
          updateData.isLocked = true;
          updateData.lockedAt = new Date();
          updateData.lockedBy = user.id;
        } else if (body.workStatus === "개통완료") {
          // 개통완료 → 잠금 + activationStatus 동기화
          updateData.isLocked = true;
          updateData.lockedAt = new Date();
          updateData.lockedBy = user.id;
          updateData.activationStatus = "개통완료";

          const method = (body as Record<string, unknown>).activationMethod ?? existing.activationMethod;

          if (method === "외국인등록증") {
            // 외국인등록증: 검수/보완 불필요 → 바로 최종완료
            updateData.workStatus = "최종완료";
            updateData.supplementStatus = "완료";
            // deadline 설정 안 함
          } else {
            // 여권개통(기본): activationDate 기준 D-99
            const actDate = ((body as Record<string, unknown>).activationDate ?? existing.activationDate) as string | null;
            if (actDate && !existing.arcSupplementDeadline) {
              const deadline = new Date(actDate);
              deadline.setDate(deadline.getDate() + 99);
              updateData.arcSupplementDeadline = deadline.toISOString().split("T")[0];
            }
          }
        } else if (body.workStatus === "해지") {
          // 해지 → 잠금 + 해지일 + 해지사유 설정
          updateData.isLocked = true;
          updateData.lockedAt = new Date();
          updateData.lockedBy = user.id;
          updateData.terminationDate = new Date().toISOString().split("T")[0];
          updateData.terminationReason = body.terminationReason || "수동해지";
        }
      }

      // 하위호환: activationStatus 직접 변경 시에도 잠금
      if (body.activationStatus === "개통완료" && !body.workStatus) {
        updateData.isLocked = true;
        updateData.lockedAt = new Date();
        updateData.lockedBy = user.id;

        const method = (body as Record<string, unknown>).activationMethod ?? existing.activationMethod;
        if (method === "외국인등록증") {
          updateData.workStatus = "최종완료";
          updateData.supplementStatus = "완료";
        } else {
          // 보완기한 자동 설정 (D-99)
          const actDate = ((body as Record<string, unknown>).activationDate ?? existing.activationDate) as string | null;
          if (actDate && !existing.arcSupplementDeadline) {
            const deadline = new Date(actDate);
            deadline.setDate(deadline.getDate() + 99);
            updateData.arcSupplementDeadline = deadline.toISOString().split("T")[0];
          }
        }
      }
    }

    // 4개 검수 모두 "완료" + workStatus "최종완료" → supplementStatus 자동 완료 + deadline 해제
    const finalAppDocsReview = (body.applicationDocsReview ?? existing.applicationDocsReview) as string | null;
    const finalNameChangeReview = (body.nameChangeDocsReview ?? existing.nameChangeDocsReview) as string | null;
    const finalArcReview = (body.arcReview ?? existing.arcReview) as string | null;
    const finalAutopayReview = (body.autopayReview ?? existing.autopayReview) as string | null;
    const finalWorkStatus = ((updateData.workStatus as string) ?? existing.workStatus) as string;

    const allReviewsComplete =
      finalAppDocsReview === "완료" &&
      finalNameChangeReview === "완료" &&
      finalArcReview === "완료" &&
      finalAutopayReview === "완료";

    if (allReviewsComplete && finalWorkStatus === "최종완료") {
      updateData.supplementStatus = "완료";
      updateData.arcSupplementDeadline = null; // D-day 해제
    } else if (existing.supplementStatus === "완료") {
      // 이전에 완료였는데 검수/상태가 변경되면 완료 해제 (외국인등록증은 제외)
      const method = (updateData.activationMethod as string) ?? existing.activationMethod;
      if (method !== "외국인등록증") {
        const stillComplete = allReviewsComplete && finalWorkStatus === "최종완료";
        if (!stillComplete) {
          updateData.supplementStatus = null;
        }
      }
    }

    const activation = await updateActivation(id, updateData);

    // ─── 작업이력 자동 기록 ───
    try {
      const changes: string[] = [];

      if (body.workStatus && body.workStatus !== existing.workStatus) {
        changes.push(`작업상태를 '${body.workStatus}'(으)로 변경`);
      }
      if (body.personInCharge && body.personInCharge !== existing.personInCharge) {
        changes.push(`담당자를 '${body.personInCharge}'(으)로 배정`);
      }
      if (body.customerName && body.customerName !== existing.customerName) {
        changes.push(`고객정보 업데이트`);
      }
      if (body.usimNumber && body.usimNumber !== existing.usimNumber) {
        changes.push(`유심번호 변경`);
      }
      if (body.activationStatus && body.activationStatus !== existing.activationStatus) {
        changes.push(`개통상태를 '${body.activationStatus}'(으)로 변경`);
      }
      // 서류 업로드 감지
      const docFields = [
        { key: "applicationDocs", label: "가입신청서류" },
        { key: "nameChangeDocs", label: "명의변경서류" },
        { key: "arcInfo", label: "외국인등록증" },
        { key: "autopayInfo", label: "자동이체" },
      ];
      for (const { key, label } of docFields) {
        const bodyVal = (body as Record<string, unknown>)[key];
        const existVal = (existing as Record<string, unknown>)[key];
        if (bodyVal && bodyVal !== existVal) {
          changes.push(`${label} 서류 업데이트`);
        }
      }
      // 검수 변경 감지
      const reviewFields = [
        { key: "applicationDocsReview", label: "가입신청서류 검수" },
        { key: "nameChangeDocsReview", label: "명의변경서류 검수" },
        { key: "arcReview", label: "외국인등록증 검수" },
        { key: "autopayReview", label: "자동이체 검수" },
      ];
      for (const { key, label } of reviewFields) {
        const bodyVal = (body as Record<string, unknown>)[key];
        const existVal = (existing as Record<string, unknown>)[key];
        if (bodyVal && bodyVal !== existVal) {
          changes.push(`${label}를 '${bodyVal}'(으)로 변경`);
        }
      }

      if (changes.length > 0) {
        // Find agency name
        const agencyRecord = await db
          .select({ name: agencyCategories.name })
          .from(agencyCategories)
          .where(eq(agencyCategories.id, existing.agencyId))
          .limit(1);
        const agencyName = agencyRecord[0]?.name || existing.agencyId;
        const roleLabel =
          user.role === "ADMIN" || user.role === "SUB_ADMIN"
            ? "admin"
            : agencyName;

        await addActivationLog({
          activationId: id,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          agencyName,
          action: "update",
          details: `${roleLabel} [${user.name}] 님이 ${changes.join(", ")}하였습니다.`,
        });
      }
    } catch (logError) {
      console.warn("Activity log failed (non-critical):", logError);
    }

    return NextResponse.json({ activation });
  } catch (error) {
    console.error("Failed to update activation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 삭제 비밀번호 브루트포스 방지: IP별 실패 횟수 추적
const deleteAttempts = new Map<string, { count: number; lockedUntil: number }>();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || !["ADMIN", "SUB_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 레이트리밋: IP + 사용자 ID 기반 (5회 실패 시 15분 잠금)
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const attemptKey = `${clientIp}:${user.id}`;
    const attempt = deleteAttempts.get(attemptKey);

    if (attempt && attempt.lockedUntil > Date.now()) {
      const remainSec = Math.ceil((attempt.lockedUntil - Date.now()) / 1000);
      return NextResponse.json(
        { error: `너무 많은 시도입니다. ${remainSec}초 후 다시 시도해주세요.` },
        { status: 429 }
      );
    }

    // 비밀번호 확인
    const body = await request.json().catch(() => ({}));
    const { password } = body as { password?: string };
    if (!password) {
      return NextResponse.json({ error: "비밀번호를 입력해주세요." }, { status: 400 });
    }

    // 현재 로그인 사용자의 계정 비밀번호로 검증
    const { verifyPassword } = await import("better-auth/crypto");
    const accounts = await db
      .select()
      .from(account)
      .where(and(eq(account.userId, user.id), eq(account.providerId, "credential")));

    if (accounts.length === 0 || !accounts[0].password) {
      return NextResponse.json({ error: "계정 정보를 찾을 수 없습니다." }, { status: 400 });
    }

    const isValid = await verifyPassword({
      hash: accounts[0].password,
      password,
    });
    if (!isValid) {
      // 실패 횟수 증가, 5회 초과 시 15분 잠금
      const current = deleteAttempts.get(attemptKey) || { count: 0, lockedUntil: 0 };
      current.count += 1;
      if (current.count >= 5) {
        current.lockedUntil = Date.now() + 15 * 60 * 1000; // 15분
        current.count = 0;
      }
      deleteAttempts.set(attemptKey, current);
      return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 403 });
    }

    // 성공 시 실패 카운터 초기화
    deleteAttempts.delete(attemptKey);

    const { id } = await params;
    await deleteActivation(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete activation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
