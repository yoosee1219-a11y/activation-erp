"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Smartphone, FileText } from "lucide-react";
import { BookmarkTab, BookmarkTabsBar } from "@/components/ui/bookmark-tabs";

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
type DeadlineFilter = "all" | "overdue" | "within30" | "within60";

export function SupplementPanel({
  supplementStats,
  supplementList,
}: {
  supplementStats: SupplementStat[];
  supplementList: SupplementItem[];
}) {
  // 3단 책갈피: 종류 → 기한 → 거래처
  const [activeTab, setActiveTab] = useState<SupplementTab>("all");
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>("all");
  const [selectedAgency, setSelectedAgency] = useState<string | null>(null);

  // 종류 변경 시 하위 탭 초기화
  useEffect(() => {
    setSelectedAgency(null);
  }, [activeTab, deadlineFilter]);

  // 1단 — 종류별 카운트
  const tabCounts = useMemo(() => {
    const m = supplementStats.reduce((s, r) => s + Number(r.mobileTotal), 0);
    const n = supplementStats.reduce((s, r) => s + Number(r.nameChangeTotal), 0);
    return { all: m + n, mobile: m, nameChange: n };
  }, [supplementStats]);

  // 종류 필터 적용된 list
  const tabFilteredList = useMemo(() => {
    if (activeTab === "all") return supplementList;
    return supplementList.filter((i) => i.supplementType === activeTab);
  }, [supplementList, activeTab]);

  // 2단 — 기한 카운트
  const deadlineCounts = useMemo(() => {
    let overdue = 0,
      within30 = 0,
      within60 = 0;
    tabFilteredList.forEach((i) => {
      if (i.daysLeft === null) return;
      const d = Number(i.daysLeft);
      if (d < 0) overdue++;
      else if (d <= 30) within30++;
      else if (d <= 60) within60++;
    });
    return {
      all: tabFilteredList.length,
      overdue,
      within30,
      within60,
    };
  }, [tabFilteredList]);

  // 기한 필터 적용된 list
  const deadlineFilteredList = useMemo(() => {
    if (deadlineFilter === "all") return tabFilteredList;
    return tabFilteredList.filter((i) => {
      if (i.daysLeft === null) return false;
      const d = Number(i.daysLeft);
      if (deadlineFilter === "overdue") return d < 0;
      if (deadlineFilter === "within30") return d >= 0 && d <= 30;
      if (deadlineFilter === "within60") return d > 30 && d <= 60;
      return true;
    });
  }, [tabFilteredList, deadlineFilter]);

  // 3단 — 거래처별 카운트 + 정렬
  const agencyTabs = useMemo(() => {
    const m = new Map<string, { name: string; count: number }>();
    deadlineFilteredList.forEach((item) => {
      const cur = m.get(item.agencyId) || {
        name: item.agencyName || item.agencyId,
        count: 0,
      };
      cur.count += 1;
      m.set(item.agencyId, cur);
    });
    return Array.from(m.entries())
      .map(([id, v]) => ({ id, name: v.name, count: v.count }))
      .sort((a, b) => b.count - a.count);
  }, [deadlineFilteredList]);

  // 본문에 표시할 고객 리스트
  const visibleItems = useMemo(() => {
    if (selectedAgency)
      return deadlineFilteredList.filter((i) => i.agencyId === selectedAgency);
    return deadlineFilteredList;
  }, [deadlineFilteredList, selectedAgency]);

  if (tabCounts.all === 0 && supplementList.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* 1단: 보완 종류 */}
      <BookmarkTabsBar>
        <BookmarkTab
          active={activeTab === "all"}
          onClick={() => {
            setActiveTab("all");
            setDeadlineFilter("all");
          }}
          label="전체"
          count={tabCounts.all}
        />
        <BookmarkTab
          active={activeTab === "mobile"}
          onClick={() => {
            setActiveTab("mobile");
            setDeadlineFilter("all");
          }}
          label="모바일보완"
          count={tabCounts.mobile}
          icon={<Smartphone className="h-3.5 w-3.5" />}
        />
        <BookmarkTab
          active={activeTab === "nameChange"}
          onClick={() => {
            setActiveTab("nameChange");
            setDeadlineFilter("all");
          }}
          label="명의변경보완"
          count={tabCounts.nameChange}
          icon={<FileText className="h-3.5 w-3.5" />}
        />
      </BookmarkTabsBar>

      {/* 2단: 기한 */}
      {tabCounts[activeTab] > 0 && (
        <BookmarkTabsBar indented label="기한">
          <BookmarkTab
            size="sm"
            active={deadlineFilter === "all"}
            onClick={() => setDeadlineFilter("all")}
            label="전체"
            count={deadlineCounts.all}
          />
          <BookmarkTab
            size="sm"
            active={deadlineFilter === "overdue"}
            onClick={() => setDeadlineFilter("overdue")}
            label="기한초과"
            count={deadlineCounts.overdue}
          />
          <BookmarkTab
            size="sm"
            active={deadlineFilter === "within30"}
            onClick={() => setDeadlineFilter("within30")}
            label="30일 이내"
            count={deadlineCounts.within30}
          />
          <BookmarkTab
            size="sm"
            active={deadlineFilter === "within60"}
            onClick={() => setDeadlineFilter("within60")}
            label="60일 이내"
            count={deadlineCounts.within60}
          />
        </BookmarkTabsBar>
      )}

      {/* 3단: 거래처 (해당 기한에 거래처가 2개 이상일 때만) */}
      {agencyTabs.length > 1 && (
        <BookmarkTabsBar indented label="거래처">
          <BookmarkTab
            size="sm"
            active={!selectedAgency}
            onClick={() => setSelectedAgency(null)}
            label="전체"
            count={agencyTabs.reduce((s, a) => s + a.count, 0)}
          />
          {agencyTabs.map((a) => (
            <BookmarkTab
              key={a.id}
              size="sm"
              active={selectedAgency === a.id}
              onClick={() => setSelectedAgency(a.id)}
              label={a.name}
              count={a.count}
            />
          ))}
        </BookmarkTabsBar>
      )}

      {/* 본문: 활성 탭의 고객 리스트 */}
      {visibleItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 py-12 text-center text-sm text-gray-400">
          해당 조건의 보완 건이 없습니다.
        </div>
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>고객명</TableHead>
                {activeTab === "all" && <TableHead>유형</TableHead>}
                <TableHead>번호</TableHead>
                <TableHead>담당자</TableHead>
                <TableHead>보완 기한</TableHead>
                <TableHead className="text-center">남은 일수</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.customerName}
                  </TableCell>
                  {activeTab === "all" && (
                    <TableCell>{getTypeBadge(item.supplementType)}</TableCell>
                  )}
                  <TableCell className="text-sm">
                    {item.newPhoneNumber || "-"}
                  </TableCell>
                  <TableCell>{item.personInCharge || "-"}</TableCell>
                  <TableCell className="text-sm">
                    {item.arcSupplementDeadline
                      ? new Date(item.arcSupplementDeadline).toLocaleDateString(
                          "ko-KR"
                        )
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
      )}
    </div>
  );
}

function getDaysLeftBadge(daysLeft: number | null) {
  if (daysLeft === null)
    return (
      <Badge variant="outline" className="text-gray-400">
        기한 미설정
      </Badge>
    );
  const d = Number(daysLeft);
  if (d < 0)
    return <Badge className="bg-red-600 text-white">{Math.abs(d)}일 초과</Badge>;
  if (d <= 7) return <Badge className="bg-red-100 text-red-800">D-{d}</Badge>;
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
