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
import { AlertTriangle, ChevronDown, ChevronUp, Smartphone, FileText } from "lucide-react";

export interface SupplementStat {
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
}

export interface SupplementItem {
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
}

type SupplementTab = "all" | "mobile" | "nameChange";
type DeadlineFilter = "overdue" | "within30" | "within60" | "all";

export function SupplementPanel({
  supplementStats,
  supplementList,
}: {
  supplementStats: SupplementStat[];
  supplementList: SupplementItem[];
}) {
  const [activeTab, setActiveTab] = useState<SupplementTab>("all");
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter | null>(null);
  const [expandedAgency, setExpandedAgency] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 탭에 맞게 stats 합산
  const totals = useMemo(() => {
    const sum = (fn: (s: SupplementStat) => number) =>
      supplementStats.reduce((acc, s) => acc + Number(fn(s)), 0);

    if (activeTab === "mobile") {
      return {
        overdue: sum((s) => s.mobileOverdue),
        within30: sum((s) => s.mobileWithin30),
        within60: sum((s) => s.mobileWithin60),
        total: sum((s) => s.mobileTotal),
      };
    }
    if (activeTab === "nameChange") {
      return {
        overdue: sum((s) => s.nameChangeOverdue),
        within30: sum((s) => s.nameChangeWithin30),
        within60: sum((s) => s.nameChangeWithin60),
        total: sum((s) => s.nameChangeTotal),
      };
    }
    // all
    return {
      overdue: sum((s) => s.mobileOverdue) + sum((s) => s.nameChangeOverdue),
      within30: sum((s) => s.mobileWithin30) + sum((s) => s.nameChangeWithin30),
      within60: sum((s) => s.mobileWithin60) + sum((s) => s.nameChangeWithin60),
      total: sum((s) => s.mobileTotal) + sum((s) => s.nameChangeTotal),
    };
  }, [supplementStats, activeTab]);

  // 탭에 맞는 stats (거래처별 테이블용)
  const filteredStats = useMemo(() => {
    return supplementStats
      .map((s) => {
        if (activeTab === "mobile") {
          return {
            ...s,
            displayTotal: Number(s.mobileTotal),
            displayOverdue: Number(s.mobileOverdue),
            displayWithin30: Number(s.mobileWithin30),
            displayWithin60: Number(s.mobileWithin60),
          };
        }
        if (activeTab === "nameChange") {
          return {
            ...s,
            displayTotal: Number(s.nameChangeTotal),
            displayOverdue: Number(s.nameChangeOverdue),
            displayWithin30: Number(s.nameChangeWithin30),
            displayWithin60: Number(s.nameChangeWithin60),
          };
        }
        return {
          ...s,
          displayTotal: Number(s.mobileTotal) + Number(s.nameChangeTotal),
          displayOverdue: Number(s.mobileOverdue) + Number(s.nameChangeOverdue),
          displayWithin30: Number(s.mobileWithin30) + Number(s.nameChangeWithin30),
          displayWithin60: Number(s.mobileWithin60) + Number(s.nameChangeWithin60),
        };
      })
      .filter((s) => s.displayTotal > 0);
  }, [supplementStats, activeTab]);

  // 탭 필터링된 리스트
  const tabFilteredList = useMemo(() => {
    if (activeTab === "all") return supplementList;
    return supplementList.filter((i) => i.supplementType === activeTab);
  }, [supplementList, activeTab]);

  // 거래처별 리스트 그룹핑 (아코디언용)
  const listByAgency: Record<string, SupplementItem[]> = useMemo(() => {
    const groups: Record<string, SupplementItem[]> = {};
    tabFilteredList.forEach((item) => {
      if (!groups[item.agencyId]) groups[item.agencyId] = [];
      groups[item.agencyId].push(item);
    });
    return groups;
  }, [tabFilteredList]);

  // 기한 필터링된 리스트
  const deadlineFilteredList = useMemo(() => {
    if (!deadlineFilter) return [];
    const list = tabFilteredList;
    if (deadlineFilter === "overdue") {
      return list.filter((i) => i.daysLeft !== null && Number(i.daysLeft) < 0);
    }
    if (deadlineFilter === "within30") {
      return list.filter(
        (i) => i.daysLeft !== null && Number(i.daysLeft) >= 0 && Number(i.daysLeft) <= 30
      );
    }
    if (deadlineFilter === "within60") {
      return list.filter(
        (i) => i.daysLeft !== null && Number(i.daysLeft) > 30 && Number(i.daysLeft) <= 60
      );
    }
    // "all"
    return list;
  }, [deadlineFilter, tabFilteredList]);

  // 필터링된 리스트를 거래처별로 그룹핑
  const filteredByAgency = useMemo(() => {
    const groups: Record<string, { name: string; items: SupplementItem[] }> = {};
    deadlineFilteredList.forEach((item) => {
      if (!groups[item.agencyId]) {
        groups[item.agencyId] = { name: item.agencyName || item.agencyId, items: [] };
      }
      groups[item.agencyId].items.push(item);
    });
    return Object.entries(groups).sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [deadlineFilteredList]);

  function getDaysLeftBadge(daysLeft: number | null) {
    if (daysLeft === null) return <Badge variant="outline" className="text-gray-400">기한 미설정</Badge>;
    const d = Number(daysLeft);
    if (d < 0)
      return <Badge className="bg-red-600 text-white">{Math.abs(d)}일 초과</Badge>;
    if (d <= 7)
      return <Badge className="bg-red-100 text-red-800">D-{d}</Badge>;
    if (d <= 14)
      return <Badge className="bg-orange-100 text-orange-800">D-{d}</Badge>;
    if (d <= 30)
      return <Badge className="bg-yellow-100 text-yellow-800">D-{d}</Badge>;
    return <Badge className="bg-blue-100 text-blue-800">D-{d}</Badge>;
  }

  function getTypeBadge(type: "mobile" | "nameChange") {
    if (type === "mobile")
      return <Badge className="bg-purple-100 text-purple-800">모바일보완</Badge>;
    return <Badge className="bg-teal-100 text-teal-800">명의변경보완</Badge>;
  }

  function handleCardClick(filter: DeadlineFilter) {
    setDeadlineFilter((prev) => (prev === filter ? null : filter));
    setTimeout(() => {
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  function handleTabChange(tab: SupplementTab) {
    setActiveTab(tab);
    setDeadlineFilter(null);
    setExpandedAgency(null);
  }

  const filterLabels: Record<DeadlineFilter, string> = {
    overdue: "기한 초과",
    within30: "30일 이내",
    within60: "60일 이내",
    all: "미보완 전체",
  };

  if (totals.total === 0 && supplementList.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* 탭: 전체 / 모바일보완 / 명의변경보완 */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => handleTabChange("all")}
        >
          전체
        </button>
        <button
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "mobile" ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => handleTabChange("mobile")}
        >
          <Smartphone className="h-3.5 w-3.5" />
          모바일보완
        </button>
        <button
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "nameChange" ? "bg-white text-teal-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => handleTabChange("nameChange")}
        >
          <FileText className="h-3.5 w-3.5" />
          명의변경보완
        </button>
      </div>

      {/* 요약 카드 4개 - 클릭 가능 */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            totals.overdue > 0 ? "border-red-300 bg-red-50" : ""
          } ${deadlineFilter === "overdue" ? "ring-2 ring-red-500" : ""}`}
          onClick={() => handleCardClick("overdue")}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {totals.overdue > 0 && <AlertTriangle className="h-5 w-5 text-red-500" />}
              <p className="text-sm text-gray-600">기한 초과</p>
            </div>
            <p className="text-3xl font-bold text-red-600 mt-1">{totals.overdue}건</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            totals.within30 > 0 ? "border-orange-300 bg-orange-50" : ""
          } ${deadlineFilter === "within30" ? "ring-2 ring-orange-500" : ""}`}
          onClick={() => handleCardClick("within30")}
        >
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">30일 이내</p>
            <p className="text-3xl font-bold text-orange-600 mt-1">{totals.within30}건</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            totals.within60 > 0 ? "border-yellow-300 bg-yellow-50" : ""
          } ${deadlineFilter === "within60" ? "ring-2 ring-yellow-500" : ""}`}
          onClick={() => handleCardClick("within60")}
        >
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">60일 이내</p>
            <p className="text-3xl font-bold text-yellow-600 mt-1">{totals.within60}건</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            deadlineFilter === "all" ? "ring-2 ring-gray-500" : ""
          }`}
          onClick={() => handleCardClick("all")}
        >
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">미보완 전체</p>
            <p className="text-3xl font-bold mt-1">{totals.total}건</p>
          </CardContent>
        </Card>
      </div>

      {/* 거래처별 보완 현황 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            서류 보완 현황 (거래처별)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>거래처</TableHead>
                <TableHead className="text-center">미보완</TableHead>
                <TableHead className="text-center">기한 초과</TableHead>
                <TableHead className="text-center">30일 이내</TableHead>
                <TableHead className="text-center">60일 이내</TableHead>
                <TableHead className="text-right">상세</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStats.map((row) => {
                const isExpanded = expandedAgency === row.agencyId;
                const agencyItems = listByAgency[row.agencyId] || [];
                return (
                  <Fragment key={row.agencyId}>
                    <TableRow
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedAgency(isExpanded ? null : row.agencyId)}
                    >
                      <TableCell className="font-medium">
                        {row.agencyName || row.agencyId}
                      </TableCell>
                      <TableCell className="text-center">{row.displayTotal}</TableCell>
                      <TableCell className="text-center">
                        {row.displayOverdue > 0 ? (
                          <Badge className="bg-red-600 text-white">{row.displayOverdue}</Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.displayWithin30 > 0 ? (
                          <Badge className="bg-orange-100 text-orange-800">{row.displayWithin30}</Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.displayWithin60 > 0 ? (
                          <Badge className="bg-yellow-100 text-yellow-800">{row.displayWithin60}</Badge>
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
                        <TableCell className="pl-8 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            {item.customerName}
                            {activeTab === "all" && getTypeBadge(item.supplementType)}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm">{item.personInCharge || "-"}</TableCell>
                        <TableCell className="text-center text-sm">
                          {item.arcSupplementDeadline
                            ? new Date(item.arcSupplementDeadline).toLocaleDateString("ko-KR")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center">{getDaysLeftBadge(item.daysLeft)}</TableCell>
                        <TableCell className="text-center text-sm">
                          {item.supplementType === "nameChange" && (
                            <span className="text-xs text-gray-500">
                              명의: {item.nameChangeDocsReview || "미완료"} / ARC: {item.arcAutopayReview || "미완료"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    ))}
                  </Fragment>
                );
              })}
              {filteredStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                    해당하는 보완 건이 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 필터링된 전체 리스트 (카드 클릭 시 펼쳐짐) */}
      <div ref={listRef}>
        {deadlineFilter && deadlineFilteredList.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  {filterLabels[deadlineFilter]}
                </Badge>
                거래처별 상세 목록 ({deadlineFilteredList.length}건)
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setDeadlineFilter(null)}>
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
                        <TableHead>유형</TableHead>
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
                          <TableCell>{getTypeBadge(item.supplementType)}</TableCell>
                          <TableCell className="text-sm">{item.newPhoneNumber || "-"}</TableCell>
                          <TableCell>{item.personInCharge || "-"}</TableCell>
                          <TableCell>
                            {item.arcSupplementDeadline
                              ? new Date(item.arcSupplementDeadline).toLocaleDateString("ko-KR")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {getDaysLeftBadge(item.daysLeft)}
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

        {deadlineFilter && deadlineFilteredList.length === 0 && (
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
