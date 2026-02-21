"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type ViewMode = "daily" | "weekly" | "monthly";

interface TimeSeriesItem {
  label: string;
  total: number;
  completed: number;
  pending: number;
}

interface ActivationChartProps {
  monthlyData: TimeSeriesItem[];
  weeklyData: TimeSeriesItem[];
  dailyData: TimeSeriesItem[];
}

const viewLabels: Record<ViewMode, string> = {
  daily: "일자별",
  weekly: "주차별",
  monthly: "월별",
};

export function ActivationChart({
  monthlyData,
  weeklyData,
  dailyData,
}: ActivationChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");

  const dataMap: Record<ViewMode, TimeSeriesItem[]> = {
    monthly: [...monthlyData].reverse(),
    weekly: [...weeklyData].reverse(),
    daily: [...dailyData].reverse(),
  };

  const chartData = dataMap[viewMode];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{viewLabels[viewMode]} 개통 현황</CardTitle>
        <div className="flex gap-1">
          {(["daily", "weekly", "monthly"] as ViewMode[]).map((mode) => (
            <Button
              key={mode}
              variant={viewMode === mode ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setViewMode(mode)}
            >
              {viewLabels[mode]}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                interval={viewMode === "daily" ? 2 : 0}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="completed"
                name="개통완료"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="pending"
                name="대기"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-gray-400">
            데이터가 없습니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 기존 MonthlyChart 호환용 - 이전 코드에서 import하는 경우 대비
export function MonthlyChart({ data }: { data: Array<{ month: string; total: number; completed: number; pending: number }> }) {
  const mapped = data.map((d) => ({ label: d.month, total: d.total, completed: d.completed, pending: d.pending }));
  return <ActivationChart monthlyData={mapped} weeklyData={[]} dailyData={[]} />;
}
