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
import { Badge } from "@/components/ui/badge";
import { X, Calendar } from "lucide-react";

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
}: FiltersProps) {
  const hasFilters = status !== "all" || dateFrom || dateTo || (month && month !== "all");

  const formatMonthLabel = (m: string) => {
    const [year, mon] = m.split("-");
    return `${year}년 ${parseInt(mon)}월`;
  };

  return (
    <div className="space-y-3">
      {/* 월 퀵 선택 버튼 */}
      {availableMonths && availableMonths.length > 0 && onMonthChange && (
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <Button
            variant={!month || month === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => onMonthChange("all")}
            className="h-7 text-xs"
          >
            전체
            <Badge variant="secondary" className="ml-1 text-[10px]">
              {availableMonths.reduce((s, m) => s + Number(m.total), 0)}
            </Badge>
          </Button>
          {availableMonths.map((m) => (
            <Button
              key={m.month}
              variant={month === m.month ? "default" : "outline"}
              size="sm"
              onClick={() => onMonthChange(m.month)}
              className="h-7 text-xs"
            >
              {formatMonthLabel(m.month)}
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {Number(m.total)}
              </Badge>
            </Button>
          ))}
        </div>
      )}

      {/* 기존 필터 */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="입력중">입력중</SelectItem>
            <SelectItem value="개통요청">개통요청</SelectItem>
            <SelectItem value="진행중">진행중</SelectItem>
            <SelectItem value="개통완료">개통완료</SelectItem>
            <SelectItem value="보완요청">보완요청</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="w-[160px]"
          placeholder="시작일"
        />
        <span className="text-gray-400">~</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="w-[160px]"
          placeholder="종료일"
        />

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="mr-1 h-4 w-4" />
            초기화
          </Button>
        )}
      </div>
    </div>
  );
}
