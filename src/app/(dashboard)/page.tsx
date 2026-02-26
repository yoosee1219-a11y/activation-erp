"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "./layout";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { ActivationChart } from "@/components/dashboard/monthly-chart";

import { AgencyStatusTable } from "@/components/dashboard/agency-status-table";
import { StaffStatsTable } from "@/components/dashboard/staff-stats-table";
import { ArcUrgentPanel } from "@/components/dashboard/arc-urgent-panel";

interface TimeSeriesItem {
  label: string;
  total: number;
  completed: number;
  pending: number;
}

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
  weeklyStats: TimeSeriesItem[];
  dailyStats: TimeSeriesItem[];
  agencyStats: Array<{
    agencyId: string;
    agencyName: string | null;
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
    working: number;
    autopayPending: number;
  }>;
  staffStats: Array<{
    staff: string;
    total: number;
    completed: number;
    pending: number;
    working: number;
    done: number;
    arcUnresolved: number;
    arcOverdue: number;
  }>;
  arcStats: Array<{
    agencyId: string;
    agencyName: string | null;
    unresolved: number;
    urgentCount: number;
    overdueCount: number;
  }>;
  arcUrgentList: Array<{
    id: string;
    agencyId: string;
    agencyName: string | null;
    customerName: string;
    newPhoneNumber: string | null;
    personInCharge: string | null;
    arcSupplementDeadline: string;
    daysLeft: number;
  }>;
  kpiTotalByAgency: Array<{
    agencyId: string;
    agencyName: string;
    count: number;
  }>;
  kpiPendingDetail: Array<{
    id: string;
    agencyId: string;
    agencyName: string;
    customerName: string;
    entryDate: string | null;
    newPhoneNumber: string | null;
  }>;
  kpiAutopayDetail: Array<{
    id: string;
    agencyId: string;
    agencyName: string;
    customerName: string;
    newPhoneNumber: string | null;
    activationDate: string | null;
    daysLeft: number | null;
  }>;
}

export default function DashboardPage() {
  const { getFilterParams, selectedMajors, selectedMediums, selectedAgencies } = useDashboard();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const filterParams = getFilterParams();
    const params = new URLSearchParams();
    Object.entries(filterParams).forEach(([k, v]) => params.set(k, v));

    fetch(`/api/dashboard?${params}`)
      .then((res) => res.json())
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [getFilterParams, selectedMajors, selectedMediums, selectedAgencies]);

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

  // 월별 데이터를 ActivationChart 형식에 맞게 변환
  const monthlyMapped: TimeSeriesItem[] = (data.monthlyStats || []).map((d) => ({
    label: d.month,
    total: d.total,
    completed: d.completed,
    pending: d.pending,
  }));

  const today = new Date();
  const dateStr = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <div className="rounded-lg bg-gray-900 px-4 py-2 text-white shadow">
          <span className="text-sm font-medium">{dateStr}</span>
        </div>
      </div>

      <KpiCards
        stats={data.stats}
        kpiTotalByAgency={data.kpiTotalByAgency || []}
        kpiPendingDetail={data.kpiPendingDetail || []}
        kpiAutopayDetail={data.kpiAutopayDetail || []}
      />

      <ActivationChart
        monthlyData={monthlyMapped}
        weeklyData={data.weeklyStats || []}
        dailyData={data.dailyStats || []}
      />

      {/* 거래처별 개통현황 테이블 */}
      <AgencyStatusTable data={data.agencyStats} />

      {/* 담당자별 현황 */}
      <StaffStatsTable data={data.staffStats || []} />

      {/* 외국인등록증 보완 - 기한 임박 경고 */}
      <ArcUrgentPanel
        arcStats={data.arcStats}
        urgentList={data.arcUrgentList}
      />
    </div>
  );
}
