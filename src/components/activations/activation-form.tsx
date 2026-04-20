"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { FileCell } from "@/components/partner/file-cell";

interface Agency {
  id: string;
  name: string;
}

interface ActivationFormProps {
  agencies: Agency[];
  initialData?: Record<string, unknown>;
  mode: "create" | "edit";
}

export function ActivationForm({
  agencies,
  initialData,
  mode,
}: ActivationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const RATE_PLAN_OPTIONS = ["5G심플", "유스5G심플", "LTE추격데69"];
  const [ratePlanCustomMode, setRatePlanCustomMode] = useState(
    () => !!(initialData?.ratePlan) && !["5G심플", "유스5G심플", "LTE추격데69"].includes((initialData?.ratePlan as string) || "")
  );
  const [formData, setFormData] = useState({
    agencyId: (initialData?.agencyId as string) || "",
    customerName: (initialData?.customerName as string) || "",
    usimNumber: (initialData?.usimNumber as string) || "",
    entryDate: (initialData?.entryDate as string) || "",
    subscriptionNumber: (initialData?.subscriptionNumber as string) || "",
    newPhoneNumber: (initialData?.newPhoneNumber as string) || "",
    virtualAccount: (initialData?.virtualAccount as string) || "",
    subscriptionType: (initialData?.subscriptionType as string) || "신규",
    ratePlan: (initialData?.ratePlan as string) || "",
    deviceChangeConfirmed:
      (initialData?.deviceChangeConfirmed as boolean) || false,
    selectedCommitment:
      (initialData?.selectedCommitment as boolean) || false,
    commitmentDate: (initialData?.commitmentDate as string) || "",
    activationDate: (initialData?.activationDate as string) || "",
    activationStatus:
      (initialData?.activationStatus as string) || "대기",
    personInCharge: (initialData?.personInCharge as string) || "",
    applicationDocs: (initialData?.applicationDocs as string) || "",
    applicationDocsReview:
      (initialData?.applicationDocsReview as string) || "",
    nameChangeDocs: (initialData?.nameChangeDocs as string) || "",
    nameChangeDocsReview:
      (initialData?.nameChangeDocsReview as string) || "",
    arcAutopayInfo: (initialData?.arcAutopayInfo as string) || "",
    arcAutopayReview: (initialData?.arcAutopayReview as string) || "",
    arcSupplement: (initialData?.arcSupplement as string) || "",
    arcSupplementDeadline:
      (initialData?.arcSupplementDeadline as string) || "",
    autopayRegistered:
      (initialData?.autopayRegistered as boolean) || false,
    // 고객 추가메모
    customerMemo: (initialData?.customerMemo as string) || "",
    // 명의변경 정보
    combinedUnitNameChange:
      (initialData?.combinedUnitNameChange as boolean) || false,
    billingAccountNameChange:
      (initialData?.billingAccountNameChange as boolean) || false,
    existingBillingAccount:
      (initialData?.existingBillingAccount as string) || "",
    newBillingAccount: (initialData?.newBillingAccount as string) || "",
    // 보류 사유
    holdReason: (initialData?.holdReason as string) || "",
    notes: (initialData?.notes as string) || "",
  });

  const updateField = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agencyId || !formData.customerName) {
      toast.error("거래처와 고객명은 필수입니다.");
      return;
    }

    setLoading(true);

    try {
      const url =
        mode === "create"
          ? "/api/activations"
          : `/api/activations/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save");
      }

      toast.success(
        mode === "create" ? "개통 정보가 등록되었습니다." : "수정되었습니다."
      );
      router.push("/activations");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "저장 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="agencyId">거래처 *</Label>
            <Select
              value={formData.agencyId}
              onValueChange={(v) => updateField("agencyId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="거래처 선택" />
              </SelectTrigger>
              <SelectContent>
                {agencies.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerName">고객명 *</Label>
            <Input
              id="customerName"
              value={formData.customerName}
              onChange={(e) => updateField("customerName", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="usimNumber">USIM 번호</Label>
            <Input
              id="usimNumber"
              value={formData.usimNumber}
              onChange={(e) => updateField("usimNumber", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entryDate">입국예정일</Label>
            <Input
              id="entryDate"
              type="date"
              value={formData.entryDate}
              onChange={(e) => updateField("entryDate", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="personInCharge">담당자</Label>
            <Input
              id="personInCharge"
              value={formData.personInCharge}
              onChange={(e) => updateField("personInCharge", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 가입 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>가입 정보</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="subscriptionNumber">가입번호</Label>
            <Input
              id="subscriptionNumber"
              value={formData.subscriptionNumber}
              onChange={(e) =>
                updateField("subscriptionNumber", e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPhoneNumber">신규개통번호</Label>
            <Input
              id="newPhoneNumber"
              value={formData.newPhoneNumber}
              onChange={(e) => updateField("newPhoneNumber", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="virtualAccount">가상계좌번호</Label>
            <Input
              id="virtualAccount"
              value={formData.virtualAccount}
              onChange={(e) => updateField("virtualAccount", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subscriptionType">가입유형</Label>
            <Select
              value={formData.subscriptionType}
              onValueChange={(v) => updateField("subscriptionType", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="신규">신규</SelectItem>
                <SelectItem value="번호이동">번호이동</SelectItem>
                <SelectItem value="기기변경">기기변경</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ratePlan">요금제</Label>
            <Select
              value={RATE_PLAN_OPTIONS.includes(formData.ratePlan) ? formData.ratePlan : ratePlanCustomMode ? "기타" : ""}
              onValueChange={(v) => {
                if (v === "기타") {
                  setRatePlanCustomMode(true);
                  updateField("ratePlan", "");
                } else {
                  setRatePlanCustomMode(false);
                  updateField("ratePlan", v);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="요금제 선택" />
              </SelectTrigger>
              <SelectContent>
                {RATE_PLAN_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
                <SelectItem value="기타">기타</SelectItem>
              </SelectContent>
            </Select>
            {ratePlanCustomMode && !RATE_PLAN_OPTIONS.includes(formData.ratePlan) && (
              <Input
                id="ratePlan"
                value={formData.ratePlan}
                onChange={(e) => updateField("ratePlan", e.target.value)}
                placeholder="요금제 직접 입력"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* 개통 상태 */}
      <Card>
        <CardHeader>
          <CardTitle>개통 상태</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="activationStatus">개통 상태</Label>
            <Select
              value={formData.activationStatus}
              onValueChange={(v) => updateField("activationStatus", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="대기">대기</SelectItem>
                <SelectItem value="개통완료">개통완료</SelectItem>
                <SelectItem value="개통취소">개통취소</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="activationDate">개통일자</Label>
            <Input
              id="activationDate"
              type="date"
              value={formData.activationDate}
              onChange={(e) => updateField("activationDate", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commitmentDate">약정 날짜</Label>
            <Input
              id="commitmentDate"
              type="date"
              value={formData.commitmentDate}
              onChange={(e) => updateField("commitmentDate", e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2 pt-6">
            <Checkbox
              id="deviceChangeConfirmed"
              checked={formData.deviceChangeConfirmed}
              onCheckedChange={(v) =>
                updateField("deviceChangeConfirmed", !!v)
              }
            />
            <Label htmlFor="deviceChangeConfirmed">단말정보등록</Label>
          </div>

          <div className="flex items-center space-x-2 pt-6">
            <Checkbox
              id="selectedCommitment"
              checked={formData.selectedCommitment}
              onCheckedChange={(v) =>
                updateField("selectedCommitment", !!v)
              }
            />
            <Label htmlFor="selectedCommitment">약정여부</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="holdReason">보류 사유</Label>
            <Select
              value={formData.holdReason}
              onValueChange={(v) =>
                updateField("holdReason", v === "없음" ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="보류 사유 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="없음">없음</SelectItem>
                <SelectItem value="보류-서류">보류-서류</SelectItem>
                <SelectItem value="보류-체납">보류-체납</SelectItem>
                <SelectItem value="보류-신분증">보류-신분증</SelectItem>
                <SelectItem value="보류-계좌정보">보류-계좌정보</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 서류 상태 */}
      <Card>
        <CardHeader>
          <CardTitle>서류 상태</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>가입신청서류</Label>
            <div className="border rounded-md px-2 py-1.5">
              <FileCell
                value={formData.applicationDocs}
                rowId={(initialData?.id as string) || ""}
                field="applicationDocs"
                agencyId={formData.agencyId}
                onUpdate={(_id, _field, value) =>
                  updateField("applicationDocs", value)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>서류검수 1</Label>
            <Input
              value={formData.applicationDocsReview}
              onChange={(e) =>
                updateField("applicationDocsReview", e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label>명의변경서류</Label>
            <div className="border rounded-md px-2 py-1.5">
              <FileCell
                value={formData.nameChangeDocs}
                rowId={(initialData?.id as string) || ""}
                field="nameChangeDocs"
                agencyId={formData.agencyId}
                onUpdate={(_id, _field, value) =>
                  updateField("nameChangeDocs", value)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>서류검수 2</Label>
            <Input
              value={formData.nameChangeDocsReview}
              onChange={(e) =>
                updateField("nameChangeDocsReview", e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label>외국인등록증 + 자동이체 정보</Label>
            <div className="border rounded-md px-2 py-1.5">
              <FileCell
                value={formData.arcAutopayInfo}
                rowId={(initialData?.id as string) || ""}
                field="arcAutopayInfo"
                agencyId={formData.agencyId}
                onUpdate={(_id, _field, value) =>
                  updateField("arcAutopayInfo", value)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>서류검수 3</Label>
            <Input
              value={formData.arcAutopayReview}
              onChange={(e) =>
                updateField("arcAutopayReview", e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label>외국인등록증 보완</Label>
            <div className="border rounded-md px-2 py-1.5">
              <FileCell
                value={formData.arcSupplement}
                rowId={(initialData?.id as string) || ""}
                field="arcSupplement"
                agencyId={formData.agencyId}
                onUpdate={(_id, _field, value) =>
                  updateField("arcSupplement", value)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>보완 기한</Label>
            <Input
              type="date"
              value={formData.arcSupplementDeadline}
              onChange={(e) =>
                updateField("arcSupplementDeadline", e.target.value)
              }
            />
          </div>

          <div className="flex items-center space-x-2 pt-6">
            <Checkbox
              id="autopayRegistered"
              checked={formData.autopayRegistered}
              onCheckedChange={(v) =>
                updateField("autopayRegistered", !!v)
              }
            />
            <Label htmlFor="autopayRegistered">자동이체 등록</Label>
          </div>
        </CardContent>
      </Card>

      {/* 명의변경 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>명의변경 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="combinedUnitNameChange"
                checked={formData.combinedUnitNameChange}
                onCheckedChange={(v) =>
                  updateField("combinedUnitNameChange", !!v)
                }
              />
              <Label htmlFor="combinedUnitNameChange">
                결합단위 명의변경
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="billingAccountNameChange"
                checked={formData.billingAccountNameChange}
                onCheckedChange={(v) =>
                  updateField("billingAccountNameChange", !!v)
                }
              />
              <Label htmlFor="billingAccountNameChange">
                청구계정결합단위 명의변경
              </Label>
            </div>
          </div>

          {(formData.combinedUnitNameChange ||
            formData.billingAccountNameChange) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="existingBillingAccount">
                  기존 청구계정
                </Label>
                <Input
                  id="existingBillingAccount"
                  value={formData.existingBillingAccount}
                  onChange={(e) =>
                    updateField("existingBillingAccount", e.target.value)
                  }
                  placeholder="기존 청구계정 번호"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newBillingAccount">
                  새로 생성된 청구계정
                </Label>
                <Input
                  id="newBillingAccount"
                  value={formData.newBillingAccount}
                  onChange={(e) =>
                    updateField("newBillingAccount", e.target.value)
                  }
                  placeholder="새 청구계정 번호"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 고객 특이사항 */}
      <Card>
        <CardHeader>
          <CardTitle>고객 특이사항 (추가메모)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.customerMemo}
            onChange={(e) => updateField("customerMemo", e.target.value)}
            rows={3}
            placeholder="고객 특이사항, 상세사유, 추가 메모 등..."
          />
        </CardContent>
      </Card>

      {/* 비고 */}
      <Card>
        <CardHeader>
          <CardTitle>비고</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            rows={3}
            placeholder="메모 또는 특이사항..."
          />
        </CardContent>
      </Card>

      {/* 버튼 */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          취소
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? "저장 중..."
            : mode === "create"
            ? "등록"
            : "수정"}
        </Button>
      </div>
    </form>
  );
}
