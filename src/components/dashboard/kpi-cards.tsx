"use client";

import { useState, useMemo, Fragment, type ReactNode } from "react";
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
  ChevronUp,
  ChevronRight,
  XCircle,
  FileX,
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

type KpiKey = "monthlyCompleted" | "monthlyPending" | "nameChangeIncomplete" | "monthlyTermination" | "todayCompleted" | "todayPending" | "supplement" | "todayTermination" | "noCommitment";

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

function CountHierarchyTable({
  hierarchy,
  total,
  badgeClass,
  drillMajors,
  drillMediums,
  toggleMajor,
  toggleMedium,
}: {
  hierarchy: { majorGroups: CountMajor[]; uncategorized: CountItem[] };
  total: number;
  badgeClass: string;
  drillMajors: Set<string>;
  drillMediums: Set<string>;
  toggleMajor: (id: string) => void;
  toggleMedium: (id: string) => void;
}) {
  const pct = (n: number) => (total > 0 ? ((n / total) * 100).toFixed(1) : "0") + "%";

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[180px]">거래처</TableHead>
          <TableHead className="text-center">건수</TableHead>
          <TableHead className="text-right">비율</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {hierarchy.majorGroups.map((major) => {
          const isMajorOpen = drillMajors.has(major.majorId);
          return (
            <Fragment key={`m-${major.majorId}`}>
              <TableRow
                className="bg-gray-50/80 cursor-pointer hover:bg-gray-100/80"
                onClick={() => toggleMajor(major.majorId)}
              >
                <TableCell className="font-bold">
                  <div className="flex items-center gap-1">
                    {isMajorOpen ? (
                      <ChevronDown className="size-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="size-4 text-gray-500" />
                    )}
                    {major.majorName}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={badgeClass}>{major.totalCount}건</Badge>
                </TableCell>
                <TableCell className="text-right text-sm text-gray-500">
                  {pct(major.totalCount)}
                </TableCell>
              </TableRow>

              {isMajorOpen &&
                major.mediums.map((medium) => {
                  const isMedOpen = drillMediums.has(medium.mediumId);
                  return (
                    <Fragment key={`md-${medium.mediumId}`}>
                      <TableRow
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleMedium(medium.mediumId)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-1 pl-6">
                            {isMedOpen ? (
                              <ChevronDown className="size-3.5 text-gray-400" />
                            ) : (
                              <ChevronRight className="size-3.5 text-gray-400" />
                            )}
                            <span className="font-medium text-gray-700">{medium.mediumName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{medium.totalCount}건</Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-gray-500">
                          {pct(medium.totalCount)}
                        </TableCell>
                      </TableRow>

                      {isMedOpen &&
                        medium.agencies.map((agency) => (
                          <TableRow key={`a-${agency.agencyId}`}>
                            <TableCell>
                              <div className="pl-12 font-medium">{agency.agencyName}</div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={badgeClass}>{agency.count}건</Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm text-gray-500">
                              {pct(Number(agency.count))}
                            </TableCell>
                          </TableRow>
                        ))}
                    </Fragment>
                  );
                })}
            </Fragment>
          );
        })}

        {/* 미분류 */}
        {hierarchy.uncategorized.length > 0 &&
          (() => {
            if (hierarchy.uncategorized.length === 1) {
              const item = hierarchy.uncategorized[0];
              return (
                <TableRow key={`unc-${item.agencyId}`}>
                  <TableCell className="font-medium">{item.agencyName}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={badgeClass}>{item.count}건</Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-gray-500">
                    {pct(Number(item.count))}
                  </TableCell>
                </TableRow>
              );
            }
            const isUncOpen = drillMajors.has("__unc__");
            const uncTotal = hierarchy.uncategorized.reduce((s, i) => s + Number(i.count), 0);
            return (
              <Fragment key="unc-group">
                <TableRow
                  className="bg-gray-50/80 cursor-pointer hover:bg-gray-100/80"
                  onClick={() => toggleMajor("__unc__")}
                >
                  <TableCell className="font-bold">
                    <div className="flex items-center gap-1">
                      {isUncOpen ? (
                        <ChevronDown className="size-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="size-4 text-gray-400" />
                      )}
                      <span className="text-gray-500">미분류</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={badgeClass}>{uncTotal}건</Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-gray-500">
                    {pct(uncTotal)}
                  </TableCell>
                </TableRow>
                {isUncOpen &&
                  hierarchy.uncategorized.map((item) => (
                    <TableRow key={`unc-${item.agencyId}`}>
                      <TableCell>
                        <div className="pl-8 font-medium">{item.agencyName}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={badgeClass}>{item.count}건</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-500">
                        {pct(Number(item.count))}
                      </TableCell>
                    </TableRow>
                  ))}
              </Fragment>
            );
          })()}

        {/* 합계 */}
        <TableRow className="bg-gray-50 font-bold">
          <TableCell>합계</TableCell>
          <TableCell className="text-center">{total}건</TableCell>
          <TableCell className="text-right">100%</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

/* ─── Detail hierarchy section ─── */

function DetailHierarchySection({
  hierarchy,
  drillMajors,
  drillMediums,
  toggleMajor,
  toggleMedium,
  renderAgencyTable,
}: {
  hierarchy: { majorGroups: DetailMajor[]; uncategorized: AgencyEntry[] };
  drillMajors: Set<string>;
  drillMediums: Set<string>;
  toggleMajor: (id: string) => void;
  toggleMedium: (id: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderAgencyTable: (agencyId: string, group: { name: string; items: any[] }) => ReactNode;
}) {
  return (
    <div className="space-y-3">
      {hierarchy.majorGroups.map((major) => {
        const isMajorOpen = drillMajors.has(major.majorId);
        return (
          <div key={major.majorId}>
            <div
              className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
              onClick={() => toggleMajor(major.majorId)}
            >
              {isMajorOpen ? (
                <ChevronDown className="size-4 text-gray-500" />
              ) : (
                <ChevronRight className="size-4 text-gray-500" />
              )}
              <span className="font-bold text-sm">{major.majorName}</span>
              <Badge variant="outline">{major.totalItems}건</Badge>
            </div>

            {isMajorOpen && (
              <div className="space-y-2 mt-2 ml-2">
                {major.mediums.map((medium) => {
                  const isMedOpen = drillMediums.has(medium.mediumId);
                  return (
                    <div key={medium.mediumId}>
                      <div
                        className="flex items-center gap-2 py-1.5 px-3 cursor-pointer hover:bg-gray-50 rounded"
                        onClick={() => toggleMedium(medium.mediumId)}
                      >
                        {isMedOpen ? (
                          <ChevronDown className="size-3.5 text-gray-400" />
                        ) : (
                          <ChevronRight className="size-3.5 text-gray-400" />
                        )}
                        <span className="font-medium text-sm text-gray-700">{medium.mediumName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {medium.totalItems}건
                        </Badge>
                      </div>

                      {isMedOpen && (
                        <div className="space-y-4 mt-2 ml-4">
                          {medium.agencies.map(([agencyId, group]) =>
                            renderAgencyTable(agencyId, group)
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* 미분류 */}
      {hierarchy.uncategorized.length > 0 && (
        <div>
          {hierarchy.uncategorized.length > 1 && (
            <div
              className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 mb-2"
              onClick={() => toggleMajor("__unc__")}
            >
              {drillMajors.has("__unc__") ? (
                <ChevronDown className="size-4 text-gray-400" />
              ) : (
                <ChevronRight className="size-4 text-gray-400" />
              )}
              <span className="font-bold text-sm text-gray-500">미분류</span>
              <Badge variant="outline">
                {hierarchy.uncategorized.reduce((s, [, g]) => s + g.items.length, 0)}건
              </Badge>
            </div>
          )}
          {(hierarchy.uncategorized.length === 1 || drillMajors.has("__unc__")) && (
            <div className={`space-y-4 ${hierarchy.uncategorized.length > 1 ? "ml-2" : ""}`}>
              {hierarchy.uncategorized.map(([agencyId, group]) =>
                renderAgencyTable(agencyId, group)
              )}
            </div>
          )}
        </div>
      )}
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
  noCommitmentStats = { totalCount: 0, byAgency: [] },
  categories = [],
  agencies = [],
  agencyStats = [],
}: KpiCardsProps) {
  const [expanded, setExpanded] = useState<KpiKey | null>(null);
  const [drillMajors, setDrillMajors] = useState<Set<string>>(new Set());
  const [drillMediums, setDrillMediums] = useState<Set<string>>(new Set());
  const [detailCustomer, setDetailCustomer] =
    useState<CustomerDetailData | null>(null);

  const toggle = (key: KpiKey) => {
    setExpanded((prev) => (prev === key ? null : key));
  };

  const toggleDrillMajor = (id: string) => {
    setDrillMajors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDrillMedium = (id: string) => {
    setDrillMediums((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  // 당월 개통완료 거래처별 데이터
  const monthlyCompletedByAgency = useMemo<CountItem[]>(() => {
    return (monthlyCompleted.byAgency || []).map(a => ({
      agencyId: a.agencyId,
      agencyName: a.agencyName || a.agencyId,
      count: Number(a.count),
    })).sort((a, b) => b.count - a.count);
  }, [monthlyCompleted.byAgency]);

  // ─── Count hierarchies ───
  const monthlyCompletedHierarchy = useMemo(
    () => (hasHierarchy ? buildCountHierarchy(monthlyCompletedByAgency, categories, agencies) : null),
    [hasHierarchy, monthlyCompletedByAgency, categories, agencies]
  );

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

  const todayTermDetailByAgency = useMemo(() => {
    const groups: Record<string, { name: string; items: typeof todayTerminationDetail }> = {};
    todayTerminationDetail.forEach((item) => {
      const key = item.agencyId;
      if (!groups[key]) groups[key] = { name: item.agencyName || item.agencyId, items: [] };
      groups[key].items.push(item);
    });
    return Object.entries(groups).sort((a, b) => b[1].items.length - a[1].items.length);
  }, [todayTerminationDetail]);

  const todayTermDetailHierarchy = useMemo(
    () => (hasHierarchy ? buildDetailHierarchy(todayTermDetailByAgency as AgencyEntry[], agencyCatMap, categories) : null),
    [hasHierarchy, todayTermDetailByAgency, agencyCatMap, categories]
  );

  // ─── 무약정 데이터 ───
  const noCommitmentByAgency = useMemo<CountItem[]>(() => {
    return (noCommitmentStats.byAgency || []).map(a => ({
      agencyId: a.agencyId,
      agencyName: a.agencyName || a.agencyId,
      count: Number(a.count),
    })).sort((a, b) => b.count - a.count);
  }, [noCommitmentStats.byAgency]);

  const noCommitmentHierarchy = useMemo(
    () => (hasHierarchy ? buildCountHierarchy(noCommitmentByAgency, categories, agencies) : null),
    [hasHierarchy, noCommitmentByAgency, categories, agencies]
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
    {
      key: "todayTermination",
      title: "당일 해지",
      value: todayTermination.count,
      subtitle: "오늘 해지 처리",
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
      ring: "ring-red-500",
      expandable: true,
    },
    // Row 3
    {
      key: "noCommitment",
      title: "당월 무약정",
      value: noCommitmentStats.totalCount,
      subtitle: "약정 미선택 개통",
      icon: FileX,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      ring: "ring-indigo-500",
      expandable: true,
    },
  ];

  return (
    <div className="space-y-4">
      {/* KPI 카드 그리드 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((card) => {
          const isExpanded = expanded === card.key;
          return (
            <Card
              key={card.key}
              className={`transition-all ${
                card.expandable ? "cursor-pointer hover:shadow-md" : ""
              } ${isExpanded ? `ring-2 ${card.ring}` : ""}`}
              onClick={() => card.expandable && toggle(card.key)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-sm font-medium text-gray-500">
                    {card.title}
                  </CardTitle>
                  {card.subtitle && (
                    <span className="text-xs text-gray-400">{card.subtitle}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {card.expandable &&
                    (isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ))}
                  <div className={`rounded-lg p-2 ${card.bg}`}>
                    <card.icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ──── 당월 개통완료 drill-down ──── */}
      {expanded === "monthlyCompleted" && monthlyCompletedByAgency.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              당월 개통완료 거래처별 건수
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 rounded-lg border bg-blue-50 p-3 text-center">
                <p className="text-xs text-gray-500">선택약정</p>
                <p className="text-2xl font-bold text-blue-600">{monthlyCompleted.commitmentCount}<span className="text-sm font-normal">건</span></p>
              </div>
              <div className="flex-1 rounded-lg border bg-indigo-50 p-3 text-center">
                <p className="text-xs text-gray-500">무약정</p>
                <p className="text-2xl font-bold text-indigo-600">{monthlyCompleted.noCommitmentCount}<span className="text-sm font-normal">건</span></p>
              </div>
            </div>
            {monthlyCompletedHierarchy ? (
              <CountHierarchyTable
                hierarchy={monthlyCompletedHierarchy}
                total={monthlyCompleted.totalCount}
                badgeClass="bg-green-100 text-green-800"
                drillMajors={drillMajors}
                drillMediums={drillMediums}
                toggleMajor={toggleDrillMajor}
                toggleMedium={toggleDrillMedium}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>거래처</TableHead>
                    <TableHead className="text-center">개통 건수</TableHead>
                    <TableHead className="text-center">선택약정</TableHead>
                    <TableHead className="text-center">무약정</TableHead>
                    <TableHead className="text-right">비율</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyCompletedByAgency.map((row) => {
                    const original = (monthlyCompleted.byAgency || []).find(a => a.agencyId === row.agencyId);
                    return (
                      <TableRow key={row.agencyId}>
                        <TableCell className="font-medium">{row.agencyName}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-green-100 text-green-800">{row.count}건</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-blue-100 text-blue-800">{Number(original?.commitmentCount || 0)}건</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-indigo-100 text-indigo-800">{Number(original?.noCommitmentCount || 0)}건</Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-gray-500">
                          {monthlyCompleted.totalCount > 0
                            ? ((Number(row.count) / monthlyCompleted.totalCount) * 100).toFixed(1)
                            : 0}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-gray-50 font-bold">
                    <TableCell>합계</TableCell>
                    <TableCell className="text-center">{monthlyCompleted.totalCount}건</TableCell>
                    <TableCell className="text-center">{monthlyCompleted.commitmentCount}건</TableCell>
                    <TableCell className="text-center">{monthlyCompleted.noCommitmentCount}건</TableCell>
                    <TableCell className="text-right">100%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
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
                drillMajors={drillMajors}
                drillMediums={drillMediums}
                toggleMajor={toggleDrillMajor}
                toggleMedium={toggleDrillMedium}
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
                drillMajors={drillMajors}
                drillMediums={drillMediums}
                toggleMajor={toggleDrillMajor}
                toggleMedium={toggleDrillMedium}
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
                  drillMajors={drillMajors}
                  drillMediums={drillMediums}
                  toggleMajor={toggleDrillMajor}
                  toggleMedium={toggleDrillMedium}
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
                  drillMajors={drillMajors}
                  drillMediums={drillMediums}
                  toggleMajor={toggleDrillMajor}
                  toggleMedium={toggleDrillMedium}
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
                        drillMajors={drillMajors}
                        drillMediums={drillMediums}
                        toggleMajor={toggleDrillMajor}
                        toggleMedium={toggleDrillMedium}
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
                        drillMajors={drillMajors}
                        drillMediums={drillMediums}
                        toggleMajor={toggleDrillMajor}
                        toggleMedium={toggleDrillMedium}
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

      {/* ──── 당일 해지 drill-down ──── */}
      {expanded === "todayTermination" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              당일 해지 ({todayTermination.count}건)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayTermDetailByAgency.length > 0 ? (
              todayTermDetailHierarchy ? (
                <DetailHierarchySection
                  hierarchy={todayTermDetailHierarchy}
                  drillMajors={drillMajors}
                  drillMediums={drillMediums}
                  toggleMajor={toggleDrillMajor}
                  toggleMedium={toggleDrillMedium}
                  renderAgencyTable={renderTerminationAgency}
                />
              ) : (
                <div className="space-y-6">
                  {todayTermDetailByAgency.map(([agencyId, group]) =>
                    renderTerminationAgency(agencyId, group)
                  )}
                </div>
              )
            ) : (
              <div className="py-8 text-center text-gray-500">
                오늘 해지 처리된 건이 없습니다.
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
                  drillMajors={drillMajors}
                  drillMediums={drillMediums}
                  toggleMajor={toggleDrillMajor}
                  toggleMedium={toggleDrillMedium}
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

      {/* ──── 무약정 drill-down ──── */}
      {expanded === "noCommitment" && noCommitmentByAgency.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileX className="h-4 w-4 text-indigo-600" />
              당월 무약정 거래처별 건수
            </CardTitle>
          </CardHeader>
          <CardContent>
            {noCommitmentHierarchy ? (
              <CountHierarchyTable
                hierarchy={noCommitmentHierarchy}
                total={noCommitmentStats.totalCount}
                badgeClass="bg-indigo-100 text-indigo-800"
                drillMajors={drillMajors}
                drillMediums={drillMediums}
                toggleMajor={toggleDrillMajor}
                toggleMedium={toggleDrillMedium}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>거래처</TableHead>
                    <TableHead className="text-center">무약정 건수</TableHead>
                    <TableHead className="text-right">비율</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {noCommitmentByAgency.map((row) => (
                    <TableRow key={row.agencyId}>
                      <TableCell className="font-medium">{row.agencyName}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-indigo-100 text-indigo-800">{row.count}건</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-500">
                        {noCommitmentStats.totalCount > 0
                          ? ((Number(row.count) / noCommitmentStats.totalCount) * 100).toFixed(1)
                          : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-gray-50 font-bold">
                    <TableCell>합계</TableCell>
                    <TableCell className="text-center">{noCommitmentStats.totalCount}건</TableCell>
                    <TableCell className="text-right">100%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* 데이터 없을 때 */}
      {expanded &&
        ((expanded === "monthlyCompleted" && monthlyCompletedByAgency.length === 0) ||
          (expanded === "monthlyPending" && pendingByAgency.length === 0) ||
          (expanded === "todayCompleted" && todayCompletedByAgency.length === 0) ||
          (expanded === "nameChangeIncomplete" && nameChangeByAgency.length === 0) ||
          (expanded === "noCommitment" && noCommitmentByAgency.length === 0)) && (
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
