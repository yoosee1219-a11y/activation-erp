"use client";

import { Fragment, useRef, useState, useMemo } from "react";
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
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

interface ArcStat {
  agencyId: string;
  agencyName: string | null;
  unresolved: number;
  urgentCount: number;
  overdueCount: number;
}

interface ArcUrgentItem {
  id: string;
  agencyId: string;
  agencyName: string | null;
  customerName: string;
  newPhoneNumber: string | null;
  personInCharge: string | null;
  arcSupplementDeadline: string;
  daysLeft: number;
}

type ListFilter = "all" | "overdue" | "urgent";

export function ArcUrgentPanel({
  arcStats,
  urgentList,
}: {
  arcStats: ArcStat[];
  urgentList: ArcUrgentItem[];
}) {
  const [expandedAgency, setExpandedAgency] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState<ListFilter | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const totalUrgent = arcStats.reduce((s, r) => s + Number(r.urgentCount), 0);
  const totalOverdue = arcStats.reduce((s, r) => s + Number(r.overdueCount), 0);
  const totalUnresolved = arcStats.reduce((s, r) => s + Number(r.unresolved), 0);

  // 거래처별 긴급 리스트 그룹핑
  const urgentByAgency: Record<string, ArcUrgentItem[]> = {};
  urgentList.forEach((item) => {
    if (!urgentByAgency[item.agencyId]) urgentByAgency[item.agencyId] = [];
    urgentByAgency[item.agencyId].push(item);
  });

  // 필터링된 리스트
  const filteredList = useMemo(() => {
    if (!listFilter) return [];
    if (listFilter === "overdue") return urgentList.filter((i) => Number(i.daysLeft) < 0);
    if (listFilter === "urgent") return urgentList;
    return urgentList;
  }, [listFilter, urgentList]);

  // 필터링된 리스트를 거래처별로 그룹핑
  const filteredByAgency = useMemo(() => {
    const groups: Record<string, { name: string; items: ArcUrgentItem[] }> = {};
    filteredList.forEach((item) => {
      if (!groups[item.agencyId]) {
        groups[item.agencyId] = { name: item.agencyName || item.agencyId, items: [] };
      }
      groups[item.agencyId].items.push(item);
    });
    return Object.entries(groups).sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [filteredList]);

  function getDaysLeftBadge(daysLeft: number) {
    if (daysLeft < 0)
      return <Badge className="bg-red-600 text-white">{Math.abs(daysLeft)}일 초과</Badge>;
    if (daysLeft <= 7)
      return <Badge className="bg-red-100 text-red-800">D-{daysLeft}</Badge>;
    if (daysLeft <= 14)
      return <Badge className="bg-orange-100 text-orange-800">D-{daysLeft}</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800">D-{daysLeft}</Badge>;
  }

  function handleCardClick(filter: ListFilter) {
    setListFilter((prev) => (prev === filter ? null : filter));
    setTimeout(() => {
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  const filterLabels: Record<ListFilter, string> = {
    overdue: "기한 초과",
    urgent: "30일 이내 기한",
    all: "미보완 전체",
  };

  if (totalUnresolved === 0 && urgentList.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* 요약 카드 - 클릭 가능 */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            totalOverdue > 0 ? "border-red-300 bg-red-50" : ""
          } ${listFilter === "overdue" ? "ring-2 ring-red-500" : ""}`}
          onClick={() => handleCardClick("overdue")}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {totalOverdue > 0 && <AlertTriangle className="h-5 w-5 text-red-500" />}
              <p className="text-sm text-gray-600">기한 초과</p>
            </div>
            <p className="text-3xl font-bold text-red-600 mt-1">{totalOverdue}건</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            totalUrgent > 0 ? "border-orange-300 bg-orange-50" : ""
          } ${listFilter === "urgent" ? "ring-2 ring-orange-500" : ""}`}
          onClick={() => handleCardClick("urgent")}
        >
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">30일 이내 기한</p>
            <p className="text-3xl font-bold text-orange-600 mt-1">{totalUrgent}건</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            listFilter === "all" ? "ring-2 ring-gray-500" : ""
          }`}
          onClick={() => handleCardClick("all")}
        >
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">미보완 전체</p>
            <p className="text-3xl font-bold mt-1">{totalUnresolved}건</p>
          </CardContent>
        </Card>
      </div>

      {/* 거래처별 미보완 현황 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            외국인등록증 보완 현황 (거래처별)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>거래처</TableHead>
                <TableHead className="text-center">미보완</TableHead>
                <TableHead className="text-center">30일 이내</TableHead>
                <TableHead className="text-center">기한 초과</TableHead>
                <TableHead className="text-right">상세</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {arcStats.map((row) => {
                const isExpanded = expandedAgency === row.agencyId;
                const agencyItems = urgentByAgency[row.agencyId] || [];
                return (
                  <Fragment key={row.agencyId}>
                    <TableRow
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedAgency(isExpanded ? null : row.agencyId)}
                    >
                      <TableCell className="font-medium">
                        {row.agencyName || row.agencyId}
                      </TableCell>
                      <TableCell className="text-center">{row.unresolved}</TableCell>
                      <TableCell className="text-center">
                        {Number(row.urgentCount) > 0 ? (
                          <Badge className="bg-orange-100 text-orange-800">{row.urgentCount}</Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {Number(row.overdueCount) > 0 ? (
                          <Badge className="bg-red-600 text-white">{row.overdueCount}</Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {agencyItems.length > 0 && (
                          <Button variant="ghost" size="sm">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    {isExpanded && agencyItems.map((item) => (
                      <TableRow key={item.id} className="bg-orange-50/50">
                        <TableCell className="pl-8 text-sm text-gray-600">{item.customerName}</TableCell>
                        <TableCell className="text-center text-sm">{item.personInCharge || "-"}</TableCell>
                        <TableCell className="text-center text-sm">
                          {item.arcSupplementDeadline
                            ? new Date(item.arcSupplementDeadline).toLocaleDateString("ko-KR")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center">{getDaysLeftBadge(Number(item.daysLeft))}</TableCell>
                        <TableCell />
                      </TableRow>
                    ))}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 필터링된 전체 리스트 (카드 클릭 시 펼쳐짐) */}
      <div ref={listRef}>
        {listFilter && filteredList.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  {filterLabels[listFilter]}
                </Badge>
                거래처별 상세 목록 ({filteredList.length}건)
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setListFilter(null)}>
                닫기
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {filteredByAgency.map(([agencyId, group]) => (
                <div key={agencyId}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-base">{group.name}</h3>
                    <Badge variant="secondary">{group.items.length}건</Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>고객명</TableHead>
                        <TableHead>번호</TableHead>
                        <TableHead>담당자</TableHead>
                        <TableHead>보완 기한</TableHead>
                        <TableHead className="text-center">남은 일수</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.customerName}</TableCell>
                          <TableCell className="text-sm">{item.newPhoneNumber || "-"}</TableCell>
                          <TableCell>{item.personInCharge || "-"}</TableCell>
                          <TableCell>
                            {new Date(item.arcSupplementDeadline).toLocaleDateString("ko-KR")}
                          </TableCell>
                          <TableCell className="text-center">
                            {getDaysLeftBadge(Number(item.daysLeft))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {listFilter && filteredList.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              해당하는 건이 없습니다.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
