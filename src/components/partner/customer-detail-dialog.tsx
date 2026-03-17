"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Phone,
  CreditCard,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Shield,
  Building2,
} from "lucide-react";
import { format } from "date-fns";
import type { PartnerActivationRow } from "./partner-columns";

interface CustomerDetailDialogProps {
  open: boolean;
  onClose: () => void;
  customer: PartnerActivationRow | null;
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

function InfoRow({ label, value, icon }: { label: string; value: string | null | undefined; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      {icon && <span className="mt-0.5 text-gray-400">{icon}</span>}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900 break-all">
          {value || <span className="text-gray-300">-</span>}
        </p>
      </div>
    </div>
  );
}

function DocStatus({ label, hasFile, review }: { label: string; hasFile: boolean; review: string | null }) {
  const getFileLinks = (value: string | null): { name: string; url: string }[] => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch {
      // URL 문자열
      if (value.startsWith("http")) return [{ name: "파일", url: value }];
      return [];
    }
  };

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-gray-400" />
        <span className="text-sm font-medium">{label}</span>
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
        {review && (
          <Badge className={`text-[10px] ${reviewColors[review] || "bg-gray-100 text-gray-600"}`}>
            {review}
          </Badge>
        )}
      </div>
    </div>
  );
}

export function CustomerDetailDialog({ open, onClose, customer }: CustomerDetailDialogProps) {
  if (!customer) return null;

  const ws = customer.workStatus || "입력중";
  const formatDate = (d: string | null) => {
    if (!d) return null;
    try {
      return format(new Date(d), "yyyy-MM-dd");
    } catch {
      return d;
    }
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
                  </p>
                </div>
              </div>
              <Badge className={`${workStatusColors[ws]} text-sm px-3 py-1`}>{ws}</Badge>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* 기본 정보 */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <Phone className="h-4 w-4" />
              기본 정보
            </h3>
            <div className="grid grid-cols-2 gap-x-4">
              <InfoRow label="USIM번호" value={customer.usimNumber} />
              <InfoRow label="입국예정일" value={formatDate(customer.entryDate)} />
              <InfoRow label="가입유형" value={customer.subscriptionType} />
              <InfoRow label="요금제" value={customer.ratePlan} />
              <InfoRow label="담당자" value={customer.personInCharge} />
              <InfoRow label="등록일" value={formatDate(customer.createdAt)} />
            </div>
          </section>

          <Separator />

          {/* 개통 정보 */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <CreditCard className="h-4 w-4" />
              개통 정보
            </h3>
            <div className="grid grid-cols-2 gap-x-4">
              <InfoRow label="신규번호" value={customer.newPhoneNumber} />
              <InfoRow label="가입번호" value={customer.subscriptionNumber} />
              <InfoRow label="가상계좌" value={customer.virtualAccount} />
              <InfoRow label="개통일자" value={formatDate(customer.activationDate)} />
            </div>
          </section>

          <Separator />

          {/* 서류 현황 */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              서류 현황
            </h3>
            <div className="space-y-1.5">
              <DocStatus
                label="가입신청서"
                hasFile={!!customer.applicationDocs}
                review={customer.applicationDocsReview}
              />
              <DocStatus
                label="명의변경서류"
                hasFile={!!customer.nameChangeDocs}
                review={customer.nameChangeDocsReview}
              />
              <DocStatus
                label="외국인등록증"
                hasFile={!!customer.arcInfo}
                review={customer.arcReview}
              />
              <DocStatus
                label="자동이체"
                hasFile={!!customer.autopayInfo}
                review={customer.autopayReview}
              />
            </div>
          </section>

          <Separator />

          {/* 보완/해지 정보 */}
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
              {customer.arcSupplementDeadline && (
                <InfoRow
                  label="보완 마감일"
                  value={formatDate(customer.arcSupplementDeadline)}
                  icon={<Calendar className="h-3.5 w-3.5" />}
                />
              )}
              {customer.terminationDate && (
                <InfoRow
                  label="해지일"
                  value={formatDate(customer.terminationDate)}
                  icon={<XCircle className="h-3.5 w-3.5 text-red-400" />}
                />
              )}
              {customer.terminationReason && (
                <InfoRow
                  label="해지사유"
                  value={customer.terminationReason}
                />
              )}
              {customer.terminationAlertDate && (
                <InfoRow
                  label="해지예고일"
                  value={formatDate(customer.terminationAlertDate)}
                  icon={<AlertTriangle className="h-3.5 w-3.5 text-orange-400" />}
                />
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
