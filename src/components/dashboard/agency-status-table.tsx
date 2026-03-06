"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import type { CategoryNode, Agency } from "@/hooks/use-agency-filter";

interface AgencyStat {
  agencyId: string;
  agencyName: string | null;
  total: number;
  completed: number;
  pending: number;
  cancelled: number;
  working: number;
  autopayPending: number;
}

interface AggregatedStat {
  total: number;
  completed: number;
  pending: number;
  cancelled: number;
  working: number;
  autopayPending: number;
}

function sumStats(stats: AggregatedStat[]): AggregatedStat {
  return stats.reduce(
    (acc, s) => ({
      total: acc.total + Number(s.total),
      completed: acc.completed + Number(s.completed),
      pending: acc.pending + Number(s.pending),
      cancelled: acc.cancelled + Number(s.cancelled),
      working: acc.working + Number(s.working),
      autopayPending: acc.autopayPending + Number(s.autopayPending),
    }),
    { total: 0, completed: 0, pending: 0, cancelled: 0, working: 0, autopayPending: 0 }
  );
}

function StatCells({ stat }: { stat: AggregatedStat }) {
  return (
    <>
      <TableCell className="text-center font-bold">{stat.total}</TableCell>
      <TableCell className="text-center">
        <Badge className="bg-green-100 text-green-800">{stat.completed}</Badge>
      </TableCell>
      <TableCell className="text-center">
        <Badge className="bg-yellow-100 text-yellow-800">{stat.pending}</Badge>
      </TableCell>
      <TableCell className="text-center">
        {Number(stat.cancelled) > 0 ? (
          <Badge className="bg-red-100 text-red-800">{stat.cancelled}</Badge>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        {Number(stat.working) > 0 ? (
          <Badge className="bg-blue-100 text-blue-700">{stat.working}</Badge>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        {Number(stat.autopayPending) > 0 ? (
          <Badge variant="outline" className="text-orange-600 border-orange-300">
            {stat.autopayPending}
          </Badge>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </TableCell>
    </>
  );
}

interface Props {
  data: AgencyStat[];
  categories: CategoryNode[];
  agencies: Agency[];
}

export function AgencyStatusTable({ data, categories, agencies }: Props) {
  const [expandedMajors, setExpandedMajors] = useState<Set<string>>(new Set());
  const [expandedMediums, setExpandedMediums] = useState<Set<string>>(new Set());

  const toggleMajor = (id: string) => {
    setExpandedMajors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleMedium = (id: string) => {
    setExpandedMediums((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // agencyId → stat 맵
  const statMap = useMemo(() => {
    const m = new Map<string, AgencyStat>();
    data.forEach((s) => m.set(s.agencyId, s));
    return m;
  }, [data]);

  // agencyId → agency 맵 (카테고리 정보 포함)
  const agencyMap = useMemo(() => {
    const m = new Map<string, Agency>();
    agencies.forEach((a) => m.set(a.id, a));
    return m;
  }, [agencies]);

  // 계층 구조 빌드
  const { majorGroups, uncategorized } = useMemo(() => {
    // 대분류 → 중분류 → 거래처[] 트리
    const majorMap = new Map<
      string,
      {
        node: CategoryNode;
        mediums: Map<
          string,
          {
            node: CategoryNode;
            agencies: Array<{ agency: Agency; stat: AgencyStat }>;
          }
        >;
      }
    >();

    // categories 트리에서 major/medium 매핑
    for (const major of categories) {
      const mediumMap = new Map<
        string,
        {
          node: CategoryNode;
          agencies: Array<{ agency: Agency; stat: AgencyStat }>;
        }
      >();
      for (const medium of major.children || []) {
        mediumMap.set(medium.id, { node: medium, agencies: [] });
      }
      majorMap.set(major.id, { node: major, mediums: mediumMap });
    }

    // 각 거래처를 트리에 배분
    const categorizedIds = new Set<string>();

    for (const agency of agencies) {
      const stat = statMap.get(agency.id);
      if (!stat) continue; // 통계 없는 거래처는 스킵

      if (agency.majorCategory && agency.mediumCategory) {
        const majorGroup = majorMap.get(agency.majorCategory);
        if (majorGroup) {
          const mediumGroup = majorGroup.mediums.get(agency.mediumCategory);
          if (mediumGroup) {
            mediumGroup.agencies.push({ agency, stat });
            categorizedIds.add(agency.id);
          }
        }
      }
    }

    // 미분류 거래처 (majorCategory 없거나 트리에 매핑 안 된 경우)
    const uncategorizedList: Array<{ agency: Agency; stat: AgencyStat }> = [];
    for (const stat of data) {
      if (!categorizedIds.has(stat.agencyId)) {
        const agency = agencyMap.get(stat.agencyId);
        uncategorizedList.push({
          agency: agency || { id: stat.agencyId, name: stat.agencyName || stat.agencyId },
          stat,
        });
      }
    }

    return {
      majorGroups: Array.from(majorMap.values()),
      uncategorized: uncategorizedList,
    };
  }, [categories, agencies, data, statMap, agencyMap]);

  // 전체 합계
  const totalAll = sumStats(data);

  return (
    <Card>
      <CardHeader>
        <CardTitle>거래처별 개통현황</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">거래처</TableHead>
              <TableHead className="text-center">전체</TableHead>
              <TableHead className="text-center">개통완료</TableHead>
              <TableHead className="text-center">대기</TableHead>
              <TableHead className="text-center">취소</TableHead>
              <TableHead className="text-center">진행중</TableHead>
              <TableHead className="text-center">자동이체 미등록</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* 대분류 그룹 */}
            {majorGroups.map(({ node: major, mediums }) => {
              const majorAgencies = Array.from(mediums.values()).flatMap(
                (m) => m.agencies.map((a) => a.stat)
              );
              const majorStat = sumStats(majorAgencies);
              const isMajorExpanded = expandedMajors.has(major.id);

              return [
                // 대분류 행
                <TableRow
                  key={`major-${major.id}`}
                  className="bg-gray-50/80 cursor-pointer hover:bg-gray-100/80"
                  onClick={() => toggleMajor(major.id)}
                >
                  <TableCell className="font-bold">
                    <div className="flex items-center gap-1">
                      {isMajorExpanded ? (
                        <ChevronDown className="size-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="size-4 text-gray-500" />
                      )}
                      {major.name}
                    </div>
                  </TableCell>
                  <StatCells stat={majorStat} />
                </TableRow>,

                // 중분류 행 (대분류 펼쳤을 때)
                ...(isMajorExpanded
                  ? Array.from(mediums.values()).flatMap(({ node: medium, agencies: medAgencies }) => {
                      const mediumStat = sumStats(medAgencies.map((a) => a.stat));
                      const isMediumExpanded = expandedMediums.has(medium.id);

                      return [
                        // 중분류 행
                        <TableRow
                          key={`medium-${medium.id}`}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => toggleMedium(medium.id)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-1 pl-6">
                              {isMediumExpanded ? (
                                <ChevronDown className="size-3.5 text-gray-400" />
                              ) : (
                                <ChevronRight className="size-3.5 text-gray-400" />
                              )}
                              <span className="font-medium text-gray-700">
                                {medium.name}
                              </span>
                            </div>
                          </TableCell>
                          <StatCells stat={mediumStat} />
                        </TableRow>,

                        // 거래처 행 (중분류 펼쳤을 때)
                        ...(isMediumExpanded
                          ? medAgencies.map(({ agency, stat }) => (
                              <TableRow key={`agency-${agency.id}`}>
                                <TableCell>
                                  <div className="pl-12">
                                    <Link
                                      href={`/activations?agency=${agency.id}`}
                                      className="font-medium text-blue-600 hover:underline"
                                    >
                                      {agency.name || agency.id}
                                    </Link>
                                  </div>
                                </TableCell>
                                <StatCells stat={stat} />
                              </TableRow>
                            ))
                          : []),
                      ];
                    })
                  : []),
              ];
            })}

            {/* 미분류 거래처 */}
            {uncategorized.length > 0 && (
              <>
                {uncategorized.length > 1 ? (
                  // 미분류가 여러 개면 그룹으로 표시
                  (() => {
                    const uncatStat = sumStats(uncategorized.map((u) => u.stat));
                    const isUncatExpanded = expandedMajors.has("__uncategorized__");
                    return [
                      <TableRow
                        key="uncategorized-header"
                        className="bg-gray-50/80 cursor-pointer hover:bg-gray-100/80"
                        onClick={() => toggleMajor("__uncategorized__")}
                      >
                        <TableCell className="font-bold">
                          <div className="flex items-center gap-1">
                            {isUncatExpanded ? (
                              <ChevronDown className="size-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="size-4 text-gray-400" />
                            )}
                            <span className="text-gray-500">미분류</span>
                          </div>
                        </TableCell>
                        <StatCells stat={uncatStat} />
                      </TableRow>,
                      ...(isUncatExpanded
                        ? uncategorized.map(({ agency, stat }) => (
                            <TableRow key={`uncat-${agency.id}`}>
                              <TableCell>
                                <div className="pl-8">
                                  <Link
                                    href={`/activations?agency=${agency.id}`}
                                    className="font-medium text-blue-600 hover:underline"
                                  >
                                    {agency.name || agency.id}
                                  </Link>
                                </div>
                              </TableCell>
                              <StatCells stat={stat} />
                            </TableRow>
                          ))
                        : []),
                    ];
                  })()
                ) : (
                  // 미분류가 1개면 바로 표시
                  uncategorized.map(({ agency, stat }) => (
                    <TableRow key={`uncat-${agency.id}`}>
                      <TableCell>
                        <Link
                          href={`/activations?agency=${agency.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {agency.name || agency.id}
                        </Link>
                      </TableCell>
                      <StatCells stat={stat} />
                    </TableRow>
                  ))
                )}
              </>
            )}

            {/* 합계 행 */}
            <TableRow className="bg-gray-50 font-bold">
              <TableCell>합계</TableCell>
              <TableCell className="text-center">{totalAll.total}</TableCell>
              <TableCell className="text-center text-green-700">
                {totalAll.completed}
              </TableCell>
              <TableCell className="text-center text-yellow-700">
                {totalAll.pending}
              </TableCell>
              <TableCell className="text-center">-</TableCell>
              <TableCell className="text-center text-blue-700">
                {totalAll.working}
              </TableCell>
              <TableCell className="text-center">-</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
