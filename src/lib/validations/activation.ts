import { z } from "zod/v4";

/** 개통 데이터 생성 시 입력값 검증 스키마 */
export const createActivationSchema = z.object({
  agencyId: z.string().min(1, "거래처 ID는 필수입니다"),
  customerName: z.string().min(1, "고객명은 필수입니다").max(100),
  usimNumber: z.string().max(50).optional().nullable(),
  entryDate: z.string().optional().nullable(),

  // 가입 정보
  subscriptionNumber: z.string().max(50).optional().nullable(),
  newPhoneNumber: z.string().max(20).optional().nullable(),
  virtualAccount: z.string().max(50).optional().nullable(),
  subscriptionType: z.string().max(20).optional().nullable(),
  ratePlan: z.string().max(50).optional().nullable(),

  // 개통 상태
  deviceChangeConfirmed: z.boolean().optional(),
  selectedCommitment: z.boolean().optional(),
  commitmentDate: z.string().optional().nullable(),
  activationDate: z.string().optional().nullable(),
  activationStatus: z.string().max(20).optional().nullable(),
  personInCharge: z.string().max(30).optional().nullable(),
  workStatus: z.string().max(20).optional().nullable(),

  // 서류 상태
  applicationDocs: z.string().max(200).optional().nullable(),
  applicationDocsReview: z.string().max(200).optional().nullable(),
  nameChangeDocs: z.string().max(200).optional().nullable(),
  nameChangeDocsReview: z.string().max(200).optional().nullable(),
  arcAutopayInfo: z.string().max(200).optional().nullable(),
  arcAutopayReview: z.string().max(200).optional().nullable(),
  arcSupplement: z.string().max(200).optional().nullable(),
  arcSupplementDeadline: z.string().optional().nullable(),
  arcInfo: z.string().max(500).optional().nullable(),
  arcReview: z.string().max(200).optional().nullable(),
  autopayInfo: z.string().max(500).optional().nullable(),
  autopayReview: z.string().max(200).optional().nullable(),
  supplementStatus: z.string().max(20).optional().nullable(),
  autopayRegistered: z.boolean().optional(),

  // 추가 필드
  customerMemo: z.string().max(500).optional().nullable(),
  combinedUnitNameChange: z.boolean().optional(),
  billingAccountNameChange: z.boolean().optional(),
  existingBillingAccount: z.string().max(50).optional().nullable(),
  newBillingAccount: z.string().max(50).optional().nullable(),
  holdReason: z.string().max(200).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

/** 개통 데이터 수정 시 입력값 검증 스키마 (모든 필드 optional) */
export const updateActivationSchema = createActivationSchema.partial();

export type CreateActivationInput = z.infer<typeof createActivationSchema>;
export type UpdateActivationInput = z.infer<typeof updateActivationSchema>;
