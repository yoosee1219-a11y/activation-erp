"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditableCell } from "./editable-cell";
import { FileCell } from "./file-cell";
import { NoteIndicator } from "@/components/activations/note-indicator";
import { format } from "date-fns";

export type PartnerActivationRow = {
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
  arcAutopayInfo: string | null;
  arcAutopayReview: string | null;
  arcSupplement: string | null;
  arcInfo: string | null;
  arcReview: string | null;
  autopayInfo: string | null;
  autopayReview: string | null;
  arcSupplementDeadline: string | null;
  supplementStatus: string | null;
  terminationDate: string | null;
  terminationReason: string | null;
  terminationAlertDate: string | null;
  noteCount?: number;
  // 잠금
  isLocked: boolean | null;
  createdAt: string;
};

const workStatusColors: Record<string, string> = {
  입력중: "bg-gray-100 text-gray-700",
  개통요청: "bg-blue-100 text-blue-700",
  진행중: "bg-yellow-100 text-yellow-700",
  개통완료: "bg-green-100 text-green-700",
  보완요청: "bg-red-100 text-red-700",
  해지: "bg-gray-900 text-white",
};

const reviewColors: Record<string, string> = {
  "완료": "bg-green-100 text-green-700",
  "보완요청": "bg-red-100 text-red-700",
  "개통요청": "bg-blue-100 text-blue-700",
  "진행요청": "bg-orange-100 text-orange-700",
};

// 파트너가 편집 가능한 상태
function isEditableStatus(ws: string): boolean {
  return ws === "입력중" || ws === "보완요청";
}

// 서류별 잠금: 해당 검수가 "진행요청" 또는 "완료"이면 서류 수정 불가
function isDocLocked(review: string | null): boolean {
  return review === "진행요청" || review === "완료";
}

export function getPartnerColumns(options: {
  onUpdate: (id: string, field: string, value: string) => void;
}): ColumnDef<PartnerActivationRow>[] {
  const { onUpdate } = options;

  return [
    // ─── 핵심 상태 (스크롤 없이 바로 보이는 영역) ───
    {
      id: "rowNumber",
      header: "No.",
      size: 50,
      cell: ({ row }) => (
        <span className="text-sm text-gray-500 font-medium">
          {row.index + 1}
        </span>
      ),
    },
    {
      id: "noteIndicator",
      header: "특이사항",
      size: 60,
      cell: ({ row }: { row: { original: PartnerActivationRow } }) => (
        <NoteIndicator
          activationId={row.original.id}
          customerName={row.original.customerName}
          noteCount={row.original.noteCount || 0}
        />
      ),
    },
    {
      accessorKey: "workStatus",
      header: "진행상황",
      cell: ({ row }) => {
        const ws = row.original.workStatus || "입력중";
        // 입력중 or 보완요청: Select 표시 (개통요청으로 변경 가능)
        if (isEditableStatus(ws)) {
          return (
            <Select
              value={ws}
              onValueChange={(v) => onUpdate(row.original.id, "workStatus", v)}
            >
              <SelectTrigger className={`h-7 w-[100px] text-xs border-dashed ${workStatusColors[ws]}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="입력중">입력중</SelectItem>
                <SelectItem value="개통요청">개통요청</SelectItem>
              </SelectContent>
            </Select>
          );
        }
        return (
          <Badge className={workStatusColors[ws] || workStatusColors["입력중"]}>
            {ws}
          </Badge>
        );
      },
    },
    {
      accessorKey: "agencyName",
      header: "거래처",
      cell: ({ row }) => (
        <span className="text-sm font-medium text-gray-700">
          {row.original.agencyName || row.original.agencyId}
        </span>
      ),
    },
    {
      accessorKey: "customerName",
      header: "고객명",
      cell: ({ row }) => {
        const ws = row.original.workStatus || "입력중";
        return (
          <EditableCell
            value={row.original.customerName}
            rowId={row.original.id}
            field="customerName"
            isLocked={!isEditableStatus(ws)}
            onUpdate={onUpdate}
            placeholder="고객명"
          />
        );
      },
    },
    {
      accessorKey: "personInCharge",
      header: "담당자",
      cell: ({ row }) => (
        <span className="text-sm text-gray-700">
          {row.original.personInCharge || "-"}
        </span>
      ),
    },

    // ─── 기본 정보 ───
    {
      accessorKey: "usimNumber",
      header: "USIM번호",
      cell: ({ row }) => {
        const ws = row.original.workStatus || "입력중";
        return (
          <EditableCell
            value={row.original.usimNumber}
            rowId={row.original.id}
            field="usimNumber"
            isLocked={!isEditableStatus(ws)}
            onUpdate={onUpdate}
            placeholder="USIM번호"
          />
        );
      },
    },
    {
      accessorKey: "entryDate",
      header: "입국예정일",
      cell: ({ row }) => {
        const ws = row.original.workStatus || "입력중";
        return (
          <EditableCell
            value={row.original.entryDate}
            rowId={row.original.id}
            field="entryDate"
            type="date"
            isLocked={!isEditableStatus(ws)}
            onUpdate={onUpdate}
          />
        );
      },
    },
    {
      accessorKey: "subscriptionType",
      header: "가입유형",
      cell: ({ row }) => {
        const ws = row.original.workStatus || "입력중";
        return (
          <EditableCell
            value={row.original.subscriptionType}
            rowId={row.original.id}
            field="subscriptionType"
            type="select"
            options={["신규", "번호이동", "기기변경"]}
            isLocked={!isEditableStatus(ws)}
            onUpdate={onUpdate}
          />
        );
      },
    },
    {
      accessorKey: "ratePlan",
      header: "요금제",
      cell: ({ row }) => {
        const ws = row.original.workStatus || "입력중";
        return (
          <EditableCell
            value={row.original.ratePlan}
            rowId={row.original.id}
            field="ratePlan"
            isLocked={!isEditableStatus(ws)}
            onUpdate={onUpdate}
            placeholder="요금제"
          />
        );
      },
    },

    // ─── 관리자 기입 (거래처 읽기만) ───
    {
      accessorKey: "newPhoneNumber",
      header: "신규번호",
      cell: ({ row }) => (
        <span className="text-sm text-gray-700">
          {row.original.newPhoneNumber || "-"}
        </span>
      ),
    },
    {
      accessorKey: "subscriptionNumber",
      header: "가입번호",
      cell: ({ row }) => (
        <span className="text-sm text-gray-700">
          {row.original.subscriptionNumber || "-"}
        </span>
      ),
    },
    {
      accessorKey: "virtualAccount",
      header: "가상계좌",
      cell: ({ row }) => (
        <span className="text-sm text-gray-700">
          {row.original.virtualAccount || "-"}
        </span>
      ),
    },
    {
      accessorKey: "activationDate",
      header: "개통일자",
      cell: ({ row }) => {
        const date = row.original.activationDate;
        return (
          <span className="text-sm text-gray-700">
            {date ? format(new Date(date), "yyyy-MM-dd") : "-"}
          </span>
        );
      },
    },

    // ─── 서류 + 검수 (뒤쪽 배치) ───
    {
      accessorKey: "applicationDocs",
      header: "가입신청서",
      cell: ({ row }) => {
        const ws = row.original.workStatus || "입력중";
        const review = row.original.applicationDocsReview;
        const locked = ws === "개통완료" || ws === "진행중" || ws === "개통요청"
          ? isDocLocked(review)
          : !isEditableStatus(ws);
        return (
          <FileCell
            value={row.original.applicationDocs}
            rowId={row.original.id}
            field="applicationDocs"
            isLocked={locked}
            onUpdate={onUpdate}
          />
        );
      },
    },
    {
      accessorKey: "applicationDocsReview",
      header: "검수",
      cell: ({ row }) => {
        const v = row.original.applicationDocsReview;
        const hasDoc = !!row.original.applicationDocs;
        // 파트너는 서류가 있고 검수가 비어있거나 보완요청일 때만 "진행요청" 설정 가능
        if (hasDoc && (!v || v === "보완요청")) {
          return (
            <Select
              value={v || ""}
              onValueChange={(val) => onUpdate(row.original.id, "applicationDocsReview", val)}
            >
              <SelectTrigger className={`h-7 w-[90px] text-[10px] border-dashed ${v ? reviewColors[v] || "" : ""}`}>
                <SelectValue placeholder="검수" />
              </SelectTrigger>
              <SelectContent>
                {v === "보완요청" && <SelectItem value="보완요청">보완요청</SelectItem>}
                <SelectItem value="진행요청">진행요청</SelectItem>
              </SelectContent>
            </Select>
          );
        }
        if (!v) return <span className="text-xs text-gray-400">-</span>;
        return (
          <Badge className={`text-[10px] ${reviewColors[v] || "bg-gray-100 text-gray-600"}`}>
            {v}
          </Badge>
        );
      },
    },
    {
      accessorKey: "nameChangeDocs",
      header: "명의변경서류",
      cell: ({ row }) => {
        const ws = row.original.workStatus || "입력중";
        const review = row.original.nameChangeDocsReview;
        const locked = ws === "개통완료" || ws === "진행중" || ws === "개통요청"
          ? isDocLocked(review)
          : !isEditableStatus(ws);
        return (
          <FileCell
            value={row.original.nameChangeDocs}
            rowId={row.original.id}
            field="nameChangeDocs"
            isLocked={locked}
            onUpdate={onUpdate}
          />
        );
      },
    },
    {
      accessorKey: "nameChangeDocsReview",
      header: "검수",
      cell: ({ row }) => {
        const v = row.original.nameChangeDocsReview;
        const hasDoc = !!row.original.nameChangeDocs;
        // 파트너는 서류가 있고 검수가 비어있거나 보완요청일 때만 "진행요청" 설정 가능
        if (hasDoc && (!v || v === "보완요청")) {
          return (
            <Select
              value={v || ""}
              onValueChange={(val) => onUpdate(row.original.id, "nameChangeDocsReview", val)}
            >
              <SelectTrigger className={`h-7 w-[90px] text-[10px] border-dashed ${v ? reviewColors[v] || "" : ""}`}>
                <SelectValue placeholder="검수" />
              </SelectTrigger>
              <SelectContent>
                {v === "보완요청" && <SelectItem value="보완요청">보완요청</SelectItem>}
                <SelectItem value="진행요청">진행요청</SelectItem>
              </SelectContent>
            </Select>
          );
        }
        if (!v) return <span className="text-xs text-gray-400">-</span>;
        return (
          <Badge className={`text-[10px] ${reviewColors[v] || "bg-gray-100 text-gray-600"}`}>
            {v}
          </Badge>
        );
      },
    },
    {
      accessorKey: "arcInfo",
      header: "외국인등록증",
      cell: ({ row }) => {
        const ws = row.original.workStatus || "입력중";
        const review = row.original.arcReview;
        // 보완 서류: 개통완료 후에도 검수 완료 전까지 편집 가능
        const locked = ws === "개통완료" || ws === "진행중" || ws === "개통요청"
          ? isDocLocked(review)
          : !isEditableStatus(ws);
        return (
          <FileCell
            value={row.original.arcInfo}
            rowId={row.original.id}
            field="arcInfo"
            isLocked={locked}
            onUpdate={onUpdate}
          />
        );
      },
    },
    {
      accessorKey: "arcReview",
      header: "검수",
      cell: ({ row }) => {
        const v = row.original.arcReview;
        const hasDoc = !!row.original.arcInfo;
        // 파트너는 서류가 있고 검수가 비어있거나 보완요청일 때만 "진행요청" 설정 가능
        if (hasDoc && (!v || v === "보완요청")) {
          return (
            <Select
              value={v || ""}
              onValueChange={(val) => onUpdate(row.original.id, "arcReview", val)}
            >
              <SelectTrigger className={`h-7 w-[90px] text-[10px] border-dashed ${v ? reviewColors[v] || "" : ""}`}>
                <SelectValue placeholder="검수" />
              </SelectTrigger>
              <SelectContent>
                {v === "보완요청" && <SelectItem value="보완요청">보완요청</SelectItem>}
                <SelectItem value="진행요청">진행요청</SelectItem>
              </SelectContent>
            </Select>
          );
        }
        if (!v) return <span className="text-xs text-gray-400">-</span>;
        return (
          <Badge className={`text-[10px] ${reviewColors[v] || "bg-gray-100 text-gray-600"}`}>
            {v}
          </Badge>
        );
      },
    },
    {
      accessorKey: "autopayInfo",
      header: "자동이체",
      cell: ({ row }) => {
        const ws = row.original.workStatus || "입력중";
        const review = row.original.autopayReview;
        const locked = ws === "개통완료" || ws === "진행중" || ws === "개통요청"
          ? isDocLocked(review)
          : !isEditableStatus(ws);
        return (
          <FileCell
            value={row.original.autopayInfo}
            rowId={row.original.id}
            field="autopayInfo"
            isLocked={locked}
            onUpdate={onUpdate}
          />
        );
      },
    },
    {
      accessorKey: "autopayReview",
      header: "검수",
      cell: ({ row }) => {
        const v = row.original.autopayReview;
        const hasDoc = !!row.original.autopayInfo;
        // 파트너는 서류가 있고 검수가 비어있거나 보완요청일 때만 "진행요청" 설정 가능
        if (hasDoc && (!v || v === "보완요청")) {
          return (
            <Select
              value={v || ""}
              onValueChange={(val) => onUpdate(row.original.id, "autopayReview", val)}
            >
              <SelectTrigger className={`h-7 w-[90px] text-[10px] border-dashed ${v ? reviewColors[v] || "" : ""}`}>
                <SelectValue placeholder="검수" />
              </SelectTrigger>
              <SelectContent>
                {v === "보완요청" && <SelectItem value="보완요청">보완요청</SelectItem>}
                <SelectItem value="진행요청">진행요청</SelectItem>
              </SelectContent>
            </Select>
          );
        }
        if (!v) return <span className="text-xs text-gray-400">-</span>;
        return (
          <Badge className={`text-[10px] ${reviewColors[v] || "bg-gray-100 text-gray-600"}`}>
            {v}
          </Badge>
        );
      },
    },
    {
      id: "supplementDeadline",
      header: "보완기한",
      cell: ({ row }) => {
        const r = row.original;
        // 해지 완료
        if (r.workStatus === "해지") {
          return <Badge variant="destructive" className="bg-gray-900 text-white text-[10px]">해지완료</Badge>;
        }
        // 해지예고
        if (r.terminationAlertDate && !r.terminationDate) {
          const alertDate = new Date(r.terminationAlertDate);
          const today = new Date();
          const graceDaysLeft = 7 - Math.floor((today.getTime() - alertDate.getTime()) / (1000 * 60 * 60 * 24));
          return (
            <Badge variant="destructive" className="animate-pulse text-[10px]">
              해지예고 D-{Math.max(graceDaysLeft, 0)}
            </Badge>
          );
        }
        if (r.nameChangeDocsReview === "완료" && r.arcReview === "완료" && r.autopayReview === "완료") {
          return <Badge className="bg-green-100 text-green-700 text-[10px]">완료</Badge>;
        }
        const deadline = r.arcSupplementDeadline;
        if (!deadline) return <span className="text-xs text-gray-400">-</span>;
        const daysLeft = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft < 0) return <Badge className="bg-red-100 text-red-700 text-[10px]">기한초과</Badge>;
        if (daysLeft <= 30) return <Badge className="bg-red-100 text-red-700 text-[10px]">D-{daysLeft}</Badge>;
        if (daysLeft <= 60) return <Badge className="bg-orange-100 text-orange-700 text-[10px]">D-{daysLeft}</Badge>;
        return <Badge className="bg-gray-100 text-gray-600 text-[10px]">D-{daysLeft}</Badge>;
      },
    },
  ];
}
