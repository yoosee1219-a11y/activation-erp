"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  User,
  Phone,
  CreditCard,
  Calendar,
  FileText,
  AlertTriangle,
  XCircle,
  MessageSquare,
  Pencil,
} from "lucide-react";
import { format } from "date-fns";

// 파트너 + 어드민 모두 지원하는 공통 타입
export interface CustomerDetailData {
  id: string;
  agencyId: string;
  agencyName?: string;
  customerName: string;
  usimNumber: string | null;
  entryDate: string | null;
  subscriptionNumber: string | null;
  newPhoneNumber: string | null;
  virtualAccount: string | null;
  subscriptionType: string | null;
  ratePlan: string | null;
  activationDate: string | null;
  activationStatus: string | null;
  personInCharge: string | null;
  workStatus: string | null;
  autopayRegistered: boolean | null;
  // 서류
  applicationDocs: string | null;
  applicationDocsReview: string | null;
  nameChangeDocs: string | null;
  nameChangeDocsReview: string | null;
  arcInfo: string | null;
  arcReview: string | null;
  autopayInfo: string | null;
  autopayReview: string | null;
  arcSupplementDeadline: string | null;
  supplementStatus: string | null;
  terminationDate: string | null;
  terminationReason: string | null;
  terminationAlertDate: string | null;
  isLocked: boolean | null;
  createdAt: string;
  // 어드민 전용
  majorCategoryName?: string;
  mediumCategoryName?: string;
  deviceChangeConfirmed?: boolean | null;
  selectedCommitment?: boolean | null;
  commitmentDate?: string | null;
  activationMethod?: string | null;
  customerMemo?: string | null;
  holdReason?: string | null;
  notes?: string | null;
  noteCount?: number;
  [key: string]: unknown;
}

interface CustomerDetailDialogProps {
  open: boolean;
  onClose: () => void;
  customer: CustomerDetailData | null;
  onUpdate?: (id: string, field: string, value: string) => void;
  staffList?: string[];
  isAdmin?: boolean;
}

const workStatusColors: Record<string, string> = {
  입력중: "bg-gray-100 text-gray-700",
  개통요청: "bg-blue-100 text-blue-700",
  진행중: "bg-yellow-100 text-yellow-700",
  개통완료: "bg-green-100 text-green-700",
  최종완료: "bg-emerald-100 text-emerald-800",
  보완요청: "bg-red-100 text-red-700",
  해지: "bg-gray-900 text-white",
};

const reviewColors: Record<string, string> = {
  "완료": "bg-green-100 text-green-700",
  "보완요청": "bg-red-100 text-red-700",
  "개통요청": "bg-blue-100 text-blue-700",
  "진행요청": "bg-orange-100 text-orange-700",
};

// ─── 인라인 편집 텍스트 ───
function EditableText({
  value,
  onSave,
  label,
  placeholder,
  icon,
  type = "text",
}: {
  value: string | null | undefined;
  onSave?: (v: string) => void;
  label: string;
  placeholder?: string;
  icon?: React.ReactNode;
  type?: "text" | "date";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");

  useEffect(() => {
    setDraft(value || "");
  }, [value]);

  const displayValue = type === "date" && value
    ? (() => { try { return format(new Date(value), "yyyy-MM-dd"); } catch { return value; } })()
    : value;

  if (!onSave) {
    return (
      <div className="flex items-start gap-2 py-1.5">
        {icon && <span className="mt-0.5 text-gray-400">{icon}</span>}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-sm font-medium text-gray-900 break-all">
            {displayValue || <span className="text-gray-300">-</span>}
          </p>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="flex items-start gap-2 py-1">
        {icon && <span className="mt-2.5 text-gray-400">{icon}</span>}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500 mb-0.5">{label}</p>
          <Input
            autoFocus
            type={type}
            value={type === "date" && draft ? new Date(draft).toISOString().slice(0, 10) : draft}
            placeholder={placeholder}
            className="h-8 text-sm"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (draft !== (value || "")) onSave(draft);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setEditing(false);
                if (draft !== (value || "")) onSave(draft);
              }
              if (e.key === "Escape") {
                setEditing(false);
                setDraft(value || "");
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-start gap-2 py-1.5 group cursor-pointer hover:bg-gray-50 rounded-md px-1 -mx-1 transition-colors"
      onClick={() => { setDraft(value || ""); setEditing(true); }}
    >
      {icon && <span className="mt-0.5 text-gray-400">{icon}</span>}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium text-gray-900 break-all">
            {displayValue || <span className="text-gray-300">-</span>}
          </p>
          <Pencil className="h-3 w-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
}

// ─── 서류 + 검수 상태 (검수 수정 가능) ───
function DocStatusRow({
  label,
  hasFile,
  fileValue,
  review,
  onReviewChange,
  isAdmin,
}: {
  label: string;
  hasFile: boolean;
  fileValue: string | null;
  review: string | null;
  onReviewChange?: (v: string) => void;
  isAdmin?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-gray-400" />
        <span className="text-sm font-medium">{label}</span>
        {hasFile && fileValue && (
          <a
            href={(() => {
              try {
                const parsed = JSON.parse(fileValue);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed[0].url;
              } catch {
                if (fileValue.startsWith("http")) return fileValue;
              }
              return undefined;
            })()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-blue-500 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            열기
          </a>
        )}
      </div>
      <div className="flex items-center gap-2">
        {hasFile ? (
          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-200">
            파일있음
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-200">
            미첨부
          </Badge>
        )}
        {onReviewChange && isAdmin ? (
          <Select value={review || ""} onValueChange={onReviewChange}>
            <SelectTrigger className={`h-7 w-[90px] text-[10px] border-dashed ${review ? reviewColors[review] || "" : ""}`}>
              <SelectValue placeholder="검수" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="완료">완료</SelectItem>
              <SelectItem value="보완요청">보완요청</SelectItem>
              <SelectItem value="진행요청">진행요청</SelectItem>
            </SelectContent>
          </Select>
        ) : review ? (
          <Badge className={`text-[10px] ${reviewColors[review] || "bg-gray-100 text-gray-600"}`}>
            {review}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

export function CustomerDetailDialog({
  open,
  onClose,
  customer,
  onUpdate,
  staffList = [],
  isAdmin = false,
}: CustomerDetailDialogProps) {
  if (!customer) return null;

  const ws = customer.workStatus || "입력중";
  const canEdit = !!onUpdate;

  const update = (field: string, value: string) => {
    if (onUpdate) onUpdate(customer.id, field, value);
  };

  const formatDate = (d: string | null | undefined) => {
    if (!d) return null;
    try { return format(new Date(d), "yyyy-MM-dd"); } catch { return d; }
  };

  // 보완기한 계산
  const getSupplementInfo = () => {
    if (ws === "해지") return { text: "해지완료", color: "bg-gray-900 text-white" };
    if (customer.terminationAlertDate && !customer.terminationDate) {
      const alertDate = new Date(customer.terminationAlertDate);
      const today = new Date();
      const graceDaysLeft = 7 - Math.floor((today.getTime() - alertDate.getTime()) / (1000 * 60 * 60 * 24));
      return { text: `해지예고 D-${Math.max(graceDaysLeft, 0)}`, color: "bg-red-500 text-white animate-pulse" };
    }
    if (
      customer.nameChangeDocsReview === "완료" &&
      customer.arcReview === "완료" &&
      customer.autopayReview === "완료"
    ) {
      return { text: "보완완료", color: "bg-green-100 text-green-700" };
    }
    const deadline = customer.arcSupplementDeadline;
    if (!deadline) return null;
    const daysLeft = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { text: "기한초과", color: "bg-red-100 text-red-700" };
    if (daysLeft <= 30) return { text: `D-${daysLeft}`, color: "bg-red-100 text-red-700" };
    if (daysLeft <= 60) return { text: `D-${daysLeft}`, color: "bg-orange-100 text-orange-700" };
    return { text: `D-${daysLeft}`, color: "bg-gray-100 text-gray-600" };
  };

  const supplementInfo = getSupplementInfo();
  const hasAdminFields = customer.activationMethod !== undefined || customer.customerMemo !== undefined;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-100 p-2">
                  <User className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <DialogTitle className="text-lg">{customer.customerName}</DialogTitle>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {customer.agencyName || customer.agencyId}
                    {customer.majorCategoryName && (
                      <span className="ml-1 text-gray-400">
                        ({customer.majorCategoryName}
                        {customer.mediumCategoryName && ` > ${customer.mediumCategoryName}`})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {/* 진행상황 */}
              {canEdit && isAdmin ? (
                <Select value={ws} onValueChange={(v) => update("workStatus", v)}>
                  <SelectTrigger className={`h-8 w-[110px] text-sm border-dashed ${workStatusColors[ws]}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="입력중">입력중</SelectItem>
                    <SelectItem value="개통요청">개통요청</SelectItem>
                    <SelectItem value="진행중">진행중</SelectItem>
                    <SelectItem value="개통완료">개통완료</SelectItem>
                    <SelectItem value="최종완료">최종완료</SelectItem>
                    <SelectItem value="보완요청">보완요청</SelectItem>
                    <SelectItem value="해지">해지</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={`${workStatusColors[ws]} text-sm px-3 py-1`}>{ws}</Badge>
              )}
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* ── 기본 정보 ── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <Phone className="h-4 w-4" />
              기본 정보
            </h3>
            <div className="grid grid-cols-2 gap-x-4">
              <EditableText
                label="USIM번호"
                value={customer.usimNumber}
                onSave={canEdit ? (v) => update("usimNumber", v) : undefined}
              />
              <EditableText
                label="입국예정일"
                value={customer.entryDate}
                type="date"
                onSave={canEdit ? (v) => update("entryDate", v) : undefined}
              />
              {canEdit && isAdmin ? (
                <div className="py-1.5">
                  <p className="text-xs text-gray-500">가입유형</p>
                  <Select
                    value={customer.subscriptionType || ""}
                    onValueChange={(v) => update("subscriptionType", v)}
                  >
                    <SelectTrigger className="h-8 w-full text-sm border-dashed mt-0.5">
                      <SelectValue placeholder="-" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="신규">신규</SelectItem>
                      <SelectItem value="번호이동">번호이동</SelectItem>
                      <SelectItem value="기기변경">기기변경</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <EditableText label="가입유형" value={customer.subscriptionType} />
              )}
              <EditableText
                label="요금제"
                value={customer.ratePlan}
                onSave={canEdit ? (v) => update("ratePlan", v) : undefined}
              />
              {canEdit && isAdmin && staffList.length > 0 ? (
                <div className="py-1.5">
                  <p className="text-xs text-gray-500">담당자</p>
                  <Select
                    value={customer.personInCharge || ""}
                    onValueChange={(v) => update("personInCharge", v)}
                  >
                    <SelectTrigger className="h-8 w-full text-sm border-dashed mt-0.5">
                      <SelectValue placeholder="배정" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <EditableText label="담당자" value={customer.personInCharge} />
              )}
              <EditableText label="등록일" value={customer.createdAt} type="date" />
            </div>
          </section>

          <Separator />

          {/* ── 개통 정보 ── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <CreditCard className="h-4 w-4" />
              개통 정보
            </h3>
            <div className="grid grid-cols-2 gap-x-4">
              <EditableText
                label="신규번호"
                value={customer.newPhoneNumber}
                onSave={canEdit && isAdmin ? (v) => update("newPhoneNumber", v) : undefined}
              />
              <EditableText
                label="가입번호"
                value={customer.subscriptionNumber}
                onSave={canEdit && isAdmin ? (v) => update("subscriptionNumber", v) : undefined}
              />
              <EditableText
                label="가상계좌"
                value={customer.virtualAccount}
                onSave={canEdit && isAdmin ? (v) => update("virtualAccount", v) : undefined}
              />
              <EditableText
                label="개통일자"
                value={customer.activationDate}
                type="date"
                onSave={canEdit && isAdmin ? (v) => update("activationDate", v) : undefined}
              />
              {hasAdminFields && (
                <>
                  {canEdit && isAdmin ? (
                    <div className="py-1.5">
                      <p className="text-xs text-gray-500">개통방법</p>
                      <Select
                        value={customer.activationMethod || ""}
                        onValueChange={(v) => update("activationMethod", v)}
                      >
                        <SelectTrigger className="h-8 w-full text-sm border-dashed mt-0.5">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="여권개통">여권개통</SelectItem>
                          <SelectItem value="ARC개통">ARC개통</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <EditableText label="개통방법" value={customer.activationMethod} />
                  )}

                  <div className="py-1.5">
                    <p className="text-xs text-gray-500">기기변경</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Checkbox
                        checked={!!customer.deviceChangeConfirmed}
                        disabled={!canEdit || !isAdmin}
                        onCheckedChange={(checked) => {
                          if (canEdit && isAdmin) update("deviceChangeConfirmed", checked ? "true" : "false");
                        }}
                      />
                      <span className="text-sm">{customer.deviceChangeConfirmed ? "확인" : "미확인"}</span>
                    </div>
                  </div>

                  <div className="py-1.5">
                    <p className="text-xs text-gray-500">약정선택</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Checkbox
                        checked={!!customer.selectedCommitment}
                        disabled={!canEdit || !isAdmin}
                        onCheckedChange={(checked) => {
                          if (canEdit && isAdmin) update("selectedCommitment", checked ? "true" : "false");
                        }}
                      />
                      <span className="text-sm">{customer.selectedCommitment ? "선택" : "미선택"}</span>
                    </div>
                  </div>

                  <EditableText
                    label="약정일"
                    value={customer.commitmentDate}
                    type="date"
                    onSave={canEdit && isAdmin ? (v) => update("commitmentDate", v) : undefined}
                  />
                </>
              )}
            </div>
          </section>

          <Separator />

          {/* ── 서류 현황 ── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              서류 현황
            </h3>
            <div className="space-y-1.5">
              <DocStatusRow
                label="가입신청서"
                hasFile={!!customer.applicationDocs}
                fileValue={customer.applicationDocs}
                review={customer.applicationDocsReview}
                onReviewChange={canEdit ? (v) => update("applicationDocsReview", v) : undefined}
                isAdmin={isAdmin}
              />
              <DocStatusRow
                label="명의변경서류"
                hasFile={!!customer.nameChangeDocs}
                fileValue={customer.nameChangeDocs}
                review={customer.nameChangeDocsReview}
                onReviewChange={canEdit ? (v) => update("nameChangeDocsReview", v) : undefined}
                isAdmin={isAdmin}
              />
              <DocStatusRow
                label="외국인등록증"
                hasFile={!!customer.arcInfo}
                fileValue={customer.arcInfo}
                review={customer.arcReview}
                onReviewChange={canEdit ? (v) => update("arcReview", v) : undefined}
                isAdmin={isAdmin}
              />
              <DocStatusRow
                label="자동이체"
                hasFile={!!customer.autopayInfo}
                fileValue={customer.autopayInfo}
                review={customer.autopayReview}
                onReviewChange={canEdit ? (v) => update("autopayReview", v) : undefined}
                isAdmin={isAdmin}
              />
            </div>
          </section>

          <Separator />

          {/* ── 보완/해지 정보 ── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              보완 / 해지 정보
            </h3>
            <div className="space-y-2">
              {supplementInfo && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">보완기한:</span>
                  <Badge className={supplementInfo.color}>{supplementInfo.text}</Badge>
                </div>
              )}
              <EditableText
                label="보완 마감일"
                value={customer.arcSupplementDeadline}
                type="date"
                icon={<Calendar className="h-3.5 w-3.5" />}
                onSave={canEdit && isAdmin ? (v) => update("arcSupplementDeadline", v) : undefined}
              />
              <EditableText
                label="해지일"
                value={customer.terminationDate}
                type="date"
                icon={<XCircle className="h-3.5 w-3.5 text-red-400" />}
                onSave={canEdit && isAdmin ? (v) => update("terminationDate", v) : undefined}
              />
              <EditableText
                label="해지사유"
                value={customer.terminationReason}
                onSave={canEdit && isAdmin ? (v) => update("terminationReason", v) : undefined}
              />
              <EditableText
                label="해지예고일"
                value={customer.terminationAlertDate}
                type="date"
                icon={<AlertTriangle className="h-3.5 w-3.5 text-orange-400" />}
                onSave={canEdit && isAdmin ? (v) => update("terminationAlertDate", v) : undefined}
              />
              {customer.holdReason !== undefined && (
                <EditableText
                  label="보류사유"
                  value={customer.holdReason}
                  onSave={canEdit && isAdmin ? (v) => update("holdReason", v) : undefined}
                />
              )}
            </div>
          </section>

          {/* ── 메모/비고 (어드민) ── */}
          {hasAdminFields && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4" />
                  메모 / 비고
                </h3>
                <div className="space-y-3">
                  <EditableMemo
                    label="고객 메모"
                    value={customer.customerMemo}
                    color="yellow"
                    onSave={canEdit && isAdmin ? (v) => update("customerMemo", v) : undefined}
                  />
                  <EditableMemo
                    label="비고"
                    value={customer.notes ?? customer.holdReason}
                    color="blue"
                    onSave={canEdit && isAdmin ? (v) => update("notes", v) : undefined}
                  />
                </div>
              </section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── 메모 편집 컴포넌트 ───
function EditableMemo({
  label,
  value,
  color,
  onSave,
}: {
  label: string;
  value: string | null | undefined;
  color: "yellow" | "blue";
  onSave?: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");

  useEffect(() => {
    setDraft(value || "");
  }, [value]);

  const bgColor = color === "yellow" ? "bg-yellow-50 border-yellow-100" : "bg-blue-50 border-blue-100";
  const textColor = color === "yellow" ? "text-yellow-700" : "text-blue-700";

  if (editing && onSave) {
    return (
      <div className={`rounded-lg border p-3 ${bgColor}`}>
        <p className={`text-xs font-medium mb-1 ${textColor}`}>{label}</p>
        <Textarea
          autoFocus
          value={draft}
          className="text-sm bg-white min-h-[60px]"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false);
            if (draft !== (value || "")) onSave(draft);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setEditing(false);
              setDraft(value || "");
            }
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border p-3 ${bgColor} ${onSave ? "cursor-pointer hover:shadow-sm transition-shadow group" : ""}`}
      onClick={() => { if (onSave) { setDraft(value || ""); setEditing(true); } }}
    >
      <div className="flex items-center justify-between">
        <p className={`text-xs font-medium mb-1 ${textColor}`}>{label}</p>
        {onSave && <Pencil className="h-3 w-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
      <p className="text-sm text-gray-800 whitespace-pre-wrap">
        {value || <span className="text-gray-400">-</span>}
      </p>
    </div>
  );
}
