"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

interface MonthSummary {
  month: string;
  total: string;
  completed: string;
  pending: string;
  cancelled: string;
}

interface MonthSelectorProps {
  availableMonths: MonthSummary[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

export function MonthSelector({
  availableMonths,
  selectedMonth,
  onMonthChange,
}: MonthSelectorProps) {
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const formatLabel = (m: string) => {
    const [year, mon] = m.split("-");
    const shortYear = year.slice(2);
    return `${shortYear}.${mon}`;
  };

  const isCurrentMonth = (m: string) => m === currentYM;

  // "current"이면 실제로 현재 YYYY-MM과 비교
  const isSelected = (m: string) => {
    if (selectedMonth === "current") return m === currentYM;
    return selectedMonth === m;
  };

  const totalAll = availableMonths.reduce((s, m) => s + Number(m.total), 0);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Calendar className="h-4 w-4 text-gray-400 mr-1" />

      {/* 당월 버튼 */}
      <Button
        variant={selectedMonth === "current" || selectedMonth === currentYM ? "default" : "outline"}
        size="sm"
        onClick={() => onMonthChange("current")}
        className="h-7 text-xs"
      >
        이번달
        {availableMonths.find((m) => m.month === currentYM) && (
          <Badge variant="secondary" className="ml-1 text-[10px] px-1">
            {Number(availableMonths.find((m) => m.month === currentYM)?.total || 0)}
          </Badge>
        )}
      </Button>

      {/* 나머지 월 버튼 (당월 제외, 최근 5개) */}
      {availableMonths
        .filter((m) => !isCurrentMonth(m.month))
        .slice(0, 5)
        .map((m) => (
          <Button
            key={m.month}
            variant={isSelected(m.month) ? "default" : "outline"}
            size="sm"
            onClick={() => onMonthChange(m.month)}
            className="h-7 text-xs"
          >
            {formatLabel(m.month)}
            <Badge variant="secondary" className="ml-1 text-[10px] px-1">
              {Number(m.total)}
            </Badge>
          </Button>
        ))}

      {/* 전체 버튼 */}
      <Button
        variant={selectedMonth === "all" ? "default" : "outline"}
        size="sm"
        onClick={() => onMonthChange("all")}
        className="h-7 text-xs"
      >
        전체
        <Badge variant="secondary" className="ml-1 text-[10px] px-1">
          {totalAll}
        </Badge>
      </Button>
    </div>
  );
}
