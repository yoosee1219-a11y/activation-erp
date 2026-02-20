"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "./layout";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { MonthlyChart } from "@/components/dashboard/monthly-chart";
import { AgencyChart } from "@/components/dashboard/agency-chart";

interface DashboardData {
  stats: {
    total: number;
    pending: number;
    completed: number;
    autopayPending: number;
  };
  monthlyStats: Array<{
    month: string;
    total: number;
    completed: number;
    pending: number;
  }>;
  agencyStats: Array<{
    agencyId: string;
    agencyName: string | null;
    total: number;
  }>;
}

export default function DashboardPage() {
  const { agencyParam } = useDashboard();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (agencyParam) params.set("agencyId", agencyParam);

    fetch(`/api/dashboard?${params}`)
      .then((res) => res.json())
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [agencyParam]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        로딩 중...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        데이터를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">대시보드</h1>

      <KpiCards stats={data.stats} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MonthlyChart data={data.monthlyStats} />
        <AgencyChart data={data.agencyStats} />
      </div>
    </div>
  );
}
