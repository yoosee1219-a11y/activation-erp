"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart3, Building2, Users, FileWarning } from "lucide-react";

import { KpiCards } from "@/components/dashboard/kpi-cards";
import { ActivationChart } from "@/components/dashboard/monthly-chart";
import { AgencyStatusTable } from "@/components/dashboard/agency-status-table";
import { AgencyChart } from "@/components/dashboard/agency-chart";
import { StaffStatsTable } from "@/components/dashboard/staff-stats-table";
import { ArcUrgentPanel } from "@/components/dashboard/arc-urgent-panel";
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
        <ArcUrgentPanel
          arcStats={props.arcStats}
          urgentList={props.arcUrgentList}
        />
      </TabsContent>
    </Tabs>
  );
}
