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
import { MoreHorizontal, Trash2, Lock, Unlock } from "lucide-react";
import { format } from "date-fns";
import { NoteIndicator } from "@/components/activations/note-indicator";
import { useState } from "react";

export type ActivationRow = {
  id: string;
  agencyId: string;
  agencyName?: string;
  majorCategoryName?: string;
  mediumCategoryName?: string;
  customerName: string;
  usimNumber: string | null;
  entryDate: string | null;
  subscriptionNumber: string | null;
  newPhoneNumber: string | null;
  virtualAccount: string | null;
  subscriptionType: string | null;
  ratePlan: string | null;
  deviceChangeConfirmed: boolean | null;
  selectedCommitment: boolean | null;
  commitmentDate: string | null;
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
  holdReason: string | null;
  terminationDate: string | null;
  terminationReason: string | null;
  terminationAlertDate: string | null;
  activationMethod: string | null;
  customerMemo: string | null;
  notes: string | null;
  noteCount?: number;
  createdAt: string;
};

const workStatusColors: Record<string, string> = {
  입력중: "bg-gray-100 text-gray-700",
  개통요청: "bg-blue-100 text-blue-700",
  진행중: "bg-yellow-100 text-yellow-700",
  개통완료: "bg-green-100 text-green-700",
  최종완료: "bg-emerald-100 text-emerald-800",
  보완요청: "bg-red-100 text-red-700",
  개통취소: "bg-orange-100 text-orange-700",
  보류: "bg-purple-100 text-purple-700",
  해지: "bg-gray-900 text-white",
};

const reviewColors: Record<string, string> = {
  완료: "bg-green-100 text-green-700",
  보완요청: "bg-red-100 text-red-700",
  진행요청: "bg-orange-100 text-orange-700",
};

// ─── Inline editable text cell ───
function InlineTextCell({
  value,
  onSave,
  placeholder = "-",
  width = "w-[100px]",
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  width?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <span
        className={`text-xs cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 ${!value ? "text-gray-400" : ""}`}
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
      >
        {value || placeholder}
      </span>
    );
  }

  return (
    <input
      autoFocus
      className={`h-7 ${width} rounded border border-blue-400 bg-white px-2 text-xs focus:outline-none`}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false);
        if (draft !== value) onSave(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          setEditing(false);
          if (draft !== value) onSave(draft);
        }
        if (e.key === "Escape") {
          setEditing(false);
          setDraft(value);
        }
      }}
    />
  );
}

// ─── Inline rate plan cell (Select + 기타) ───
const RATE_PLAN_OPTIONS = ["5G심플", "유스5G심플", "LTE추격데69"];

function InlineRatePlanCell({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const isStandard = RATE_PLAN_OPTIONS.includes(value);
  const [editingCustom, setEditingCustom] = useState(false);
  const [customDraft, setCustomDraft] = useState("");

  return (
    <div className="flex items-center gap-1">
      <Select
        value={editingCustom ? "기타" : isStandard ? value : value ? "기타" : ""}
        onValueChange={(v) => {
          if (v === "기타") {
            setCustomDraft(isStandard ? "" : value);
            setEditingCustom(true);
          } else {
            setEditingCustom(false);
            onSave(v);
          }
        }}
      >
        <SelectTrigger className="h-7 w-[100px] text-[10px] border-dashed">
          <SelectValue placeholder="-" />
        </SelectTrigger>
        <SelectContent>
          {RATE_PLAN_OPTIONS.map((p) => (
            <SelectItem key={p} value={p}>{p}</SelectItem>
          ))}
          <SelectItem value="기타">기타</SelectItem>
        </SelectContent>
      </Select>
      {editingCustom ? (
        <input
          autoFocus
          className="h-7 w-[80px] rounded border border-blue-400 bg-white px-2 text-xs focus:outline-none"
          value={customDraft}
          onChange={(e) => setCustomDraft(e.target.value)}
          onBlur={() => {
            setEditingCustom(false);
            if (customDraft) onSave(customDraft);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setEditingCustom(false);
              if (customDraft) onSave(customDraft);
            }
            if (e.key === "Escape") setEditingCustom(false);
          }}
        />
      ) : !isStandard && value ? (
        <span
          className="text-xs cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5"
          onClick={() => {
            setCustomDraft(value);
            setEditingCustom(true);
          }}
        >
          {value}
        </span>
      ) : null}
    </div>
  );
}

// ─── Inline checkbox cell ───
function InlineCheckboxCell({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      className="h-4 w-4 cursor-pointer accent-blue-600"
      checked={checked}
      onChange={(e) => onToggle(e.target.checked)}
    />
  );
}

// ─── Review dropdown (reusable) ───
function ReviewDropdown({
  current,
  onUpdate,
}: {
  current: string;
  onUpdate: (v: string) => void;
}) {
  return (
    <Select value={current} onValueChange={onUpdate}>
      <SelectTrigger
        className={`h-7 w-[90px] text-[10px] border-dashed ${reviewColors[current] || ""}`}
      >
        <SelectValue placeholder="검수" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="완료">완료</SelectItem>
        <SelectItem value="보완요청">보완요청</SelectItem>
        <SelectItem value="진행요청">진행요청</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function getColumns(options: {
  onDelete?: (id: string) => void;
  canDelete?: boolean;
  onInlineUpdate?: (id: string, field: string, value: string) => void;
  onToggleLock?: (id: string, lock: boolean) => void;
  canLock?: boolean;
  staffList?: string[];
}): ColumnDef<ActivationRow>[] {
  const {
    onDelete,
    canDelete,
    onInlineUpdate,
    onToggleLock,
    canLock,
    staffList = [],
  } = options;

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
      header: "메모",
      size: 50,
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
    // ─── 유심번호 (인라인 텍스트) ───
    {
      accessorKey: "usimNumber",
      header: "유심번호",
      cell: ({ row }) => {
        const val = row.original.usimNumber || "";
        if (!onInlineUpdate) return <span className="text-xs">{val || "-"}</span>;
        return (
          <InlineTextCell
            value={val}
            onSave={(v) => onInlineUpdate(row.original.id, "usimNumber", v)}
            width="w-[120px]"
          />
        );
      },
    },
    // ─── 가입번호 (인라인 텍스트) ───
    {
      accessorKey: "subscriptionNumber",
      header: "가입번호",
      cell: ({ row }) => {
        const val = row.original.subscriptionNumber || "";
        if (!onInlineUpdate) return <span className="text-xs">{val || "-"}</span>;
        return (
          <InlineTextCell
            value={val}
            onSave={(v) => onInlineUpdate(row.original.id, "subscriptionNumber", v)}
            width="w-[120px]"
          />
        );
      },
    },
    // ─── 담당자 ───
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
    // ─── 진행상황 ───
    {
      accessorKey: "workStatus",
      header: "진행상황",
      cell: ({ row }) => {
        const current = (row.getValue("workStatus") as string) || "입력중";
        if (!onInlineUpdate) {
          return (
            <Badge
              className={
                workStatusColors[current] || workStatusColors["입력중"]
              }
            >
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
            <SelectTrigger
              className={`h-7 w-[100px] text-xs border-dashed ${workStatusColors[current] || ""}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="입력중">입력중</SelectItem>
              <SelectItem value="개통요청">개통요청</SelectItem>
              <SelectItem value="진행중">진행중</SelectItem>
              <SelectItem value="개통완료">개통완료</SelectItem>
              <SelectItem value="최종완료">최종완료</SelectItem>
              <SelectItem value="보완요청">보완요청</SelectItem>
              <SelectItem value="개통취소">개통취소</SelectItem>
              <SelectItem value="보류">보류</SelectItem>
              <SelectItem value="해지">해지</SelectItem>
            </SelectContent>
          </Select>
        );
      },
    },
    // ─── 개통방법 ───
    {
      accessorKey: "activationMethod",
      header: "개통방법",
      cell: ({ row }) => {
        const current = row.original.activationMethod || "";
        if (!onInlineUpdate) {
          if (!current) return <span className="text-xs text-gray-400">-</span>;
          return (
            <Badge
              className={
                current === "외국인등록증"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-sky-100 text-sky-700"
              }
            >
              {current}
            </Badge>
          );
        }
        return (
          <Select
            value={current}
            onValueChange={(v) =>
              onInlineUpdate(row.original.id, "activationMethod", v)
            }
          >
            <SelectTrigger className="h-7 w-[100px] text-[10px] border-dashed">
              <SelectValue placeholder="-" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="여권개통">여권개통</SelectItem>
              <SelectItem value="외국인등록증">외국인등록증</SelectItem>
            </SelectContent>
          </Select>
        );
      },
    },
    {
      accessorKey: "newPhoneNumber",
      header: "신규번호",
      cell: ({ row }) => {
        const val = row.original.newPhoneNumber || "";
        if (!onInlineUpdate) return <span className="text-xs">{val || "-"}</span>;
        return (
          <InlineTextCell
            value={val}
            onSave={(v) => onInlineUpdate(row.original.id, "newPhoneNumber", v)}
            width="w-[120px]"
          />
        );
      },
    },
    // ─── 가상계좌 (인라인 텍스트) ───
    {
      accessorKey: "virtualAccount",
      header: "가상계좌",
      cell: ({ row }) => {
        const val = row.original.virtualAccount || "";
        if (!onInlineUpdate) return <span className="text-xs">{val || "-"}</span>;
        return (
          <InlineTextCell
            value={val}
            onSave={(v) => onInlineUpdate(row.original.id, "virtualAccount", v)}
            width="w-[120px]"
          />
        );
      },
    },
    {
      accessorKey: "subscriptionType",
      header: "가입유형",
    },
    {
      accessorKey: "ratePlan",
      header: "요금제",
      cell: ({ row }) => {
        const val = row.original.ratePlan || "";
        if (!onInlineUpdate) return <span className="text-xs">{val || "-"}</span>;
        return (
          <InlineRatePlanCell
            value={val}
            onSave={(v) => onInlineUpdate(row.original.id, "ratePlan", v)}
          />
        );
      },
    },
    // ─── 단말정보등록 (인라인 체크박스) ───
    {
      accessorKey: "deviceChangeConfirmed",
      header: "단말정보등록",
      size: 60,
      cell: ({ row }) => {
        const val = !!row.original.deviceChangeConfirmed;
        if (!onInlineUpdate) return val ? "✓" : "-";
        return (
          <InlineCheckboxCell
            checked={val}
            onToggle={(v) =>
              onInlineUpdate(row.original.id, "deviceChangeConfirmed", v ? "true" : "false")
            }
          />
        );
      },
    },
    // ─── 약정여부 (인라인 체크박스) ───
    {
      accessorKey: "selectedCommitment",
      header: "약정여부",
      size: 60,
      cell: ({ row }) => {
        const val = !!row.original.selectedCommitment;
        if (!onInlineUpdate) return val ? "✓" : "-";
        return (
          <InlineCheckboxCell
            checked={val}
            onToggle={(v) =>
              onInlineUpdate(row.original.id, "selectedCommitment", v ? "true" : "false")
            }
          />
        );
      },
    },
    // ─── 약정날짜 (인라인 날짜) ───
    {
      accessorKey: "commitmentDate",
      header: "약정날짜",
      cell: ({ row }) => {
        const date = row.original.commitmentDate;
        if (!onInlineUpdate) {
          return date ? format(new Date(date), "yyyy-MM-dd") : "-";
        }
        return (
          <input
            type="date"
            className="h-7 w-[130px] rounded border border-dashed border-gray-300 bg-transparent px-2 text-xs focus:border-blue-500 focus:outline-none"
            value={date ? new Date(date).toISOString().slice(0, 10) : ""}
            onChange={(e) => {
              if (e.target.value) {
                onInlineUpdate(row.original.id, "commitmentDate", e.target.value);
              }
            }}
          />
        );
      },
    },
    {
      accessorKey: "entryDate",
      header: "입국예정일",
      cell: ({ row }) => {
        const date = row.getValue("entryDate") as string;
        return date ? format(new Date(date), "yyyy-MM-dd") : "-";
      },
    },

    // ─── 서류 + 검수 ───
    {
      accessorKey: "applicationDocs",
      header: "가입신청서",
      cell: ({ row }) => {
        const v = row.original.applicationDocs;
        if (!v) return <span className="text-xs text-gray-400">-</span>;
        return (
          <a
            href={v}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            보기
          </a>
        );
      },
    },
    {
      accessorKey: "applicationDocsReview",
      header: "검수①",
      cell: ({ row }) => {
        const current = row.original.applicationDocsReview || "";
        if (!onInlineUpdate) {
          if (!current)
            return <span className="text-xs text-gray-400">-</span>;
          return (
            <Badge
              className={`text-[10px] ${reviewColors[current] || "bg-gray-100 text-gray-600"}`}
            >
              {current}
            </Badge>
          );
        }
        return (
          <ReviewDropdown
            current={current}
            onUpdate={(v) =>
              onInlineUpdate(row.original.id, "applicationDocsReview", v)
            }
          />
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
          <a
            href={v}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            보기
          </a>
        );
      },
    },
    {
      accessorKey: "nameChangeDocsReview",
      header: "검수②",
      cell: ({ row }) => {
        const current = row.original.nameChangeDocsReview || "";
        if (!onInlineUpdate) {
          if (!current)
            return <span className="text-xs text-gray-400">-</span>;
          return (
            <Badge
              className={`text-[10px] ${reviewColors[current] || "bg-gray-100 text-gray-600"}`}
            >
              {current}
            </Badge>
          );
        }
        return (
          <ReviewDropdown
            current={current}
            onUpdate={(v) =>
              onInlineUpdate(row.original.id, "nameChangeDocsReview", v)
            }
          />
        );
      },
    },
    {
      accessorKey: "arcInfo",
      header: "외국인등록증",
      cell: ({ row }) => {
        const v = row.original.arcInfo;
        if (!v) return <span className="text-xs text-gray-400">-</span>;
        return (
          <a
            href={v}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            보기
          </a>
        );
      },
    },
    {
      accessorKey: "arcReview",
      header: "검수③",
      cell: ({ row }) => {
        const current = row.original.arcReview || "";
        if (!onInlineUpdate) {
          if (!current)
            return <span className="text-xs text-gray-400">-</span>;
          return (
            <Badge
              className={`text-[10px] ${reviewColors[current] || "bg-gray-100 text-gray-600"}`}
            >
              {current}
            </Badge>
          );
        }
        return (
          <ReviewDropdown
            current={current}
            onUpdate={(v) =>
              onInlineUpdate(row.original.id, "arcReview", v)
            }
          />
        );
      },
    },
    {
      accessorKey: "autopayInfo",
      header: "자동이체",
      cell: ({ row }) => {
        const v = row.original.autopayInfo;
        if (!v) return <span className="text-xs text-gray-400">-</span>;
        return (
          <a
            href={v}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            보기
          </a>
        );
      },
    },
    {
      accessorKey: "autopayReview",
      header: "검수④",
      cell: ({ row }) => {
        const current = row.original.autopayReview || "";
        if (!onInlineUpdate) {
          if (!current)
            return <span className="text-xs text-gray-400">-</span>;
          return (
            <Badge
              className={`text-[10px] ${reviewColors[current] || "bg-gray-100 text-gray-600"}`}
            >
              {current}
            </Badge>
          );
        }
        return (
          <ReviewDropdown
            current={current}
            onUpdate={(v) =>
              onInlineUpdate(row.original.id, "autopayReview", v)
            }
          />
        );
      },
    },
    // ─── 보완기한 ───
    {
      id: "supplementDeadline",
      header: "보완기한",
      cell: ({ row }) => {
        const r = row.original;
        if (r.workStatus === "해지") {
          return (
            <Badge
              variant="destructive"
              className="bg-gray-900 text-white text-[10px]"
            >
              해지완료
            </Badge>
          );
        }
        if (r.terminationAlertDate && !r.terminationDate) {
          const alertDate = new Date(r.terminationAlertDate);
          const today = new Date();
          const graceDaysLeft =
            7 -
            Math.floor(
              (today.getTime() - alertDate.getTime()) / (1000 * 60 * 60 * 24)
            );
          return (
            <Badge variant="destructive" className="animate-pulse text-[10px]">
              해지예고 D-{Math.max(graceDaysLeft, 0)}
            </Badge>
          );
        }
        // 외국인등록증 + 최종완료: 검수 불필요
        if (r.activationMethod === "외국인등록증" && r.workStatus === "최종완료") {
          return (
            <Badge className="bg-green-100 text-green-700 text-[10px]">
              완료
            </Badge>
          );
        }
        // 여권개통: 4개 검수 모두 완료 + 최종완료
        if (
          r.applicationDocsReview === "완료" &&
          r.nameChangeDocsReview === "완료" &&
          r.arcReview === "완료" &&
          r.autopayReview === "완료" &&
          r.workStatus === "최종완료"
        ) {
          return (
            <Badge className="bg-green-100 text-green-700 text-[10px]">
              완료
            </Badge>
          );
        }
        const deadline = r.arcSupplementDeadline;
        if (!deadline)
          return <span className="text-xs text-gray-400">-</span>;
        const daysLeft = Math.ceil(
          (new Date(deadline).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (daysLeft < 0)
          return (
            <Badge className="bg-red-100 text-red-700 text-[10px]">
              기한초과
            </Badge>
          );
        if (daysLeft <= 30)
          return (
            <Badge className="bg-red-100 text-red-700 text-[10px]">
              D-{daysLeft}
            </Badge>
          );
        if (daysLeft <= 60)
          return (
            <Badge className="bg-orange-100 text-orange-700 text-[10px]">
              D-{daysLeft}
            </Badge>
          );
        return (
          <Badge className="bg-gray-100 text-gray-600 text-[10px]">
            D-{daysLeft}
          </Badge>
        );
      },
    },

    // ─── 개통일자 ───
    {
      accessorKey: "activationDate",
      header: "개통일자",
      cell: ({ row }) => {
        const date = row.getValue("activationDate") as string;
        if (!onInlineUpdate) {
          return date ? format(new Date(date), "yyyy-MM-dd") : "-";
        }
        return (
          <input
            type="date"
            className="h-7 w-[130px] rounded border border-dashed border-gray-300 bg-transparent px-2 text-xs focus:border-blue-500 focus:outline-none"
            value={date ? new Date(date).toISOString().slice(0, 10) : ""}
            onChange={(e) => {
              if (e.target.value) {
                onInlineUpdate(
                  row.original.id,
                  "activationDate",
                  e.target.value
                );
              }
            }}
          />
        );
      },
    },
    // ─── 보류사유 (인라인 드롭다운) ───
    {
      accessorKey: "holdReason",
      header: "보류사유",
      cell: ({ row }) => {
        const current = row.original.holdReason || "";
        if (!onInlineUpdate) {
          return <span className="text-xs">{current || "-"}</span>;
        }
        return (
          <Select
            value={current}
            onValueChange={(v) =>
              onInlineUpdate(row.original.id, "holdReason", v)
            }
          >
            <SelectTrigger className="h-7 w-[100px] text-[10px] border-dashed">
              <SelectValue placeholder="-" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="서류">서류</SelectItem>
              <SelectItem value="체납">체납</SelectItem>
              <SelectItem value="신분증">신분증</SelectItem>
              <SelectItem value="계좌정보">계좌정보</SelectItem>
              <SelectItem value="기타">기타</SelectItem>
            </SelectContent>
          </Select>
        );
      },
    },
    // ─── 해지일자 (인라인 날짜) ───
    {
      accessorKey: "terminationDate",
      header: "해지일자",
      cell: ({ row }) => {
        const date = row.original.terminationDate;
        if (!onInlineUpdate) {
          return date ? format(new Date(date), "yyyy-MM-dd") : "-";
        }
        return (
          <input
            type="date"
            className="h-7 w-[130px] rounded border border-dashed border-gray-300 bg-transparent px-2 text-xs focus:border-blue-500 focus:outline-none"
            value={date ? new Date(date).toISOString().slice(0, 10) : ""}
            onChange={(e) => {
              if (e.target.value) {
                onInlineUpdate(
                  row.original.id,
                  "terminationDate",
                  e.target.value
                );
              }
            }}
          />
        );
      },
    },
    // ─── 해지사유 (인라인 드롭다운) ───
    {
      accessorKey: "terminationReason",
      header: "해지사유",
      cell: ({ row }) => {
        const current = row.original.terminationReason || "";
        if (!onInlineUpdate) {
          return <span className="text-xs">{current || "-"}</span>;
        }
        return (
          <Select
            value={current}
            onValueChange={(v) =>
              onInlineUpdate(row.original.id, "terminationReason", v)
            }
          >
            <SelectTrigger className="h-7 w-[110px] text-[10px] border-dashed">
              <SelectValue placeholder="-" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="보완기한초과">보완기한초과</SelectItem>
              <SelectItem value="6개월해지">6개월해지</SelectItem>
              <SelectItem value="수동해지">수동해지</SelectItem>
            </SelectContent>
          </Select>
        );
      },
    },
    // ─── 관리 (삭제만) ───
    {
      id: "actions",
      header: "관리",
      size: 60,
      cell: ({ row }) => {
        const id = row.original.id;
        if (!canDelete || !onDelete) return null;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onDelete(id)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
