export type UserRole = "ADMIN" | "SUB_ADMIN" | "PARTNER" | "GUEST";

export type ActivationStatus = "대기" | "개통완료" | "개통취소";

export type SubscriptionType = "신규" | "번호이동" | "기기변경";

export type DocumentFileType = "application" | "name_change" | "arc" | "autopay";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  allowedAgencies: string[];
  allowedMajorCategory: string | null;
  allowedMediumCategories: string[];
}
