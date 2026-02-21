"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  LabelList,
} from "recharts";

interface AgencyChartProps {
  data: Array<{
    agencyId: string;
    agencyName: string | null;
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
  }>;
}

const COLORS = [
  "#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b",
  "#ef4444", "#10b981", "#ec4899", "#6366f1",
  "#14b8a6", "#f97316",
];

export function AgencyChart({ data }: AgencyChartProps) {
  const chartData = data
    .slice(0, 10)
    .map((item) => ({
      name: item.agencyName || item.agencyId,
      개통완료: Number(item.completed),
      대기: Number(item.pending),
      취소: Number(item.cancelled),
      전체: Number(item.total),
    }))
    .sort((a, b) => b.전체 - a.전체);

  return (
    <Card>
      <CardHeader>
        <CardTitle>거래처별 개통 현황</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 50)}>
            <BarChart data={chartData} layout="vertical" margin={{ right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis
                dataKey="name"
                type="category"
                width={100}
                tick={{ fontSize: 13, fontWeight: 500 }}
              />
              <Tooltip
                formatter={(value?: number | string, name?: string) => [`${value}건`, name ?? ""]}
                contentStyle={{ borderRadius: 8, fontSize: 13 }}
              />
              <Legend />
              <Bar
                dataKey="개통완료"
                stackId="a"
                fill="#10b981"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="대기"
                stackId="a"
                fill="#f59e0b"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="취소"
                stackId="a"
                fill="#ef4444"
                radius={[0, 4, 4, 0]}
              >
                <LabelList
                  dataKey="전체"
                  position="right"
                  formatter={(v) => `${v}건`}
                  style={{ fontSize: 12, fontWeight: 600, fill: "#374151" }}
                />
              </Bar>
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
