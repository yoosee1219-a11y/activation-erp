import {
  pgTable,
  text,
  boolean,
  timestamp,
  uuid,
  date,
  serial,
  integer,
} from "drizzle-orm/pg-core";

// 0. agency_categories (거래처 분류 - 대분류/중분류)
export const agencyCategories = pgTable("agency_categories", {
  id: text("id").primaryKey(), // 'DOD', 'DOD_키르기스스탄' 등
  name: text("name").notNull(), // 표시명
  level: text("level").notNull(), // 'major' | 'medium'
  parentId: text("parent_id"), // medium이면 major의 id
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// 1. agencies (거래처/유학원 = 소분류)
export const agencies = pgTable("agencies", {
  id: text("id").primaryKey(), // 'dream_high', 'creatoria' 등
  name: text("name").notNull(),
  majorCategory: text("major_category"), // 대분류: 'DOD'
  mediumCategory: text("medium_category"), // 중분류: 'DOD_키르기스스탄'
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  commissionRate: integer("commission_rate"), // 건당 개통수수료 (원)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// 2. user_profiles (사용자)
export const userProfiles = pgTable("user_profiles", {
  id: text("id").primaryKey(), // Better Auth user ID
  email: text("email").unique().notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("GUEST"), // ADMIN, SUB_ADMIN, PARTNER, GUEST
  allowedAgencies: text("allowed_agencies")
    .array()
    .notNull()
    .default([]),
  allowedMajorCategory: text("allowed_major_category"), // 대분류: 'DOD'
  allowedMediumCategories: text("allowed_medium_categories")
    .array()
    .default([]), // 중분류: ['DOD_키르기스스탄', 'DOD_ON']
  plainPasswordHint: text("plain_password_hint"), // 어드민 비밀번호 확인용 (평문)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// 3. activations (개통 데이터 - 핵심 테이블)
export const activations = pgTable("activations", {
  id: uuid("id").primaryKey().defaultRandom(),

  // 기본 정보
  agencyId: text("agency_id")
    .notNull()
    .references(() => agencies.id),
  customerName: text("customer_name").notNull(),
  usimNumber: text("usim_number"),
  entryDate: date("entry_date"), // 입국예정일

  // 가입 정보
  subscriptionNumber: text("subscription_number"), // 가입번호
  newPhoneNumber: text("new_phone_number"), // 신규개통번호
  virtualAccount: text("virtual_account"), // 가상계좌번호
  subscriptionType: text("subscription_type").default("신규"), // 가입유형
  ratePlan: text("rate_plan"), // 요금제

  // 개통 상태
  deviceChangeConfirmed: boolean("device_change_confirmed").default(false), // 확정기변
  selectedCommitment: boolean("selected_commitment").default(false), // 선택약정
  commitmentDate: date("commitment_date"), // 확정기변/선택약정 날짜
  activationDate: date("activation_date"), // 개통일자
  activationMethod: text("activation_method"), // 여권개통 | ARC개통
  activationStatus: text("activation_status").default("대기"), // 개통여부
  personInCharge: text("person_in_charge"), // 담당자
  workStatus: text("work_status").default("입력중"), // 진행상황: 입력중/개통요청/진행중/개통완료/보완요청

  // 서류 상태
  applicationDocs: text("application_docs"), // 가입신청서류
  applicationDocsReview: text("application_docs_review"), // 서류검수 1
  nameChangeDocs: text("name_change_docs"), // 명의변경서류
  nameChangeDocsReview: text("name_change_docs_review"), // 서류검수 2
  arcAutopayInfo: text("arc_autopay_info"), // 외국인등록증 + 자동이체 정보
  arcAutopayReview: text("arc_autopay_review"), // 서류검수 3
  arcSupplement: text("arc_supplement"), // 외국인등록증보완
  arcSupplementDeadline: date("arc_supplement_deadline"), // 외국인등록증보완기한
  arcInfo: text("arc_info"), // 외국인등록증 서류
  arcReview: text("arc_review"), // 외국인등록증 검수결과
  autopayInfo: text("autopay_info"), // 자동이체 서류
  autopayReview: text("autopay_review"), // 자동이체 검수결과
  supplementStatus: text("supplement_status"), // 보완기한 상태
  autopayRegistered: boolean("autopay_registered").default(false), // 자동이체등록여부

  // 고객 추가메모 (특이사항/상세사유)
  customerMemo: text("customer_memo"),

  // 명의변경 정보 (결합단위 명의변경)
  combinedUnitNameChange: boolean("combined_unit_name_change").default(false), // 결합단위 명의변경
  billingAccountNameChange: boolean("billing_account_name_change").default(false), // 청구계정결합단위 명의변경
  existingBillingAccount: text("existing_billing_account"), // 기존 청구계정
  newBillingAccount: text("new_billing_account"), // 새로 생성된 청구계정

  // 보류 사유 (보류-서류/체납/신분증/계좌정보)
  holdReason: text("hold_reason"),

  // 해지 정보
  terminationDate: date("termination_date"),
  terminationReason: text("termination_reason"), // "보완기한초과"|"6개월해지"|"수동해지"
  terminationAlertDate: date("termination_alert_date"), // 해지예고일

  // 기타
  notes: text("notes"), // 비고
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),

  // 잠금 (관리자가 개통완료 후 거래처 편집 방지)
  isLocked: boolean("is_locked").default(false),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  lockedBy: text("locked_by"),
});

// 4-1. activation_notes (특이사항 댓글)
export const activationNotes = pgTable("activation_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  activationId: uuid("activation_id")
    .notNull()
    .references(() => activations.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull(),
  authorName: text("author_name").notNull(),
  authorRole: text("author_role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// 4-2. activation_logs (작업이력)
export const activationLogs = pgTable("activation_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  activationId: uuid("activation_id")
    .notNull()
    .references(() => activations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull(),
  agencyName: text("agency_name"),
  action: text("action").notNull(),
  details: text("details").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// 4. document_files (서류 파일 메타데이터)
export const documentFiles = pgTable("document_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  activationId: uuid("activation_id").references(() => activations.id, {
    onDelete: "cascade",
  }),
  agencyId: text("agency_id")
    .notNull()
    .references(() => agencies.id),
  fileType: text("file_type").notNull(), // 'application', 'name_change', 'arc', 'autopay'
  fileName: text("file_name").notNull(),
  googleDriveFileId: text("google_drive_file_id").notNull(),
  googleDriveLink: text("google_drive_link"),
  uploadedBy: text("uploaded_by").references(() => userProfiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// 5. usim_logs (유심 수량 원장 - 배정/이송 수량 기록)
export const usimLogs = pgTable("usim_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull(),
  action: text("action").notNull(), // "assign"|"transfer"|"adjust"
  details: text("details").notNull(),
  agencyId: text("agency_id"),
  agencyName: text("agency_name"),
  targetAgencyId: text("target_agency_id"),
  targetAgencyName: text("target_agency_name"),
  usimCount: integer("usim_count"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// 6. notices (공지사항)
export const notices = pgTable("notices", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isImportant: boolean("is_important").default(false),
  createdBy: text("created_by").notNull(),
  createdByName: text("created_by_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// 7. activation_status_config (상태값 설정)
export const activationStatusConfig = pgTable("activation_status_config", {
  id: serial("id").primaryKey(),
  statusKey: text("status_key").unique().notNull(),
  statusLabel: text("status_label").notNull(),
  color: text("color"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
});

// Better Auth 테이블 (Better Auth가 자동 관리)
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});
