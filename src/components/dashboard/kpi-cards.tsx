"use client";

import { useState, useMemo, useEffect, Fragment, type ReactNode } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CustomerDetailDialog,
  type CustomerDetailData,
} from "@/components/partner/customer-detail-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import type { CategoryNode, Agency } from "@/hooks/use-agency-filter";

/* ─── types ─── */

interface KpiCardsProps {
  stats: {
    total: number;
    pending: number;
    completed: number;
    autopayPending: number;
  };
  kpiTotalByAgency?: Array<{
    agencyId: string;
    agencyName: string;
    count: number;
  }>;
  kpiPendingDetail?: Array<{
    id: string;
    agencyId: string;
    agencyName: string;
    customerName: string;
    entryDate: string | null;
    newPhoneNumber: string | null;
  }>;
  kpiAutopayDetail?: Array<{
    id: string;
    agencyId: string;
    agencyName: string;
    customerName: string;
    newPhoneNumber: string | null;
    activationDate: string | null;
    daysLeft: number | null;
  }>;
  supplementRequestStats?: {
    total: number;
    workStatusCount: number;
    reviewCount: number;
  };
  supplementRequestDetail?: Array<{
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
  pendingByPeriod?: {
    totalPending: number;
    monthlyPending: number;
    todayPending: number;
  };
  todayPendingDetail?: Array<{
    id: string;
    agencyId: string;
    agencyName: string | null;
    customerName: string;
    newPhoneNumber: string | null;
    entryDate: string | null;
    personInCharge: string | null;
  }>;
  terminationStats?: {
    monthlyCount: number;
    alertCount: number;
    byAgency: Array<{ agencyId: string; agencyName: string; count: number }>;
  };
  monthlyCompleted?: {
    totalCount: number;
    commitmentCount: number;
    noCommitmentCount: number;
    byAgency: Array<{ agencyId: string; agencyName: string; count: number; commitmentCount: number; noCommitmentCount: number }>;
  };
  todayCompleted?: Array<{
    id: string;
    agencyId: string;
    agencyName: string;
    customerName: string;
    newPhoneNumber: string | null;
    activationDate: string | null;
  }>;
  nameChangeIncomplete?: Array<{
    id: string;
    agencyId: string;
    agencyName: string;
    customerName: string;
    newPhoneNumber: string | null;
    nameChangeDocsReview: string | null;
    arcReview: string | null;
    autopayReview: string | null;
  }>;
  todayTermination?: { count: number };
  monthlyTerminationDetail?: Array<{
    id: string;
    agencyId: string;
    agencyName: string;
    customerName: string;
    newPhoneNumber: string | null;
    terminationDate: string | null;
    terminationReason: string | null;
    workStatus: string | null;
  }>;
  todayTerminationDetail?: Array<{
    id: string;
    agencyId: string;
    agencyName: string;
    customerName: string;
    newPhoneNumber: string | null;
    terminationDate: string | null;
    terminationReason: string | null;
    workStatus: string | null;
  }>;
  monthlyCompletedDetail?: Array<{
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
  categories?: CategoryNode[];
  agencies?: Agency[];
  agencyStats?: Array<{
    agencyId: string;
    agencyName: string | null;
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
    working: number;
    autopayPending: number;
  }>;
}

type KpiKey = "monthlyCompleted" | "monthlyPending" | "nameChangeIncomplete" | "monthlyTermination" | "todayCompleted" | "todayPending" | "supplement";

/* ─── Count hierarchy types ─── */

interface CountItem {
  agencyId: string;
  agencyName: string;
  count: number;
}

interface CountMedium {
  mediumId: string;
  mediumName: string;
  totalCount: number;
  agencies: CountItem[];
}

interface CountMajor {
  majorId: string;
  majorName: string;
  totalCount: number;
  mediums: CountMedium[];
}

/* ─── Detail hierarchy types ─── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AgencyEntry = [string, { name: string; items: any[] }];

interface DetailMedium {
  mediumId: string;
  mediumName: string;
  totalItems: number;
  agencies: AgencyEntry[];
}

interface DetailMajor {
  majorId: string;
  majorName: string;
  totalItems: number;
  mediums: DetailMedium[];
}

/* ─── Hierarchy builders ─── */

function buildCountHierarchy(
  items: CountItem[],
  categories: CategoryNode[],
  agencyList: Agency[]
): { majorGroups: CountMajor[]; uncategorized: CountItem[] } {
  const itemMap = new Map<string, CountItem>();
  items.forEach((item) => itemMap.set(item.agencyId, item));

  const categorizedIds = new Set<string>();

  const majorGroups: CountMajor[] = categories
    .map((major) => {
      const mediums: CountMedium[] = (major.children || [])
        .map((medium) => {
          const medAgencies = agencyList
            .filter((a) => a.mediumCategory === medium.id)
            .map((a) => itemMap.get(a.id))
            .filter(Boolean) as CountItem[];
          medAgencies.forEach((a) => categorizedIds.add(a.agencyId));
          return {
            mediumId: medium.id,
            mediumName: medium.name,
            totalCount: medAgencies.reduce((s, a) => s + Number(a.count), 0),
            agencies: medAgencies.sort((a, b) => b.count - a.count),
          };
        })
        .filter((m) => m.totalCount > 0);
      return {
        majorId: major.id,
        majorName: major.name,
        totalCount: mediums.reduce((s, m) => s + m.totalCount, 0),
        mediums,
      };
    })
    .filter((g) => g.totalCount > 0);

  const uncategorized = items
    .filter((item) => !categorizedIds.has(item.agencyId))
    .sort((a, b) => b.count - a.count);

  return { majorGroups, uncategorized };
}

function buildDetailHierarchy(
  byAgency: AgencyEntry[],
  agencyCatMap: Map<string, { majorId: string; majorName: string; mediumId: string; mediumName: string }>,
  categories: CategoryNode[]
): { majorGroups: DetailMajor[]; uncategorized: AgencyEntry[] } {
  const majorMap = new Map<
    string,
    {
      majorId: string;
      majorName: string;
      mediums: Map<string, { mediumId: string; mediumName: string; totalItems: number; agencies: AgencyEntry[] }>;
      totalItems: number;
    }
  >();

  for (const major of categories) {
    const mediums = new Map<
      string,
      { mediumId: string; mediumName: string; totalItems: number; agencies: AgencyEntry[] }
    >();
    for (const medium of major.children || []) {
      mediums.set(medium.id, { mediumId: medium.id, mediumName: medium.name, totalItems: 0, agencies: [] });
    }
    majorMap.set(major.id, { majorId: major.id, majorName: major.name, mediums, totalItems: 0 });
  }

  const uncategorized: AgencyEntry[] = [];

  for (const entry of byAgency) {
    const [agencyId] = entry;
    const catInfo = agencyCatMap.get(agencyId);
    if (catInfo) {
      const majorGroup = majorMap.get(catInfo.majorId);
      if (majorGroup) {
        const mediumGroup = majorGroup.mediums.get(catInfo.mediumId);
        if (mediumGroup) {
          const itemCount = entry[1].items.length;
          mediumGroup.agencies.push(entry);
          mediumGroup.totalItems += itemCount;
          majorGroup.totalItems += itemCount;
          continue;
        }
      }
    }
    uncategorized.push(entry);
  }

  const majorGroups: DetailMajor[] = Array.from(majorMap.values())
    .filter((g) => g.totalItems > 0)
    .map((g) => ({
      majorId: g.majorId,
      majorName: g.majorName,
      totalItems: g.totalItems,
      mediums: Array.from(g.mediums.values()).filter((m) => m.totalItems > 0),
    }));

  return { majorGroups, uncategorized };
}

/* ─── Count hierarchy table ─── */

/* ─── 책갈피 탭 버튼 (drill-down 공통) ─── */
function KpiTab({
  active,
  onClick,
  label,
  count,
  size = "lg",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  size?: "lg" | "sm";
}) {
  const isLg = size === "lg";
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`group relative flex min-w-0 items-center justify-center gap-2 rounded-t-lg ${
        isLg ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs"
      } font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 ${
        active
          ? "-translate-y-1 border-x border-t border-gray-200 bg-white shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.08)]"
          : "border border-transparent bg-gray-50 text-gray-600 hover:-translate-y-0.5 hover:bg-gray-100"
      }`}
    >
      <span className={`whitespace-nowrap ${active ? "text-gray-900" : ""}`}>
        {label}
      </span>
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
          active ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-700"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function CountHierarchyTable({
  hierarchy,
  total,
  badgeClass,
}: {
  hierarchy: { majorGroups: CountMajor[]; uncategorized: CountItem[] };
  total: number;
  badgeClass: string;
}) {
  const [activeMajor, setActiveMajor] = useState<string | null>(null);
  const pct = (n: number) =>
    (total > 0 ? ((n / total) * 100).toFixed(1) : "0") + "%";

  const uncTotal = hierarchy.uncategorized.reduce(
    (s, i) => s + Number(i.count),
    0
  );

  // 활성 탭 기준 거래처 행 (대분류 정보 포함해 평탄화)
  const visibleRows = useMemo(() => {
    type Row = { id: string; name: string; count: number; sub: string };
    if (activeMajor === "__unc__") {
      return hierarchy.uncategorized.map<Row>((item) => ({
        id: item.agencyId,
        name: item.agencyName,
        count: Number(item.count),
        sub: "미분류",
      }));
    }
    if (activeMajor) {
      const major = hierarchy.majorGroups.find(
        (m) => m.majorId === activeMajor
      );
      const out: Row[] = [];
      major?.mediums.forEach((med) =>
        med.agencies.forEach((a) =>
          out.push({
            id: a.agencyId,
            name: a.agencyName,
            count: Number(a.count),
            sub: med.mediumName,
          })
        )
      );
      return out;
    }
    // 전체
    const out: Row[] = [];
    hierarchy.majorGroups.forEach((m) =>
      m.mediums.forEach((med) =>
        med.agencies.forEach((a) =>
          out.push({
            id: a.agencyId,
            name: a.agencyName,
            count: Number(a.count),
            sub: `${m.majorName} > ${med.mediumName}`,
          })
        )
      )
    );
    hierarchy.uncategorized.forEach((item) =>
      out.push({
        id: item.agencyId,
        name: item.agencyName,
        count: Number(item.count),
        sub: "미분류",
      })
    );
    return out;
  }, [hierarchy, activeMajor]);

  const visibleTotal = visibleRows.reduce((s, r) => s + r.count, 0);

  return (
    <div className="space-y-2">
      <div
        role="tablist"
        className="flex flex-wrap items-end gap-1 border-b border-gray-200"
      >
        <KpiTab
          active={!activeMajor}
          onClick={() => setActiveMajor(null)}
          label="전체"
          count={total}
        />
        {hierarchy.majorGroups.map((major) => (
          <KpiTab
            key={major.majorId}
            active={activeMajor === major.majorId}
            onClick={() => setActiveMajor(major.majorId)}
            label={major.majorName}
            count={major.totalCount}
          />
        ))}
        {uncTotal > 0 && hierarchy.uncategorized.length > 0 && (
          <KpiTab
            active={activeMajor === "__unc__"}
            onClick={() => setActiveMajor("__unc__")}
            label="미분류"
            count={uncTotal}
          />
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[160px]">거래처</TableHead>
            <TableHead className="text-xs text-gray-500">분류</TableHead>
            <TableHead className="text-center">건수</TableHead>
            <TableHead className="text-right">비율</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="text-xs text-gray-500">{row.sub}</TableCell>
              <TableCell className="text-center">
                <Badge className={badgeClass}>{row.count}건</Badge>
              </TableCell>
              <TableCell className="text-right text-sm text-gray-500">
                {pct(row.count)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-gray-50 font-bold">
            <TableCell colSpan={2}>합계</TableCell>
            <TableCell className="text-center">{visibleTotal}건</TableCell>
            <TableCell className="text-right">
              {total > 0
                ? ((visibleTotal / total) * 100).toFixed(0) + "%"
                : "0%"}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

/* ─── Detail hierarchy section ─── */

function DetailHierarchySection({
  hierarchy,
  renderAgencyTable,
}: {
  hierarchy: { majorGroups: DetailMajor[]; uncategorized: AgencyEntry[] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderAgencyTable: (agencyId: string, group: { name: string; items: any[] }) => ReactNode;
}) {
  const [activeMajor, setActiveMajor] = useState<string | null>(null);
  const [activeMedium, setActiveMedium] = useState<string | null>(null);

  // 대분류 변경 시 중분류 초기화
  useEffect(() => {
    setActiveMedium(null);
  }, [activeMajor]);

  const totalItems = useMemo(() => {
    const fromMajors = hierarchy.majorGroups.reduce(
      (s, m) => s + m.totalItems,
      0
    );
    const fromUnc = hierarchy.uncategorized.reduce(
      (s, [, g]) => s + g.items.length,
      0
    );
    return fromMajors + fromUnc;
  }, [hierarchy]);

  const uncCount = useMemo(
    () =>
      hierarchy.uncategorized.reduce((s, [, g]) => s + g.items.length, 0),
    [hierarchy]
  );

  // 활성 탭 기준 거래처 목록
  const visibleAgencies = useMemo(() => {
    if (activeMajor === "__unc__") return hierarchy.uncategorized;
    if (activeMedium) {
      const major = hierarchy.majorGroups.find((m) =>
        m.mediums.some((med) => med.mediumId === activeMedium)
      );
      return (
        major?.mediums.find((med) => med.mediumId === activeMedium)?.agencies ||
        []
      );
    }
    if (activeMajor) {
      const major = hierarchy.majorGroups.find(
        (m) => m.majorId === activeMajor
      );
      return major?.mediums.flatMap((m) => m.agencies) || [];
    }
    // 전체
    const all: AgencyEntry[] = [];
    hierarchy.majorGroups.forEach((m) =>
      m.mediums.forEach((med) => all.push(...med.agencies))
    );
    all.push(...hierarchy.uncategorized);
    return all;
  }, [hierarchy, activeMajor, activeMedium]);

  // 선택된 대분류의 중분류 목록
  const mediumTabs = useMemo(() => {
    if (!activeMajor || activeMajor === "__unc__") return [];
    const major = hierarchy.majorGroups.find((m) => m.majorId === activeMajor);
    return major?.mediums || [];
  }, [hierarchy, activeMajor]);

  return (
    <div className="space-y-3">
      {/* 대분류 책갈피 */}
      <div
        role="tablist"
        aria-label="대분류 탭"
        className="flex flex-wrap items-end gap-1 border-b border-gray-200"
      >
        <KpiTab
          active={!activeMajor}
          onClick={() => setActiveMajor(null)}
          label="전체"
          count={totalItems}
        />
        {hierarchy.majorGroups.map((major) => (
          <KpiTab
            key={major.majorId}
            active={activeMajor === major.majorId}
            onClick={() => setActiveMajor(major.majorId)}
            label={major.majorName}
            count={major.totalItems}
          />
        ))}
        {uncCount > 0 && (
          <KpiTab
            active={activeMajor === "__unc__"}
            onClick={() => setActiveMajor("__unc__")}
            label="미분류"
            count={uncCount}
          />
        )}
      </div>

      {/* 중분류 책갈피 (대분류 선택 시) */}
      {mediumTabs.length > 0 && (
        <div
          role="tablist"
          aria-label="중분류 탭"
          className="flex flex-wrap items-end gap-1 border-b border-gray-200 pl-4"
        >
          <span className="flex items-center gap-1 pr-2 text-[11px] font-medium text-gray-400">
            중분류
          </span>
          <KpiTab
            size="sm"
            active={!activeMedium}
            onClick={() => setActiveMedium(null)}
            label="전체"
            count={mediumTabs.reduce((s, m) => s + m.totalItems, 0)}
          />
          {mediumTabs.map((med) => (
            <KpiTab
              key={med.mediumId}
              size="sm"
              active={activeMedium === med.mediumId}
              onClick={() => setActiveMedium(med.mediumId)}
              label={med.mediumName}
              count={med.totalItems}
            />
          ))}
        </div>
      )}

      {/* 거래처 테이블들 */}
      <div className="space-y-4">
        {visibleAgencies.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            데이터가 없습니다.
          </div>
        ) : (
          visibleAgencies.map(([agencyId, group]) =>
            renderAgencyTable(agencyId, group)
          )
        )}
      </div>
    </div>
  );
}

/* ─── Main component ─── */

const STAFF_LIST = ["권보미", "박서연", "김유림", "이아라"];

export function KpiCards({
  stats,
  kpiTotalByAgency = [],
  kpiPendingDetail = [],
  kpiAutopayDetail = [],
  supplementRequestStats = { total: 0, workStatusCount: 0, reviewCount: 0 },
  supplementRequestDetail = [],
  pendingByPeriod = { totalPending: 0, monthlyPending: 0, todayPending: 0 },
  todayPendingDetail = [],
  terminationStats = { monthlyCount: 0, alertCount: 0, byAgency: [] },
  monthlyCompleted = { totalCount: 0, commitmentCount: 0, noCommitmentCount: 0, byAgency: [] },
  todayCompleted = [],
  nameChangeIncomplete = [],
  todayTermination = { count: 0 },
  monthlyTerminationDetail = [],
  todayTerminationDetail = [],
  monthlyCompletedDetail = [],
  noCommitmentStats = { totalCount: 0, byAgency: [] },
  categories = [],
  agencies = [],
  agencyStats = [],
}: KpiCardsProps) {
  const [expanded, setExpanded] = useState<KpiKey | null>(null);
  type CommitmentFilter = "all" | "commitment" | "noCommitment";
  const [commitmentFilter, setCommitmentFilter] = useState<CommitmentFilter>("all");
  const [detailCustomer, setDetailCustomer] =
    useState<CustomerDetailData | null>(null);

  const toggle = (key: KpiKey) => {
    setExpanded((prev) => (prev === key ? null : key));
  };

  const hasHierarchy = categories.length > 0 && agencies.length > 0;

  // agency → category mapping
  const agencyCatMap = useMemo(() => {
    const map = new Map<string, { majorId: string; majorName: string; mediumId: string; mediumName: string }>();
    if (!hasHierarchy) return map;

    const catMap = new Map<string, CategoryNode>();
    categories.forEach((major) => {
      catMap.set(major.id, major);
      major.children?.forEach((medium) => catMap.set(medium.id, medium));
    });

    agencies.forEach((agency) => {
      if (agency.majorCategory && agency.mediumCategory) {
        const major = catMap.get(agency.majorCategory);
        const medium = catMap.get(agency.mediumCategory);
        if (major && medium) {
          map.set(agency.id, {
            majorId: major.id,
            majorName: major.name,
            mediumId: medium.id,
            mediumName: medium.name,
          });
        }
      }
    });

    return map;
  }, [hasHierarchy, categories, agencies]);

  // ─── Detail groupings (flat) ───
  const pendingByAgency = useMemo(() => {
    const groups: Record<string, { name: string; items: typeof kpiPendingDetail }> = {};
    kpiPendingDetail.forEach((item) => {
      if (!groups[item.agencyId]) groups[item.agencyId] = { name: item.agencyName, items: [] };
      groups[item.agencyId].items.push(item);
    });
    return Object.entries(groups).sort((a, b) => b[1].items.length - a[1].items.length);
  }, [kpiPendingDetail]);

  const todayCompletedByAgency = useMemo(() => {
    const groups: Record<string, { name: string; items: typeof todayCompleted }> = {};
    todayCompleted.forEach((item) => {
      const key = item.agencyId;
      if (!groups[key]) groups[key] = { name: item.agencyName || item.agencyId, items: [] };
      groups[key].items.push(item);
    });
    return Object.entries(groups).sort((a, b) => b[1].items.length - a[1].items.length);
  }, [todayCompleted]);

  const nameChangeByAgency = useMemo(() => {
    const groups: Record<string, { name: string; items: typeof nameChangeIncomplete }> = {};
    nameChangeIncomplete.forEach((item) => {
      const key = item.agencyId;
      if (!groups[key]) groups[key] = { name: item.agencyName || item.agencyId, items: [] };
      groups[key].items.push(item);
    });
    return Object.entries(groups).sort((a, b) => b[1].items.length - a[1].items.length);
  }, [nameChangeIncomplete]);

  const supplementByAgency = useMemo(() => {
    const groups: Record<string, { name: string; items: typeof supplementRequestDetail }> = {};
    supplementRequestDetail.forEach((item) => {
      const key = item.agencyId;
      if (!groups[key]) groups[key] = { name: item.agencyName || item.agencyId, items: [] };
      groups[key].items.push(item);
    });
    return Object.entries(groups).sort((a, b) => b[1].items.length - a[1].items.length);
  }, [supplementRequestDetail]);

  const todayByAgency = useMemo(() => {
    const groups: Record<string, { name: string; items: typeof todayPendingDetail }> = {};
    todayPendingDetail.forEach((item) => {
      const key = item.agencyId;
      if (!groups[key]) groups[key] = { name: item.agencyName || item.agencyId, items: [] };
      groups[key].items.push(item);
    });
    return Object.entries(groups).sort((a, b) => b[1].items.length - a[1].items.length);
  }, [todayPendingDetail]);

  // ─── Detail hierarchies ───
  const pendingHierarchy = useMemo(
    () => (hasHierarchy ? buildDetailHierarchy(pendingByAgency as AgencyEntry[], agencyCatMap, categories) : null),
    [hasHierarchy, pendingByAgency, agencyCatMap, categories]
  );

  const todayCompletedHierarchy = useMemo(
    () => (hasHierarchy ? buildDetailHierarchy(todayCompletedByAgency as AgencyEntry[], agencyCatMap, categories) : null),
    [hasHierarchy, todayCompletedByAgency, agencyCatMap, categories]
  );

  const nameChangeHierarchy = useMemo(
    () => (hasHierarchy ? buildDetailHierarchy(nameChangeByAgency as AgencyEntry[], agencyCatMap, categories) : null),
    [hasHierarchy, nameChangeByAgency, agencyCatMap, categories]
  );

  const supplementHierarchy = useMemo(
    () =>
      hasHierarchy ? buildDetailHierarchy(supplementByAgency as AgencyEntry[], agencyCatMap, categories) : null,
    [hasHierarchy, supplementByAgency, agencyCatMap, categories]
  );

  const todayHierarchy = useMemo(
    () => (hasHierarchy ? buildDetailHierarchy(todayByAgency as AgencyEntry[], agencyCatMap, categories) : null),
    [hasHierarchy, todayByAgency, agencyCatMap, categories]
  );

  // ─── 해지 관련 데이터 ───
  const monthlyTermByAgency = useMemo<CountItem[]>(() => {
    return (terminationStats.byAgency || []).map(a => ({
      agencyId: a.agencyId,
      agencyName: a.agencyName || a.agencyId,
      count: Number(a.count),
    })).sort((a, b) => b.count - a.count);
  }, [terminationStats.byAgency]);

  const monthlyTermHierarchy = useMemo(
    () => (hasHierarchy ? buildCountHierarchy(monthlyTermByAgency, categories, agencies) : null),
    [hasHierarchy, monthlyTermByAgency, categories, agencies]
  );

  const monthlyTermDetailByAgency = useMemo(() => {
    const groups: Record<string, { name: string; items: typeof monthlyTerminationDetail }> = {};
    monthlyTerminationDetail.forEach((item) => {
      const key = item.agencyId;
      if (!groups[key]) groups[key] = { name: item.agencyName || item.agencyId, items: [] };
      groups[key].items.push(item);
    });
    return Object.entries(groups).sort((a, b) => b[1].items.length - a[1].items.length);
  }, [monthlyTerminationDetail]);

  const monthlyTermDetailHierarchy = useMemo(
    () => (hasHierarchy ? buildDetailHierarchy(monthlyTermDetailByAgency as AgencyEntry[], agencyCatMap, categories) : null),
    [hasHierarchy, monthlyTermDetailByAgency, agencyCatMap, categories]
  );

  // ─── 당월 개통완료 상세 (필터링 + 거래처 그룹핑) ───
  const monthlyCompletedDetailFiltered = useMemo(() => {
    return monthlyCompletedDetail.filter((item) => {
      if (commitmentFilter === "commitment") return item.selectedCommitment === true;
      if (commitmentFilter === "noCommitment") return item.selectedCommitment === false;
      return true;
    });
  }, [monthlyCompletedDetail, commitmentFilter]);

  const monthlyCompletedDetailByAgency = useMemo(() => {
    const groups: Record<string, { name: string; items: typeof monthlyCompletedDetailFiltered }> = {};
    monthlyCompletedDetailFiltered.forEach((item) => {
      const key = item.agencyId;
      if (!groups[key]) groups[key] = { name: item.agencyName || item.agencyId, items: [] };
      groups[key].items.push(item);
    });
    return Object.entries(groups).sort((a, b) => b[1].items.length - a[1].items.length);
  }, [monthlyCompletedDetailFiltered]);

  const monthlyCompletedDetailHierarchy = useMemo(
    () => (hasHierarchy ? buildDetailHierarchy(monthlyCompletedDetailByAgency as AgencyEntry[], agencyCatMap, categories) : null),
    [hasHierarchy, monthlyCompletedDetailByAgency, agencyCatMap, categories]
  );


  // ─── 고객명 클릭 → 상세 다이얼로그 열기 ───
  const openCustomerDetail = async (activationId: string) => {
    try {
      const res = await fetch(`/api/activations/${activationId}`);
      if (!res.ok) throw new Error();
      const { activation } = await res.json();
      setDetailCustomer(activation as CustomerDetailData);
    } catch {
      toast.error("고객 정보를 불러오지 못했습니다.");
    }
  };

  // ─── 다이얼로그 내부 인라인 편집 → PATCH + 낙관적 업데이트 ───
  const handleInlineUpdate = async (
    id: string,
    field: string,
    value: string
  ) => {
    const booleanFields = new Set([
      "deviceChangeConfirmed",
      "selectedCommitment",
      "autopayRegistered",
      "combinedUnitNameChange",
      "billingAccountNameChange",
    ]);
    const parsedValue: unknown = booleanFields.has(field)
      ? value === "true"
      : value;

    setDetailCustomer((prev) =>
      prev ? { ...prev, [field]: parsedValue } : null
    );

    try {
      const res = await fetch(`/api/activations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: parsedValue }),
      });
      if (!res.ok) {
        toast.error("수정에 실패했습니다.");
      }
    } catch {
      toast.error("수정 중 오류가 발생했습니다.");
    }
  };

  // ─── helpers ───
  const getSupplementReasons = (item: (typeof supplementRequestDetail)[0]) => {
    const reasons: string[] = [];
    if (item.workStatus === "보완요청") reasons.push("진행상황");
    if (item.applicationDocsReview === "보완요청") reasons.push("가입신청서");
    if (item.nameChangeDocsReview === "보완요청") reasons.push("명의변경");
    if (item.arcAutopayReview === "보완요청") reasons.push("외국인등록증");
    return reasons;
  };

  // ─── Agency table renderers ───

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderPendingAgency = (agencyId: string, group: { name: string; items: any[] }) => (
    <div key={agencyId}>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-semibold text-sm">{group.name}</h3>
        <Badge variant="secondary">{group.items.length}건</Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>고객명</TableHead>
            <TableHead>번호</TableHead>
            <TableHead className="text-center">입국예정일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {group.items.map((item: { id: string; customerName: string; newPhoneNumber: string | null; entryDate: string | null }) => (
            <TableRow key={item.id}>
              <TableCell>
                <button
                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                  onClick={(e) => { e.stopPropagation(); openCustomerDetail(item.id); }}
                >
                  {item.customerName}
                </button>
              </TableCell>
              <TableCell className="text-sm">{item.newPhoneNumber || "-"}</TableCell>
              <TableCell className="text-center">
                {item.entryDate ? (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {format(new Date(item.entryDate), "yyyy-MM-dd")}
                  </Badge>
                ) : (
                  <span className="text-gray-400">미정</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTodayAgency = (agencyId: string, group: { name: string; items: any[] }) => (
    <div key={agencyId}>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-semibold text-sm">{group.name}</h3>
        <Badge variant="secondary">{group.items.length}건</Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>고객명</TableHead>
            <TableHead>번호</TableHead>
            <TableHead>담당자</TableHead>
            <TableHead className="text-center">입국예정일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {group.items.map((item: { id: string; customerName: string; newPhoneNumber: string | null; personInCharge: string | null; entryDate: string | null }) => (
            <TableRow key={item.id}>
              <TableCell>
                <button
                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                  onClick={(e) => { e.stopPropagation(); openCustomerDetail(item.id); }}
                >
                  {item.customerName}
                </button>
              </TableCell>
              <TableCell className="text-sm">{item.newPhoneNumber || "-"}</TableCell>
              <TableCell className="text-sm">{item.personInCharge || "-"}</TableCell>
              <TableCell className="text-center">
                {item.entryDate ? (
                  <Badge className="bg-orange-100 text-orange-800">
                    {format(new Date(item.entryDate), "yyyy-MM-dd")}
                  </Badge>
                ) : (
                  <span className="text-gray-400">미정</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderSupplementAgency = (agencyId: string, group: { name: string; items: any[] }) => (
    <div key={agencyId}>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-semibold text-sm">{group.name}</h3>
        <Badge variant="secondary">{group.items.length}건</Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>고객명</TableHead>
            <TableHead>번호</TableHead>
            <TableHead>담당자</TableHead>
            <TableHead className="text-center">보완 사유</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {group.items.map((item: { id: string; agencyId: string; agencyName: string | null; customerName: string; newPhoneNumber: string | null; personInCharge: string | null; workStatus: string | null; applicationDocsReview: string | null; nameChangeDocsReview: string | null; arcAutopayReview: string | null }) => {
            const reasons = getSupplementReasons(item);
            return (
              <TableRow key={item.id} className="bg-rose-50/50">
                <TableCell>
                  <button
                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                    onClick={(e) => { e.stopPropagation(); openCustomerDetail(item.id); }}
                  >
                    {item.customerName}
                  </button>
                </TableCell>
                <TableCell className="text-sm">{item.newPhoneNumber || "-"}</TableCell>
                <TableCell className="text-sm">{item.personInCharge || "-"}</TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-wrap gap-1 justify-center">
                    {reasons.map((r) => (
                      <Badge key={r} className="bg-rose-100 text-rose-700 text-[10px]">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderMonthlyCompletedDetailAgency = (agencyId: string, group: { name: string; items: any[] }) => (
    <div key={agencyId}>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-semibold text-sm">{group.name}</h3>
        <Badge variant="secondary">{group.items.length}건</Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>고객명</TableHead>
            <TableHead>번호</TableHead>
            <TableHead className="text-center">개통일</TableHead>
            <TableHead className="text-center">약정</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {group.items.map((item: { id: string; customerName: string; newPhoneNumber: string | null; activationDate: string | null; selectedCommitment: boolean }) => (
            <TableRow key={item.id}>
              <TableCell>
                <button
                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                  onClick={(e) => { e.stopPropagation(); openCustomerDetail(item.id); }}
                >
                  {item.customerName}
                </button>
              </TableCell>
              <TableCell className="text-sm">{item.newPhoneNumber || "-"}</TableCell>
              <TableCell className="text-center">
                {item.activationDate ? (
                  <Badge className="bg-emerald-100 text-emerald-800">
                    {format(new Date(item.activationDate), "yyyy-MM-dd")}
                  </Badge>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                <Badge className={item.selectedCommitment ? "bg-blue-100 text-blue-800" : "bg-indigo-100 text-indigo-800"}>
                  {item.selectedCommitment ? "약정" : "무약정"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTodayCompletedAgency = (agencyId: string, group: { name: string; items: any[] }) => (
    <div key={agencyId}>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-semibold text-sm">{group.name}</h3>
        <Badge variant="secondary">{group.items.length}건</Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>고객명</TableHead>
            <TableHead>번호</TableHead>
            <TableHead className="text-center">개통일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {group.items.map((item: { id: string; customerName: string; newPhoneNumber: string | null; activationDate: string | null }) => (
            <TableRow key={item.id}>
              <TableCell>
                <button
                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                  onClick={(e) => { e.stopPropagation(); openCustomerDetail(item.id); }}
                >
                  {item.customerName}
                </button>
              </TableCell>
              <TableCell className="text-sm">{item.newPhoneNumber || "-"}</TableCell>
              <TableCell className="text-center">
                {item.activationDate ? (
                  <Badge className="bg-emerald-100 text-emerald-800">
                    {format(new Date(item.activationDate), "yyyy-MM-dd")}
                  </Badge>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderNameChangeAgency = (agencyId: string, group: { name: string; items: any[] }) => (
    <div key={agencyId}>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-semibold text-sm">{group.name}</h3>
        <Badge variant="secondary">{group.items.length}건</Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>고객명</TableHead>
            <TableHead>번호</TableHead>
            <TableHead className="text-center">명의변경</TableHead>
            <TableHead className="text-center">외국인등록증</TableHead>
            <TableHead className="text-center">자동이체</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {group.items.map((item: { id: string; customerName: string; newPhoneNumber: string | null; nameChangeDocsReview: string | null; arcReview: string | null; autopayReview: string | null }) => (
            <TableRow key={item.id}>
              <TableCell>
                <button
                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                  onClick={(e) => { e.stopPropagation(); openCustomerDetail(item.id); }}
                >
                  {item.customerName}
                </button>
              </TableCell>
              <TableCell className="text-sm">{item.newPhoneNumber || "-"}</TableCell>
              <TableCell className="text-center">
                <Badge className={item.nameChangeDocsReview === '완료' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                  {item.nameChangeDocsReview || '미검수'}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge className={item.arcReview === '완료' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                  {item.arcReview || '미검수'}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge className={item.autopayReview === '완료' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                  {item.autopayReview || '미검수'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTerminationAgency = (agencyId: string, group: { name: string; items: any[] }) => (
    <div key={agencyId}>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-semibold text-sm">{group.name}</h3>
        <Badge variant="secondary">{group.items.length}건</Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>고객명</TableHead>
            <TableHead>번호</TableHead>
            <TableHead className="text-center">해지일</TableHead>
            <TableHead className="text-center">사유</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {group.items.map((item: { id: string; customerName: string; newPhoneNumber: string | null; terminationDate: string | null; terminationReason: string | null }) => (
            <TableRow key={item.id} className="bg-red-50/50">
              <TableCell>
                <button
                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                  onClick={(e) => { e.stopPropagation(); openCustomerDetail(item.id); }}
                >
                  {item.customerName}
                </button>
              </TableCell>
              <TableCell className="text-sm">{item.newPhoneNumber || "-"}</TableCell>
              <TableCell className="text-center">
                {item.terminationDate ? (
                  <Badge className="bg-red-100 text-red-800">
                    {format(new Date(item.terminationDate), "yyyy-MM-dd")}
                  </Badge>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                <Badge className="bg-gray-100 text-gray-700 text-[10px]">
                  {item.terminationReason || "수동해지"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  // ─── cards config ───
  const cards: {
    key: KpiKey;
    title: string;
    value: number;
    subtitle?: string;
    icon: typeof CheckCircle2;
    color: string;
    bg: string;
    ring: string;
    expandable: boolean;
  }[] = [
    // Row 1
    {
      key: "monthlyCompleted",
      title: "당월 개통완료",
      value: monthlyCompleted.totalCount,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
      ring: "ring-green-500",
      expandable: true,
    },
    {
      key: "monthlyPending",
      title: "당월 개통대기",
      value: pendingByPeriod.monthlyPending,
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      ring: "ring-yellow-500",
      expandable: true,
    },
    {
      key: "nameChangeIncomplete",
      title: "명의변경 미보완",
      value: nameChangeIncomplete.length,
      icon: AlertTriangle,
      color: "text-purple-600",
      bg: "bg-purple-50",
      ring: "ring-purple-500",
      expandable: true,
    },
    {
      key: "monthlyTermination",
      title: "당월 해지",
      value: terminationStats.monthlyCount,
      subtitle: terminationStats.alertCount > 0 ? `해지예고 ${terminationStats.alertCount}건` : undefined,
      icon: XCircle,
      color: "text-gray-700",
      bg: "bg-gray-100",
      ring: "ring-gray-500",
      expandable: true,
    },
    // Row 2
    {
      key: "todayCompleted",
      title: "당일 개통완료",
      value: todayCompleted.length,
      subtitle: "오늘 개통완료 처리",
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      ring: "ring-emerald-500",
      expandable: true,
    },
    {
      key: "todayPending",
      title: "당일 개통대기",
      value: pendingByPeriod.todayPending,
      subtitle: "오늘 입국예정",
      icon: CalendarDays,
      color: "text-orange-600",
      bg: "bg-orange-50",
      ring: "ring-orange-500",
      expandable: true,
    },
    {
      key: "supplement",
      title: "보완요청 대기",
      value: Number(supplementRequestStats.total) || 0,
      subtitle: "거래처 보완 대기",
      icon: AlertTriangle,
      color: "text-rose-600",
      bg: "bg-rose-50",
      ring: "ring-rose-500",
      expandable: true,
    },
  ];

  return (
    <div className="space-y-4">
      {/* KPI 탭 바 (책갈피 스타일) */}
      <div
        role="tablist"
        aria-label="대시보드 KPI 탭"
        className="flex flex-wrap items-end gap-1 border-b border-gray-200"
      >
        {cards.map((card) => {
          const isActive = expanded === card.key;
          return (
            <button
              key={card.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`kpi-panel-${card.key}`}
              disabled={!card.expandable}
              onClick={() => card.expandable && toggle(card.key)}
              className={`group relative flex min-w-0 flex-1 basis-[9rem] items-center justify-center gap-2 rounded-t-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 ${
                isActive
                  ? "-translate-y-1 border-x border-t border-gray-200 bg-white shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.08)]"
                  : "border border-transparent bg-gray-50 text-gray-600 hover:-translate-y-0.5 hover:bg-gray-100"
              } ${card.expandable ? "cursor-pointer" : "cursor-default opacity-60"}`}
            >
              <div
                className={`rounded-md p-1 transition-colors ${
                  isActive ? card.bg : "bg-transparent"
                }`}
              >
                <card.icon
                  className={`h-3.5 w-3.5 ${isActive ? card.color : "text-gray-400"}`}
                />
              </div>
              <span className={`whitespace-nowrap ${isActive ? "text-gray-900" : ""}`}>{card.title}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                  isActive
                    ? `${card.bg} ${card.color}`
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {card.value}
              </span>
              {/* subtitle은 활성 탭 폭을 흔들어 줄바꿈을 유발 → 패널 헤더로 이동 */}
            </button>
          );
        })}
      </div>

      {!expanded && (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 py-10 text-center text-sm text-gray-400">
          위 항목을 클릭하면 상세 내역이 표시됩니다
        </div>
      )}

      {/* ──── 당월 개통완료 drill-down ──── */}
      {expanded === "monthlyCompleted" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              당월 개통완료 상세
              <Badge className="bg-green-100 text-green-800">{monthlyCompletedDetailFiltered.length}건</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${commitmentFilter === "all" ? "bg-gray-900 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
                onClick={() => setCommitmentFilter("all")}
              >
                전체 {monthlyCompleted.totalCount}건
              </button>
              <button
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${commitmentFilter === "commitment" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}
                onClick={() => setCommitmentFilter("commitment")}
              >
                선택약정 {monthlyCompleted.commitmentCount}건
              </button>
              <button
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${commitmentFilter === "noCommitment" ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"}`}
                onClick={() => setCommitmentFilter("noCommitment")}
              >
                무약정 {monthlyCompleted.noCommitmentCount}건
              </button>
            </div>
            {monthlyCompletedDetailFiltered.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">해당 조건의 데이터가 없습니다.</p>
            ) : monthlyCompletedDetailHierarchy ? (
              <DetailHierarchySection
                hierarchy={monthlyCompletedDetailHierarchy}
                renderAgencyTable={renderMonthlyCompletedDetailAgency}
              />
            ) : (
              <div className="space-y-6">
                {monthlyCompletedDetailByAgency.map(([agencyId, group]) => renderMonthlyCompletedDetailAgency(agencyId, group))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ──── 당월 개통대기 drill-down ──── */}
      {expanded === "monthlyPending" && pendingByAgency.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              개통대기 상세 (당월 {pendingByPeriod.monthlyPending}건)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingHierarchy ? (
              <DetailHierarchySection
                hierarchy={pendingHierarchy}
                renderAgencyTable={renderPendingAgency}
              />
            ) : (
              <div className="space-y-6">
                {pendingByAgency.map(([agencyId, group]) => renderPendingAgency(agencyId, group))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ──── 명의변경 미보완 drill-down ──── */}
      {expanded === "nameChangeIncomplete" && nameChangeByAgency.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-purple-600" />
              명의변경 미보완 상세 ({nameChangeIncomplete.length}건)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nameChangeHierarchy ? (
              <DetailHierarchySection
                hierarchy={nameChangeHierarchy}
                renderAgencyTable={renderNameChangeAgency}
              />
            ) : (
              <div className="space-y-6">
                {nameChangeByAgency.map(([agencyId, group]) =>
                  renderNameChangeAgency(agencyId, group)
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ──── 당일 개통완료 drill-down ──── */}
      {expanded === "todayCompleted" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              당일 개통완료 ({todayCompleted.length}건)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayCompletedByAgency.length > 0 ? (
              todayCompletedHierarchy ? (
                <DetailHierarchySection
                  hierarchy={todayCompletedHierarchy}
                  renderAgencyTable={renderTodayCompletedAgency}
                />
              ) : (
                <div className="space-y-6">
                  {todayCompletedByAgency.map(([agencyId, group]) => renderTodayCompletedAgency(agencyId, group))}
                </div>
              )
            ) : (
              <div className="py-8 text-center text-gray-500">
                오늘 개통완료 처리된 건이 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ──── 당일 개통대기 drill-down ──── */}
      {expanded === "todayPending" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-orange-600" />
              당일 개통대기 ({pendingByPeriod.todayPending}건)
              <span className="text-xs font-normal text-gray-400 ml-2">
                입국예정일 = 오늘 &amp; 담당자 미배정/개통요청 상태
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayByAgency.length > 0 ? (
              todayHierarchy ? (
                <DetailHierarchySection
                  hierarchy={todayHierarchy}
                  renderAgencyTable={renderTodayAgency}
                />
              ) : (
                <div className="space-y-6">
                  {todayByAgency.map(([agencyId, group]) => renderTodayAgency(agencyId, group))}
                </div>
              )
            ) : (
              <div className="py-8 text-center text-gray-500">
                오늘 입국예정인 개통대기 건이 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ──── 당월 해지 drill-down ──── */}
      {expanded === "monthlyTermination" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="h-4 w-4 text-gray-700" />
              당월 해지 ({terminationStats.monthlyCount}건)
              {terminationStats.alertCount > 0 && (
                <Badge className="bg-orange-100 text-orange-700 ml-2">해지예고 {terminationStats.alertCount}건</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {terminationStats.monthlyCount > 0 ? (
              <div className="space-y-6">
                {/* 거래처별 건수 요약 */}
                {monthlyTermByAgency.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-600 mb-2">거래처별 건수</h4>
                    {monthlyTermHierarchy ? (
                      <CountHierarchyTable
                        hierarchy={monthlyTermHierarchy}
                        total={terminationStats.monthlyCount}
                        badgeClass="bg-red-100 text-red-800"
                      />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>거래처</TableHead>
                            <TableHead className="text-center">해지 건수</TableHead>
                            <TableHead className="text-right">비율</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {monthlyTermByAgency.map((row) => (
                            <TableRow key={row.agencyId}>
                              <TableCell className="font-medium">{row.agencyName}</TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-red-100 text-red-800">{row.count}건</Badge>
                              </TableCell>
                              <TableCell className="text-right text-sm text-gray-500">
                                {terminationStats.monthlyCount > 0
                                  ? ((Number(row.count) / terminationStats.monthlyCount) * 100).toFixed(1)
                                  : 0}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}
                {/* 상세 목록 */}
                {monthlyTermDetailByAgency.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-600 mb-2">상세 목록</h4>
                    {monthlyTermDetailHierarchy ? (
                      <DetailHierarchySection
                        hierarchy={monthlyTermDetailHierarchy}
                        renderAgencyTable={renderTerminationAgency}
                      />
                    ) : (
                      <div className="space-y-6">
                        {monthlyTermDetailByAgency.map(([agencyId, group]) =>
                          renderTerminationAgency(agencyId, group)
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                당월 해지 건이 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ──── 보완요청 대기 drill-down ──── */}
      {expanded === "supplement" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              보완요청 대기 상세 ({Number(supplementRequestStats.total)}건)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {supplementByAgency.length > 0 ? (
              supplementHierarchy ? (
                <DetailHierarchySection
                  hierarchy={supplementHierarchy}
                  renderAgencyTable={renderSupplementAgency}
                />
              ) : (
                <div className="space-y-6">
                  {supplementByAgency.map(([agencyId, group]) =>
                    renderSupplementAgency(agencyId, group)
                  )}
                </div>
              )
            ) : (
              <div className="py-8 text-center text-gray-500">
                보완요청 대기 건이 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 데이터 없을 때 */}
      {expanded &&
        ((expanded === "monthlyPending" && pendingByAgency.length === 0) ||
          (expanded === "todayCompleted" && todayCompletedByAgency.length === 0) ||
          (expanded === "nameChangeIncomplete" && nameChangeByAgency.length === 0)) && (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              해당하는 건이 없습니다.
            </CardContent>
          </Card>
        )}

      {/* 고객 상세 다이얼로그 (드릴다운 리스트에서 고객명 클릭 시) */}
      <CustomerDetailDialog
        open={!!detailCustomer}
        onClose={() => setDetailCustomer(null)}
        customer={detailCustomer}
        onUpdate={handleInlineUpdate}
        staffList={STAFF_LIST}
        isAdmin={true}
      />
    </div>
  );
}
