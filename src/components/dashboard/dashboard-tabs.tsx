"use client";

import dynamic from "next/dynamic";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart3, Building2, Users, FileWarning } from "lucide-react";

import { KpiCards } from "@/components/dashboard/kpi-cards";
// 차트 컴포넌트는 무거우므로(recharts ~80KB) lazy load
const ActivationChart = dynamic(
  () => import("@/components/dashboard/monthly-chart").then((m) => m.ActivationChart),
  { ssr: false, loading: () => <div className="h-[300px] animate-pulse rounded-lg bg-gray-100" /> }
);
const AgencyChart = dynamic(
  () => import("@/components/dashboard/agency-chart").then((m) => m.AgencyChart),
  { ssr: false, loading: () => <div className="h-[300px] animate-pulse rounded-lg bg-gray-100" /> }
);
import { AgencyStatusTable } from "@/components/dashboard/agency-status-table";
import { StaffStatsTable } from "@/components/dashboard/staff-stats-table";
import { ArcUrgentPanel } from "@/components/dashboard/arc-urgent-panel";
import { SupplementPanel } from "@/components/dashboard/supplement-panel";
import type { SupplementStat, SupplementItem } from "@/components/dashboard/supplement-panel";
import type { CategoryNode, Agency } from "@/hooks/use-agency-filter";

interface TimeSeriesItem {
  label: string;
  total: number;
  completed: number;
  pending: number;
}

interface DashboardTabsProps {
  stats: {
    total: number;
    pending: number;
    completed: number;
    autopayPending: number;
  };
  monthlyData: TimeSeriesItem[];
  weeklyData: TimeSeriesItem[];
  dailyData: TimeSeriesItem[];
  agencyStats: Array<{
    agencyId: string;
    agencyName: string | null;
    total: number;
    completed: number;
    today: number;
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
  supplementStats: SupplementStat[];
  supplementList: SupplementItem[];
  terminationStats: {
    monthlyCount: number;
    alertCount: number;
    byAgency: Array<{ agencyId: string; agencyName: string; count: number }>;
  };
  monthlyCompleted: {
    totalCount: number;
    commitmentCount: number;
    noCommitmentCount: number;
    byAgency: Array<{ agencyId: string; agencyName: string; count: number; commitmentCount: number; noCommitmentCount: number }>;
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
  monthlyCompletedDetail: Array<{
    id: string;
    agencyId: string;
    agencyName: string;
    customerName: string;
    newPhoneNumber: string | null;
    activationDate: string | null;
    selectedCommitment: boolean;
  }>;
  noCommitmentStats?: {
    totalCount: number;
    byAgency: Array<{ agencyId: string; agencyName: string; count: number }>;
  };
  categories: CategoryNode[];
  agencies: Agency[];
}

export function DashboardTabs(props: DashboardTabsProps) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList variant="line" className="w-full justify-start overflow-x-auto border-b pb-0">
        <TabsTrigger value="overview" className="gap-1.5">
          <BarChart3 className="size-4" />
          <span>종합 현황</span>
        </TabsTrigger>
        <TabsTrigger value="agencies" className="gap-1.5">
          <Building2 className="size-4" />
          <span>거래처 분석</span>
        </TabsTrigger>
        <TabsTrigger value="staff" className="gap-1.5">
          <Users className="size-4" />
          <span>업무 관리</span>
        </TabsTrigger>
        <TabsTrigger value="arc" className="gap-1.5">
          <FileWarning className="size-4" />
          <span>서류 보완</span>
        </TabsTrigger>
      </TabsList>

      {/* 종합 현황 */}
      <TabsContent value="overview" className="mt-4 space-y-6">
        <KpiCards
          stats={props.stats}
          kpiTotalByAgency={props.kpiTotalByAgency}
          kpiPendingDetail={props.kpiPendingDetail}
          kpiAutopayDetail={props.kpiAutopayDetail}
          supplementRequestStats={props.supplementRequestStats}
          supplementRequestDetail={props.supplementRequestDetail}
          pendingByPeriod={props.pendingByPeriod}
          todayPendingDetail={props.todayPendingDetail}
          terminationStats={props.terminationStats}
          monthlyCompleted={props.monthlyCompleted}
          todayCompleted={props.todayCompleted}
          nameChangeIncomplete={props.nameChangeIncomplete}
          todayTermination={props.todayTermination}
          monthlyTerminationDetail={props.monthlyTerminationDetail}
          todayTerminationDetail={props.todayTerminationDetail}
          monthlyCompletedDetail={props.monthlyCompletedDetail}
          noCommitmentStats={props.noCommitmentStats}
          categories={props.categories}
          agencies={props.agencies}
          agencyStats={props.agencyStats}
        />
        <ActivationChart
          monthlyData={props.monthlyData}
          weeklyData={props.weeklyData}
          dailyData={props.dailyData}
        />
      </TabsContent>

      {/* 거래처 분석 */}
      <TabsContent value="agencies" className="mt-4 space-y-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <AgencyStatusTable data={props.agencyStats} categories={props.categories} agencies={props.agencies} />
          <AgencyChart data={props.agencyStats} />
        </div>
      </TabsContent>

      {/* 업무 관리 */}
      <TabsContent value="staff" className="mt-4">
        <StaffStatsTable data={props.staffStats} />
      </TabsContent>

      {/* 서류 보완 */}
      <TabsContent value="arc" className="mt-4">
        <SupplementPanel
          supplementStats={props.supplementStats}
          supplementList={props.supplementList}
        />
      </TabsContent>
    </Tabs>
  );
}
