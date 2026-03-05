"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreHorizontal, Eye, Pencil, Trash2, Lock, Unlock } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { NoteIndicator } from "@/components/activations/note-indicator";

export type ActivationRow = {
  id: string;
  agencyId: string;
  agencyName?: string;
  majorCategoryName?: string;
  mediumCategoryName?: string;
  customerName: string;
  usimNumber: string | null;
  entryDate: string | null;
  newPhoneNumber: string | null;
  subscriptionType: string | null;
  ratePlan: string | null;
  activationDate: string | null;
  activationStatus: string | null;
  personInCharge: string | null;
  workStatus: string | null;
  autopayRegistered: boolean | null;
  isLocked: boolean | null;
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
  noteCount?: number;
  createdAt: string;
};

const statusColors: Record<string, string> = {
  대기: "bg-yellow-100 text-yellow-800",
  개통완료: "bg-green-100 text-green-800",
  개통취소: "bg-red-100 text-red-800",
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
  "진행요청": "bg-orange-100 text-orange-700",
};

export function getColumns(options: {
  onDelete?: (id: string) => void;
  canDelete?: boolean;
  onInlineUpdate?: (id: string, field: string, value: string) => void;
  onToggleLock?: (id: string, lock: boolean) => void;
  canLock?: boolean;
  staffList?: string[];
}): ColumnDef<ActivationRow>[] {
  const { onDelete, canDelete, onInlineUpdate, onToggleLock, canLock, staffList = [] } = options;

  return [
    // ─── 기본 ───
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
      cell: ({ row }: { row: { original: ActivationRow } }) => (
        <NoteIndicator
          activationId={row.original.id}
          customerName={row.original.customerName}
          noteCount={row.original.noteCount || 0}
        />
      ),
    },
    ...(canLock && onToggleLock
      ? [
          {
            id: "lockToggle",
            header: "잠금",
            size: 50,
            cell: ({ row }: { row: { original: ActivationRow } }) => {
              const isLocked = !!row.original.isLocked;
              return (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => onToggleLock(row.original.id, !isLocked)}
                  title={isLocked ? "잠금 해제" : "잠금"}
                >
                  {isLocked ? (
                    <Lock className="h-3.5 w-3.5 text-red-500" />
                  ) : (
                    <Unlock className="h-3.5 w-3.5 text-gray-400" />
                  )}
                </Button>
              );
            },
          } as ColumnDef<ActivationRow>,
        ]
      : []),
    {
      id: "majorCategory",
      header: "거래처",
      cell: ({ row }) => (
        <span className="font-medium text-sm">
          {row.original.majorCategoryName || "-"}
        </span>
      ),
    },
    {
      id: "mediumCategory",
      header: "상세",
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">
          {row.original.mediumCategoryName || "-"}
        </span>
      ),
    },
    {
      accessorKey: "customerName",
      header: "고객명",
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("customerName")}</span>
      ),
    },
    {
      accessorKey: "newPhoneNumber",
      header: "신규번호",
    },
    {
      accessorKey: "subscriptionType",
      header: "가입유형",
    },
    {
      accessorKey: "ratePlan",
      header: "요금제",
    },
    {
      accessorKey: "entryDate",
      header: "입국예정일",
      cell: ({ row }) => {
        const date = row.getValue("entryDate") as string;
        return date ? format(new Date(date), "yyyy-MM-dd") : "-";
      },
    },

    // ─── 서류 + 검수 (나란히 배치) ───
    {
      accessorKey: "applicationDocs",
      header: "가입신청서",
      cell: ({ row }) => {
        const v = row.original.applicationDocs;
        if (!v) return <span className="text-xs text-gray-400">-</span>;
        return (
          <a href={v} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
            보기
          </a>
        );
      },
    },
    {
      accessorKey: "applicationDocsReview",
      header: "검수",
      cell: ({ row }) => {
        const current = row.original.applicationDocsReview || "";
        if (!onInlineUpdate) {
          if (!current) return <span className="text-xs text-gray-400">-</span>;
          return (
            <Badge className={`text-[10px] ${reviewColors[current] || "bg-gray-100 text-gray-600"}`}>
              {current}
            </Badge>
          );
        }
        return (
          <Select
            value={current}
            onValueChange={(v) => onInlineUpdate(row.original.id, "applicationDocsReview", v)}
          >
            <SelectTrigger className={`h-7 w-[90px] text-[10px] border-dashed ${reviewColors[current] || ""}`}>
              <SelectValue placeholder="검수" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="완료">완료</SelectItem>
              <SelectItem value="보완요청">보완요청</SelectItem>
              <SelectItem value="개통요청">개통요청</SelectItem>
              <SelectItem value="진행요청">진행요청</SelectItem>
            </SelectContent>
          </Select>
        );
      },
    },
    {
      accessorKey: "nameChangeDocs",
      header: "명의변경서류",
      cell: ({ row }) => {
        const v = row.original.nameChangeDocs;
        if (!v) return <span className="text-xs text-gray-400">-</span>;
        return (
          <a href={v} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
            보기
          </a>
        );
      },
    },
    {
      accessorKey: "nameChangeDocsReview",
      header: "검수",
      cell: ({ row }) => {
        const current = row.original.nameChangeDocsReview || "";
        if (!onInlineUpdate) {
          if (!current) return <span className="text-xs text-gray-400">-</span>;
          return (
            <Badge className={`text-[10px] ${reviewColors[current] || "bg-gray-100 text-gray-600"}`}>
              {current}
            </Badge>
          );
        }
        return (
          <Select
            value={current}
            onValueChange={(v) => onInlineUpdate(row.original.id, "nameChangeDocsReview", v)}
          >
            <SelectTrigger className={`h-7 w-[90px] text-[10px] border-dashed ${reviewColors[current] || ""}`}>
              <SelectValue placeholder="검수" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="완료">완료</SelectItem>
              <SelectItem value="보완요청">보완요청</SelectItem>
              <SelectItem value="개통요청">개통요청</SelectItem>
              <SelectItem value="진행요청">진행요청</SelectItem>
            </SelectContent>
          </Select>
        );
      },
    },
    // 외국인등록증
    {
      accessorKey: "arcInfo",
      header: "외국인등록증",
      cell: ({ row }) => {
        const v = row.original.arcInfo;
        if (!v) return <span className="text-xs text-gray-400">-</span>;
        return (
          <a href={v} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
            보기
          </a>
        );
      },
    },
    // 검수 (외국인등록증)
    {
      accessorKey: "arcReview",
      header: "검수",
      cell: ({ row }) => {
        const current = row.original.arcReview || "";
        if (!onInlineUpdate) {
          if (!current) return <span className="text-xs text-gray-400">-</span>;
          return (
            <Badge className={`text-[10px] ${reviewColors[current] || "bg-gray-100 text-gray-600"}`}>
              {current}
            </Badge>
          );
        }
        return (
          <Select
            value={current}
            onValueChange={(v) => onInlineUpdate(row.original.id, "arcReview", v)}
          >
            <SelectTrigger className={`h-7 w-[90px] text-[10px] border-dashed ${reviewColors[current] || ""}`}>
              <SelectValue placeholder="검수" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="완료">완료</SelectItem>
              <SelectItem value="보완요청">보완요청</SelectItem>
              <SelectItem value="개통요청">개통요청</SelectItem>
              <SelectItem value="진행요청">진행요청</SelectItem>
            </SelectContent>
          </Select>
        );
      },
    },
    // 자동이체 서류
    {
      accessorKey: "autopayInfo",
      header: "자동이체",
      cell: ({ row }) => {
        const v = row.original.autopayInfo;
        if (!v) return <span className="text-xs text-gray-400">-</span>;
        return (
          <a href={v} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
            보기
          </a>
        );
      },
    },
    // 검수 (자동이체)
    {
      accessorKey: "autopayReview",
      header: "검수",
      cell: ({ row }) => {
        const current = row.original.autopayReview || "";
        if (!onInlineUpdate) {
          if (!current) return <span className="text-xs text-gray-400">-</span>;
          return (
            <Badge className={`text-[10px] ${reviewColors[current] || "bg-gray-100 text-gray-600"}`}>
              {current}
            </Badge>
          );
        }
        return (
          <Select
            value={current}
            onValueChange={(v) => onInlineUpdate(row.original.id, "autopayReview", v)}
          >
            <SelectTrigger className={`h-7 w-[90px] text-[10px] border-dashed ${reviewColors[current] || ""}`}>
              <SelectValue placeholder="검수" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="완료">완료</SelectItem>
              <SelectItem value="보완요청">보완요청</SelectItem>
              <SelectItem value="개통요청">개통요청</SelectItem>
              <SelectItem value="진행요청">진행요청</SelectItem>
            </SelectContent>
          </Select>
        );
      },
    },
    // 보완기한
    {
      id: "supplementDeadline",
      header: "보완기한",
      cell: ({ row }) => {
        const r = row.original;
        // 3가지 검수 모두 완료면 "완료"
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

    // ─── 상태/관리 ───
    {
      accessorKey: "activationDate",
      header: "개통일자",
      cell: ({ row }) => {
        const date = row.getValue("activationDate") as string;
        return date ? format(new Date(date), "yyyy-MM-dd") : "-";
      },
    },
    {
      accessorKey: "personInCharge",
      header: "담당자",
      cell: ({ row }) => {
        const current = row.getValue("personInCharge") as string;
        if (!onInlineUpdate || staffList.length === 0) {
          return current || "-";
        }
        return (
          <Select
            value={current || ""}
            onValueChange={(v) =>
              onInlineUpdate(row.original.id, "personInCharge", v)
            }
          >
            <SelectTrigger className="h-7 w-[100px] text-xs border-dashed">
              <SelectValue placeholder="배정" />
            </SelectTrigger>
            <SelectContent>
              {staffList.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
    },
    {
      accessorKey: "workStatus",
      header: "진행상황",
      cell: ({ row }) => {
        const current = (row.getValue("workStatus") as string) || "입력중";
        if (!onInlineUpdate) {
          return (
            <Badge className={workStatusColors[current] || workStatusColors["입력중"]}>
              {current}
            </Badge>
          );
        }
        return (
          <Select
            value={current}
            onValueChange={(v) =>
              onInlineUpdate(row.original.id, "workStatus", v)
            }
          >
            <SelectTrigger className={`h-7 w-[100px] text-xs border-dashed ${workStatusColors[current] || ""}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="입력중">입력중</SelectItem>
              <SelectItem value="개통요청">개통요청</SelectItem>
              <SelectItem value="진행중">진행중</SelectItem>
              <SelectItem value="개통완료">개통완료</SelectItem>
              <SelectItem value="보완요청">보완요청</SelectItem>
            </SelectContent>
          </Select>
        );
      },
    },
    {
      accessorKey: "autopayRegistered",
      header: "자동이체등록",
      cell: ({ row }) => {
        const registered = row.getValue("autopayRegistered") as boolean;
        return (
          <Badge
            variant={registered ? "default" : "outline"}
            className={registered ? "bg-green-100 text-green-800" : ""}
          >
            {registered ? "등록" : "미등록"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "관리",
      cell: ({ row }) => {
        const id = row.original.id;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/activations/${id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  상세보기
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/activations/${id}?edit=true`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  수정
                </Link>
              </DropdownMenuItem>
              {canDelete && onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(id)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
