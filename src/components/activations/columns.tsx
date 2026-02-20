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
import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export type ActivationRow = {
  id: string;
  agencyId: string;
  customerName: string;
  usimNumber: string | null;
  entryDate: string | null;
  newPhoneNumber: string | null;
  subscriptionType: string | null;
  ratePlan: string | null;
  activationDate: string | null;
  activationStatus: string | null;
  personInCharge: string | null;
  autopayRegistered: boolean | null;
  createdAt: string;
};

const statusColors: Record<string, string> = {
  대기: "bg-yellow-100 text-yellow-800",
  개통완료: "bg-green-100 text-green-800",
  개통취소: "bg-red-100 text-red-800",
};

export function getColumns(
  onDelete?: (id: string) => void,
  canDelete?: boolean
): ColumnDef<ActivationRow>[] {
  return [
    {
      accessorKey: "agencyId",
      header: "거래처",
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("agencyId")}</span>
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
    {
      accessorKey: "activationDate",
      header: "개통일자",
      cell: ({ row }) => {
        const date = row.getValue("activationDate") as string;
        return date ? format(new Date(date), "yyyy-MM-dd") : "-";
      },
    },
    {
      accessorKey: "activationStatus",
      header: "상태",
      cell: ({ row }) => {
        const status = row.getValue("activationStatus") as string;
        return (
          <Badge className={statusColors[status] || "bg-gray-100 text-gray-800"}>
            {status || "대기"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "personInCharge",
      header: "담당자",
    },
    {
      accessorKey: "autopayRegistered",
      header: "자동이체",
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
      header: "",
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
