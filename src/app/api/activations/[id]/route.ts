import { NextRequest, NextResponse } from "next/server";
import {
  getActivationById,
  updateActivation,
  deleteActivation,
} from "@/lib/db/queries/activations";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessAgency } from "@/lib/db/queries/users";
import { markUsimUsed, markUsimCancelled } from "@/lib/db/queries/usims";
import { updateActivationSchema } from "@/lib/validations/activation";

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
    const body = parsed.data;

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

          // 개통완료 시 보완기한 자동 설정 (90일)
          if (!existing.arcSupplementDeadline) {
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + 90);
            updateData.arcSupplementDeadline = deadline.toISOString().split("T")[0];
          }
        }
      }

      // 하위호환: activationStatus 직접 변경 시에도 잠금
      if (body.activationStatus === "개통완료" && !body.workStatus) {
        updateData.isLocked = true;
        updateData.lockedAt = new Date();
        updateData.lockedBy = user.id;

        // 보완기한 자동 설정
        if (!existing.arcSupplementDeadline) {
          const deadline = new Date();
          deadline.setDate(deadline.getDate() + 90);
          updateData.arcSupplementDeadline = deadline.toISOString().split("T")[0];
        }
      }
    }

    // 3개 검수(nameChangeDocsReview, arcReview, autopayReview) 모두 "완료" → supplementStatus 자동 완료
    const finalNameChangeReview = (body.nameChangeDocsReview ?? existing.nameChangeDocsReview) as string | null;
    const finalArcReview = (body.arcReview ?? existing.arcReview) as string | null;
    const finalAutopayReview = (body.autopayReview ?? existing.autopayReview) as string | null;

    if (
      finalNameChangeReview === "완료" &&
      finalArcReview === "완료" &&
      finalAutopayReview === "완료"
    ) {
      updateData.supplementStatus = "완료";
    } else if (existing.supplementStatus === "완료") {
      // 이전에 완료였는데 검수가 변경되면 완료 해제
      if (
        finalNameChangeReview !== "완료" ||
        finalArcReview !== "완료" ||
        finalAutopayReview !== "완료"
      ) {
        updateData.supplementStatus = null;
      }
    }

    const activation = await updateActivation(id, updateData);

    // ─── 유심 재고 자동 연동 ───
    try {
      // 1) 개통완료 시 유심번호가 있으면 자동 USED 처리
      const newUsimNumber = body.usimNumber || existing.usimNumber;
      const isBecomingComplete =
        body.workStatus === "개통완료" ||
        body.activationStatus === "개통완료";
      const wasNotComplete =
        existing.workStatus !== "개통완료" &&
        existing.activationStatus !== "개통완료";

      if (isBecomingComplete && wasNotComplete && newUsimNumber) {
        await markUsimUsed(newUsimNumber, existing.agencyId, id);
      }

      // 2) usimNumber가 새로 입력되고 이미 개통완료 상태면 자동 USED
      if (
        body.usimNumber &&
        body.usimNumber !== existing.usimNumber &&
        (existing.workStatus === "개통완료" || existing.activationStatus === "개통완료")
      ) {
        await markUsimUsed(body.usimNumber, existing.agencyId, id);
      }

      // 3) 개통취소 시 유심 CANCELLED 처리
      if (
        body.activationStatus === "개통취소" &&
        existing.activationStatus !== "개통취소"
      ) {
        await markUsimCancelled(id);
      }
    } catch (usimError) {
      // 유심 연동 실패해도 개통 업데이트는 성공 처리 (로그만 남김)
      console.warn("USIM auto-link failed (non-critical):", usimError);
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
