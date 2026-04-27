// 서류 보완 상태 판별 공통 헬퍼
// 색상 규칙:
//   - complete    : 녹색  (모든 검수 완료)
//   - autopay-only: 노란색 (자동이체만 미완료, 나머지는 완료)
//   - overdue     : 빨강  (기한초과)
//   - near        : 빨강  (D-30 이내)
//   - mid         : 주황  (D-31 ~ D-60)
//   - future      : 회색  (D-61 이상)
//   - none        : 미설정 (기한 없음)

export interface SupplementInput {
  activationMethod: string | null;
  applicationDocsReview: string | null;
  nameChangeDocsReview: string | null;
  arcReview: string | null;
  autopayReview: string | null;
  arcSupplementDeadline: string | null;
}

export type SupplementKind =
  | "complete"
  | "autopay-only"
  | "overdue"
  | "near"
  | "mid"
  | "future"
  | "none";

export interface SupplementInfo {
  kind: SupplementKind;
  daysLeft?: number;
  label: string;
  badgeClass: string;
}

const REVIEW_DONE = "완료";

// 검수 상태 분류 (필터링용)
//   완료    : '완료'                       → 관리자 최종 확인 OK
//   미완료  : '보완요청' | '보완완료' | null → 아직 관리자 확인 전 (보완완료 = 파트너가 보완 마쳤음, 관리자 확인 대기)
export type ReviewBucket = "완료" | "미완료";

export function reviewBucket(review: string | null | undefined): ReviewBucket {
  return review === REVIEW_DONE ? "완료" : "미완료";
}

// 외국인등록증 개통의 경우 명변/외등 검수가 N/A → 필터에서 제외해야 함
// 필요한 검수 차원 반환
export type DocFacet = "applicationDocs" | "nameChangeDocs" | "arc" | "autopay";

export function isFacetApplicable(
  facet: DocFacet,
  activationMethod: string | null | undefined
): boolean {
  const isArc = activationMethod === "외국인등록증";
  if (isArc) {
    // 외국인등록증 개통은 명변/외등 N/A
    return facet === "applicationDocs" || facet === "autopay";
  }
  return true;
}

export const FACET_TO_REVIEW_FIELD: Record<DocFacet, keyof SupplementInput> = {
  applicationDocs: "applicationDocsReview",
  nameChangeDocs: "nameChangeDocsReview",
  arc: "arcReview",
  autopay: "autopayReview",
};

export const FACET_LABELS: Record<DocFacet, string> = {
  applicationDocs: "가입신청서",
  nameChangeDocs: "명의변경서류",
  arc: "외국인등록증",
  autopay: "자동이체",
};

export function getSupplementInfo(r: SupplementInput): SupplementInfo {
  const isArc = r.activationMethod === "외국인등록증";

  // 외국인등록증 개통: 가입신청서 + 자동이체 검수만 필요
  // 여권개통:        가입신청서 + 명의변경 + 외등 + 자동이체 4개 모두 필요
  const requiredReviews = isArc
    ? [r.applicationDocsReview, r.autopayReview]
    : [r.applicationDocsReview, r.nameChangeDocsReview, r.arcReview, r.autopayReview];

  const allComplete = requiredReviews.every((v) => v === REVIEW_DONE);
  if (allComplete) {
    return {
      kind: "complete",
      label: "완료",
      badgeClass: "bg-green-100 text-green-700",
    };
  }

  // 자동이체만 미완료 (나머지 필수 검수는 모두 완료) → 노란색
  const otherReviews = isArc
    ? [r.applicationDocsReview]
    : [r.applicationDocsReview, r.nameChangeDocsReview, r.arcReview];
  const othersDone = otherReviews.every((v) => v === REVIEW_DONE);
  const autopayPending = r.autopayReview !== REVIEW_DONE;
  if (othersDone && autopayPending) {
    return {
      kind: "autopay-only",
      label: "자동이체",
      badgeClass: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    };
  }

  // 기한 기반 색상
  const deadline = r.arcSupplementDeadline;
  if (!deadline) {
    return {
      kind: "none",
      label: "-",
      badgeClass: "text-gray-400",
    };
  }

  const daysLeft = Math.ceil(
    (new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysLeft < 0) {
    return {
      kind: "overdue",
      daysLeft,
      label: "기한초과",
      badgeClass: "bg-red-100 text-red-700",
    };
  }
  if (daysLeft <= 30) {
    return {
      kind: "near",
      daysLeft,
      label: `D-${daysLeft}`,
      badgeClass: "bg-red-100 text-red-700",
    };
  }
  if (daysLeft <= 60) {
    return {
      kind: "mid",
      daysLeft,
      label: `D-${daysLeft}`,
      badgeClass: "bg-orange-100 text-orange-700",
    };
  }
  return {
    kind: "future",
    daysLeft,
    label: `D-${daysLeft}`,
    badgeClass: "bg-gray-100 text-gray-600",
  };
}
