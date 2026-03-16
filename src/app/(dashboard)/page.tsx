"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "./dashboard-context";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";

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
  supplementRequestStats: {
    total: number;
    workStatusCount: number;
    reviewCount: number;
  };
  supplementRequestDetail: Array<{
    id: string;
    agencyId: string;
    agencyName: string | null;
    customerName: string;
    newPhoneNumber: string | null;
    personInCharge: string | null;
    workStatus: string | null;
    applicationDocsReview: string | null;
    nameChangeDocsReview: string | null;
    arcAutopayReview: string | null;
  }>;
  pendingByPeriod: {
    totalPending: number;
    monthlyPending: number;
    todayPending: number;
  };
  todayPendingDetail: Array<{
    id: string;
    agencyId: string;
    agencyName: string | null;
    customerName: string;
    newPhoneNumber: string | null;
    entryDate: string | null;
    personInCharge: string | null;
  }>;
  supplementStats: Array<{
    agencyId: string;
    agencyName: string | null;
    mobileTotal: number;
    mobileOverdue: number;
    mobileWithin30: number;
    mobileWithin60: number;
    nameChangeTotal: number;
    nameChangeOverdue: number;
    nameChangeWithin30: number;
    nameChangeWithin60: number;
  }>;
  supplementList: Array<{
    id: string;
    agencyId: string;
    agencyName: string | null;
    customerName: string;
    newPhoneNumber: string | null;
    personInCharge: string | null;
    workStatus: string | null;
    nameChangeDocsReview: string | null;
    arcAutopayReview: string | null;
    arcSupplementDeadline: string | null;
    daysLeft: number | null;
    supplementType: "mobile" | "nameChange";
  }>;
  terminationStats: {
    monthlyCount: number;
    alertCount: number;
    byAgency: Array<{ agencyId: string; agencyName: string; count: number }>;
  };
  monthlyCompleted: {
    totalCount: number;
    byAgency: Array<{ agencyId: string; agencyName: string; count: number }>;
  };
  todayCompleted: Array<{
    id: string;
    agencyId: string;
    agencyName: string;
    customerName: string;
    newPhoneNumber: string | null;
    activationDate: string | null;
  }>;
  nameChangeIncomplete: Array<{
    id: string;
    agencyId: string;
    agencyName: string;
    customerName: string;
    newPhoneNumber: string | null;
    nameChangeDocsReview: string | null;
    arcReview: string | null;
    autopayReview: string | null;
  }>;
  todayTermination: { count: number };
  monthlyTerminationDetail: Array<{
    id: string;
    agencyId: string;
    agencyName: string;
    customerName: string;
    newPhoneNumber: string | null;
    terminationDate: string | null;
    terminationReason: string | null;
    workStatus: string | null;
  }>;
  todayTerminationDetail: Array<{
    id: string;
    agencyId: string;
    agencyName: string;
    customerName: string;
    newPhoneNumber: string | null;
    terminationDate: string | null;
    terminationReason: string | null;
    workStatus: string | null;
  }>;
}

export default function DashboardPage() {
  const { getFilterParams, selectedMajors, selectedMediums, categories, agencies } = useDashboard();
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
  }, [getFilterParams, selectedMajors, selectedMediums]);

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <div className="rounded-lg bg-gray-900 px-4 py-2 text-white shadow">
          <span className="text-sm font-medium">{dateStr}</span>
        </div>
      </div>

      <DashboardTabs
        stats={data.stats}
        monthlyData={monthlyMapped}
        weeklyData={data.weeklyStats || []}
        dailyData={data.dailyStats || []}
        agencyStats={data.agencyStats}
        staffStats={data.staffStats || []}
        arcStats={data.arcStats}
        arcUrgentList={data.arcUrgentList}
        kpiTotalByAgency={data.kpiTotalByAgency || []}
        kpiPendingDetail={data.kpiPendingDetail || []}
        kpiAutopayDetail={data.kpiAutopayDetail || []}
        supplementRequestStats={data.supplementRequestStats || { total: 0, workStatusCount: 0, reviewCount: 0 }}
        supplementRequestDetail={data.supplementRequestDetail || []}
        pendingByPeriod={data.pendingByPeriod || { totalPending: 0, monthlyPending: 0, todayPending: 0 }}
        todayPendingDetail={data.todayPendingDetail || []}
        supplementStats={data.supplementStats || []}
        supplementList={data.supplementList || []}
        terminationStats={data.terminationStats || { monthlyCount: 0, alertCount: 0, byAgency: [] }}
        monthlyCompleted={data.monthlyCompleted || { totalCount: 0, byAgency: [] }}
        todayCompleted={data.todayCompleted || []}
        nameChangeIncomplete={data.nameChangeIncomplete || []}
        todayTermination={data.todayTermination || { count: 0 }}
        monthlyTerminationDetail={data.monthlyTerminationDetail || []}
        todayTerminationDetail={data.todayTerminationDetail || []}
        categories={categories}
        agencies={agencies}
      />
    </div>
  );
}
