"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useDashboard } from "../../layout";
import { ActivationForm } from "@/components/activations/activation-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function ActivationDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { agencies } = useDashboard();
  const [activation, setActivation] = useState<Record<string, unknown> | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const isEditMode = searchParams.get("edit") === "true";

  useEffect(() => {
    fetch(`/api/activations/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setActivation(data.activation);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        로딩 중...
      </div>
    );
  }

  if (!activation) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        데이터를 찾을 수 없습니다.
      </div>
    );
  }

  if (isEditMode) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-2xl font-bold">개통 정보 수정</h1>
        <ActivationForm
          agencies={agencies}
          initialData={activation}
          mode="edit"
        />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    대기: "bg-yellow-100 text-yellow-800",
    개통완료: "bg-green-100 text-green-800",
    개통취소: "bg-red-100 text-red-800",
  };

  const formatDate = (d: unknown) =>
    d && typeof d === "string" ? format(new Date(d), "yyyy-MM-dd") : "-";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">
            {activation.customerName as string}
          </h1>
          <Badge
            className={
              statusColors[(activation.activationStatus as string) || "대기"] ||
              ""
            }
          >
            {(activation.activationStatus as string) || "대기"}
          </Badge>
        </div>
        <Button asChild>
          <Link href={`/activations/${params.id}?edit=true`}>
            <Pencil className="mr-2 h-4 w-4" />
            수정
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="거래처" value={activation.agencyId as string} />
            <DetailRow label="고객명" value={activation.customerName as string} />
            <DetailRow label="USIM 번호" value={activation.usimNumber as string} />
            <DetailRow
              label="입국예정일"
              value={formatDate(activation.entryDate)}
            />
            <DetailRow label="담당자" value={activation.personInCharge as string} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>가입 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow
              label="가입번호"
              value={activation.subscriptionNumber as string}
            />
            <DetailRow
              label="신규개통번호"
              value={activation.newPhoneNumber as string}
            />
            <DetailRow
              label="가상계좌"
              value={activation.virtualAccount as string}
            />
            <DetailRow
              label="가입유형"
              value={activation.subscriptionType as string}
            />
            <DetailRow label="요금제" value={activation.ratePlan as string} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>개통 상태</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow
              label="개통일자"
              value={formatDate(activation.activationDate)}
            />
            <DetailRow
              label="확정기변"
              value={activation.deviceChangeConfirmed ? "예" : "아니오"}
            />
            <DetailRow
              label="선택약정"
              value={activation.selectedCommitment ? "예" : "아니오"}
            />
            <DetailRow
              label="약정일자"
              value={formatDate(activation.commitmentDate)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>서류 상태</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow
              label="가입신청서류"
              value={activation.applicationDocs as string}
            />
            <DetailRow
              label="서류검수 1"
              value={activation.applicationDocsReview as string}
            />
            <DetailRow
              label="명의변경서류"
              value={activation.nameChangeDocs as string}
            />
            <DetailRow
              label="서류검수 2"
              value={activation.nameChangeDocsReview as string}
            />
            <DetailRow
              label="외국인등록증+자동이체"
              value={activation.arcAutopayInfo as string}
            />
            <DetailRow
              label="서류검수 3"
              value={activation.arcAutopayReview as string}
            />
            <DetailRow
              label="자동이체 등록"
              value={activation.autopayRegistered ? "등록" : "미등록"}
            />
          </CardContent>
        </Card>
      </div>

      {typeof activation.notes === "string" && activation.notes && (
        <Card>
          <CardHeader>
            <CardTitle>비고</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-gray-700">
              {activation.notes as string}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium">{value || "-"}</span>
    </div>
  );
}
