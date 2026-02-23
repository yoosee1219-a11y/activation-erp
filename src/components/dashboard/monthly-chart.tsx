"use client";

import { useState, useMemo } from "react";
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
  LabelList,
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

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
  return (
    <div className="rounded-lg border bg-white px-4 py-3 shadow-lg">
      <p className="mb-2 text-sm font-semibold text-gray-700">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-sm">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: p.fill }}
          />
          <span className="text-gray-600">{p.name}</span>
          <span className="ml-auto font-medium">{p.value}건</span>
        </div>
      ))}
      <div className="mt-1.5 border-t pt-1.5 text-sm font-semibold text-gray-800">
        합계 {total}건
      </div>
    </div>
  );
}

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

  const summary = useMemo(() => {
    const totalAll = chartData.reduce((s, d) => s + Number(d.total), 0);
    const completedAll = chartData.reduce((s, d) => s + Number(d.completed), 0);
    const pendingAll = chartData.reduce((s, d) => s + Number(d.pending), 0);
    const rate = totalAll > 0 ? Math.round((completedAll / totalAll) * 100) : 0;
    return { totalAll, completedAll, pendingAll, rate };
  }, [chartData]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg">{viewLabels[viewMode]} 개통 현황</CardTitle>
          <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
            <span>전체 <strong className="text-gray-900">{summary.totalAll}</strong>건</span>
            <span>완료 <strong className="text-emerald-600">{summary.completedAll}</strong>건</span>
            <span>대기 <strong className="text-amber-600">{summary.pendingAll}</strong>건</span>
            <span>완료율 <strong className="text-blue-600">{summary.rate}%</strong></span>
          </div>
        </div>
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
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={chartData} barGap={2} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                interval={viewMode === "daily" ? 2 : 0}
                axisLine={false}
                tickLine={false}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ paddingTop: 12 }}
              />
              <Bar
                dataKey="completed"
                name="개통완료"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              >
                <LabelList
                  dataKey="completed"
                  position="top"
                  style={{ fontSize: 11, fill: "#6b7280" }}
                  formatter={(v) => (Number(v) > 0 ? v : "")}
                />
              </Bar>
              <Bar
                dataKey="pending"
                name="대기"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
              >
                <LabelList
                  dataKey="pending"
                  position="top"
                  style={{ fontSize: 11, fill: "#6b7280" }}
                  formatter={(v) => (Number(v) > 0 ? v : "")}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[360px] items-center justify-center text-gray-400">
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
