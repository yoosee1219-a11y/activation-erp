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
} from "recharts";

interface AgencyChartProps {
  data: Array<{
    agencyId: string;
    agencyName: string | null;
    total: number;
  }>;
}

export function AgencyChart({ data }: AgencyChartProps) {
  const chartData = data.slice(0, 10).map((item) => ({
    name: item.agencyName || item.agencyId,
    건수: item.total,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>거래처별 개통 현황</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip />
              <Bar
                dataKey="건수"
                fill="#3b82f6"
                radius={[0, 4, 4, 0]}
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
