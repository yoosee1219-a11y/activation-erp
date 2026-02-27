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
};

const reviewColors: Record<string, string> = {
  "완료": "bg-green-100 text-green-700",
  "보완요청": "bg-red-100 text-red-700",
  "개통요청": "bg-blue-100 text-blue-700",
};

// 파트너가 편집 가능한 상태
function isEditableStatus(ws: string): boolean {
  return ws === "입력중" || ws === "보완요청";
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
        return (
          <FileCell
            value={row.original.applicationDocs}
            rowId={row.original.id}
            field="applicationDocs"
            isLocked={!isEditableStatus(ws)}
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
        return (
          <FileCell
            value={row.original.nameChangeDocs}
            rowId={row.original.id}
            field="nameChangeDocs"
            isLocked={!isEditableStatus(ws)}
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
        if (!v) return <span className="text-xs text-gray-400">-</span>;
        return (
          <Badge className={`text-[10px] ${reviewColors[v] || "bg-gray-100 text-gray-600"}`}>
            {v}
          </Badge>
        );
      },
    },
    {
      accessorKey: "arcAutopayInfo",
      header: "외국인등록증/자동이체",
      cell: ({ row }) => {
        const ws = row.original.workStatus || "입력중";
        return (
          <FileCell
            value={row.original.arcAutopayInfo}
            rowId={row.original.id}
            field="arcAutopayInfo"
            isLocked={!isEditableStatus(ws)}
            onUpdate={onUpdate}
          />
        );
      },
    },
    {
      accessorKey: "arcAutopayReview",
      header: "검수",
      cell: ({ row }) => {
        const v = row.original.arcAutopayReview;
        if (!v) return <span className="text-xs text-gray-400">-</span>;
        return (
          <Badge className={`text-[10px] ${reviewColors[v] || "bg-gray-100 text-gray-600"}`}>
            {v}
          </Badge>
        );
      },
    },
    {
      accessorKey: "arcSupplement",
      header: "외국인등록증보완",
      cell: ({ row }) => {
        const ws = row.original.workStatus || "입력중";
        return (
          <FileCell
            value={row.original.arcSupplement}
            rowId={row.original.id}
            field="arcSupplement"
            isLocked={!isEditableStatus(ws)}
            onUpdate={onUpdate}
          />
        );
      },
    },
  ];
}
