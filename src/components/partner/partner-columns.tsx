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

const statusColors: Record<string, string> = {
  대기: "bg-yellow-100 text-yellow-800",
  개통완료: "bg-green-100 text-green-800",
  개통취소: "bg-red-100 text-red-800",
};

const workStatusColors: Record<string, string> = {
  개통요청: "bg-blue-100 text-blue-700",
  작업중: "bg-yellow-100 text-yellow-700",
  완료: "bg-green-100 text-green-700",
  보완요청: "bg-red-100 text-red-700",
};

const reviewColors: Record<string, string> = {
  "완료": "bg-green-100 text-green-700",
  "보완요청": "bg-red-100 text-red-700",
  "개통요청": "bg-blue-100 text-blue-700",
};

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
        const ws = row.original.workStatus || "개통요청";
        if (ws === "보완요청") {
          return (
            <Select
              value={ws}
              onValueChange={(v) => onUpdate(row.original.id, "workStatus", v)}
            >
              <SelectTrigger className={`h-7 w-[100px] text-xs border-dashed ${workStatusColors[ws]}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="보완요청">보완요청</SelectItem>
                <SelectItem value="개통요청">개통요청</SelectItem>
              </SelectContent>
            </Select>
          );
        }
        return (
          <Badge className={workStatusColors[ws] || workStatusColors["개통요청"]}>
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
        return (
          <EditableCell
            value={row.original.customerName}
            rowId={row.original.id}
            field="customerName"
            isLocked={true}
            onUpdate={onUpdate}
            placeholder="고객명"
          />
        );
      },
    },
    {
      accessorKey: "activationStatus",
      header: "개통상태",
      cell: ({ row }) => {
        const status = row.original.activationStatus || "대기";
        return (
          <Badge className={statusColors[status] || "bg-gray-100 text-gray-800"}>
            {status}
          </Badge>
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
        return (
          <EditableCell
            value={row.original.usimNumber}
            rowId={row.original.id}
            field="usimNumber"
            isLocked={true}
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
        return (
          <EditableCell
            value={row.original.entryDate}
            rowId={row.original.id}
            field="entryDate"
            type="date"
            isLocked={true}
            onUpdate={onUpdate}
          />
        );
      },
    },
    {
      accessorKey: "subscriptionType",
      header: "가입유형",
      cell: ({ row }) => {
        return (
          <EditableCell
            value={row.original.subscriptionType}
            rowId={row.original.id}
            field="subscriptionType"
            type="select"
            options={["신규", "번호이동", "기기변경"]}
            isLocked={true}
            onUpdate={onUpdate}
          />
        );
      },
    },
    {
      accessorKey: "ratePlan",
      header: "요금제",
      cell: ({ row }) => {
        return (
          <EditableCell
            value={row.original.ratePlan}
            rowId={row.original.id}
            field="ratePlan"
            isLocked={true}
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
        const ws = row.original.workStatus || "개통요청";
        return (
          <FileCell
            value={row.original.applicationDocs}
            rowId={row.original.id}
            field="applicationDocs"
            isLocked={ws !== "보완요청"}
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
        const ws = row.original.workStatus || "개통요청";
        return (
          <FileCell
            value={row.original.nameChangeDocs}
            rowId={row.original.id}
            field="nameChangeDocs"
            isLocked={ws !== "보완요청"}
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
        const ws = row.original.workStatus || "개통요청";
        return (
          <FileCell
            value={row.original.arcAutopayInfo}
            rowId={row.original.id}
            field="arcAutopayInfo"
            isLocked={ws !== "보완요청"}
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
        const ws = row.original.workStatus || "개통요청";
        return (
          <FileCell
            value={row.original.arcSupplement}
            rowId={row.original.id}
            field="arcSupplement"
            isLocked={ws !== "보완요청"}
            onUpdate={onUpdate}
          />
        );
      },
    },
  ];
}
