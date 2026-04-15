"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface MonthSummary {
  month: string;
  total: number;
  completed: number;
  pending: number;
  cancelled: number;
}

interface FiltersProps {
  status: string;
  onStatusChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  onClear: () => void;
  month?: string;
  onMonthChange?: (value: string) => void;
  availableMonths?: MonthSummary[];
  children?: React.ReactNode;
}

export function Filters({
  status,
  onStatusChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onClear,
  month,
  onMonthChange,
  availableMonths,
  children,
}: FiltersProps) {
  const hasFilters = status !== "all" || dateFrom || dateTo || (month && month !== "all");

  const formatMonthLabel = (m: string) => {
    const [year, mon] = m.split("-");
    return `${year}년 ${parseInt(mon)}월`;
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* 월 선택 */}
      {availableMonths && availableMonths.length > 0 && onMonthChange && (
        <Select value={month || "all"} onValueChange={onMonthChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="월 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              전체 ({availableMonths.reduce((s, m) => s + Number(m.total), 0)})
            </SelectItem>
            {availableMonths.map((m) => (
              <SelectItem key={m.month} value={m.month}>
                {formatMonthLabel(m.month)} ({Number(m.total)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* 상태 */}
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="상태" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 상태</SelectItem>
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

      {/* 날짜 범위 */}
      <Input
        type="date"
        value={dateFrom}
        onChange={(e) => onDateFromChange(e.target.value)}
        className="w-[150px]"
      />
      <span className="text-gray-400">~</span>
      <Input
        type="date"
        value={dateTo}
        onChange={(e) => onDateToChange(e.target.value)}
        className="w-[150px]"
      />

      {/* 슬롯: CascadingFilter 등 외부 필터 */}
      {children}

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="mr-1 h-4 w-4" />
          초기화
        </Button>
      )}
    </div>
  );
}
