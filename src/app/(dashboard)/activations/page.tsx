"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useDashboard } from "../layout";
import { DataTable } from "@/components/activations/data-table";
import { Filters } from "@/components/activations/filters";
import { CascadingFilter } from "@/components/layout/cascading-filter";
import {
  getColumns,
  type ActivationRow,
} from "@/components/activations/columns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, List, LayoutGrid, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const STAFF_LIST = ["권보미", "박서연", "김유림", "이아라"];

interface MonthSummary {
  month: string;
  total: number;
  completed: number;
  pending: number;
  cancelled: number;
}

type AgencyGroup = {
  name: string;
  rows: ActivationRow[];
  counts: Record<string, number>;
};

type CategoryGroup = {
  categoryName: string;
  agencies: [string, AgencyGroup][];
  totalRows: number;
};

export default function ActivationsPage() {
  const { getFilterParams, selectedMajors, selectedMediums, agencies, categories, user } = useDashboard();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const [data, setData] = useState<ActivationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [month, setMonth] = useState("all");
  const [availableMonths, setAvailableMonths] = useState<MonthSummary[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "grouped">(highlightId ? "list" : "grouped");
  const [selectedAgency, setSelectedAgency] = useState<string | null>(null);
  const [localMajors, setLocalMajors] = useState<string[]>([]);
  const [localMediums, setLocalMediums] = useState<string[]>([]);

  const agencyMap = useMemo(() => {
    const map: Record<string, string> = {};
    agencies.forEach((a) => (map[a.id] = a.name));
    return map;
  }, [agencies]);

  // 카테고리 이름 맵 (중분류 id → 표시명)
  const categoryNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((major) => {
      map[major.id] = major.name;
      (major.children || []).forEach((medium) => {
        map[medium.id] = medium.name;
      });
    });
    return map;
  }, [categories]);

  // 거래처 → 대분류 매핑
  const agencyMajorMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    agencies.forEach((a) => {
      map[a.id] = a.majorCategory || null;
    });
    return map;
  }, [agencies]);

  // 거래처 → 중분류 매핑
  const agencyMediumMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    agencies.forEach((a) => {
      map[a.id] = a.mediumCategory || null;
    });
    return map;
  }, [agencies]);

  // 인페이지 카테고리 필터 적용
  const filteredData = useMemo(() => {
    let result = data;
    if (localMediums.length > 0) {
      result = result.filter((row) => {
        const mediumCat = agencyMediumMap[row.agencyId];
        return mediumCat ? localMediums.includes(mediumCat) : false;
      });
    } else if (localMajors.length > 0) {
      result = result.filter((row) => {
        const majorCat = agencyMajorMap[row.agencyId];
        return majorCat ? localMajors.includes(majorCat) : false;
      });
    }
    return result;
  }, [data, localMajors, localMediums, agencyMajorMap, agencyMediumMap]);

  // 월 요약 데이터 로드
  useEffect(() => {
    async function loadMonths() {
      try {
        const res = await fetch("/api/activations/months");
        const result = await res.json();
        setAvailableMonths(result.months || []);
      } catch {
        // 실패해도 무시
      }
    }
    loadMonths();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    // getFilterParams()로 카테고리/거래처 필터 적용
    const filterParams = getFilterParams();
    Object.entries(filterParams).forEach(([k, v]) => params.set(k, v));
    if (status !== "all") params.set("status", status);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (month && month !== "all") params.set("month", month);
    params.set("page", page.toString());
    params.set("pageSize", viewMode === "grouped" ? "9999" : "200");

    try {
      const res = await fetch(`/api/activations?${params}`);
      const result = await res.json();
      const rows = (result.data || []).map((row: ActivationRow) => ({
        ...row,
        agencyName: agencyMap[row.agencyId] || row.agencyId,
        majorCategoryName: categoryNameMap[agencyMajorMap[row.agencyId] || ""] || "미분류",
        mediumCategoryName: categoryNameMap[agencyMediumMap[row.agencyId] || ""] || "미분류",
      }));
      setData(rows);
      setTotal(result.total || 0);
    } catch {
      toast.error("데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [getFilterParams, selectedMajors, selectedMediums, agencyMap, agencyMajorMap, agencyMediumMap, categoryNameMap, status, dateFrom, dateTo, month, page, viewMode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/activations/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("삭제되었습니다.");
        fetchData();
      } else toast.error("삭제에 실패했습니다.");
    } catch {
      toast.error("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleInlineUpdate = async (
    id: string,
    field: string,
    value: string
  ) => {
    // Boolean 필드 변환
    const booleanFields = new Set(["deviceChangeConfirmed", "selectedCommitment", "autopayRegistered", "combinedUnitNameChange", "billingAccountNameChange"]);
    const parsedValue: unknown = booleanFields.has(field)
      ? value === "true"
      : value;

    setData((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: parsedValue } : row))
    );
    try {
      const res = await fetch(`/api/activations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: parsedValue }),
      });
      if (!res.ok) {
        toast.error("수정에 실패했습니다.");
        fetchData();
      }
    } catch {
      toast.error("수정 중 오류가 발생했습니다.");
      fetchData();
    }
  };

  const handleToggleLock = async (id: string, lock: boolean) => {
    setData((prev) =>
      prev.map((row) => (row.id === id ? { ...row, isLocked: lock } : row))
    );
    try {
      const res = await fetch("/api/activations/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activationIds: [id], lock }),
      });
      if (res.ok) {
        toast.success(lock ? "잠금 처리되었습니다." : "잠금 해제되었습니다.");
      } else {
        toast.error("잠금 처리에 실패했습니다.");
        fetchData();
      }
    } catch {
      toast.error("잠금 처리 중 오류가 발생했습니다.");
      fetchData();
    }
  };

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUB_ADMIN";

  const columns = getColumns({
    onDelete: handleDelete,
    canDelete: user?.role === "ADMIN",
    onInlineUpdate: user?.role !== "GUEST" ? handleInlineUpdate : undefined,
    onToggleLock: isAdmin ? handleToggleLock : undefined,
    canLock: isAdmin,
    staffList: STAFF_LIST,
  });

  // 2단계 그룹핑: 대분류 → 중분류
  const twoLevelGrouped = useMemo(() => {
    // 1단계: 중분류별 그룹
    const mediumGroups: Record<string, AgencyGroup> = {};
    filteredData.forEach((row) => {
      const mediumCat = agencyMediumMap[row.agencyId] || "__uncategorized__";
      if (!mediumGroups[mediumCat]) {
        mediumGroups[mediumCat] = {
          name: categoryNameMap[mediumCat] || "미분류",
          rows: [],
          counts: { "입력중": 0, "개통요청": 0, "진행중": 0, "개통완료": 0, "보완요청": 0 },
        };
      }
      mediumGroups[mediumCat].rows.push(row);
      const ws = row.workStatus || "입력중";
      if (ws in mediumGroups[mediumCat].counts) {
        mediumGroups[mediumCat].counts[ws]++;
      }
    });

    // 2단계: 대분류별 중분류 그룹
    const catGroups: Record<string, CategoryGroup> = {};
    Object.entries(mediumGroups).forEach(([mediumId, group]) => {
      // 중분류에서 대분류 찾기: agencies 중 해당 mediumCategory를 가진 agency의 majorCategory
      const sampleAgency = agencies.find((a) => a.mediumCategory === mediumId);
      const majorCat = sampleAgency?.majorCategory || "__uncategorized__";
      if (!catGroups[majorCat]) {
        catGroups[majorCat] = {
          categoryName:
            majorCat === "__uncategorized__"
              ? "미분류"
              : categoryNameMap[majorCat] || majorCat,
          agencies: [],
          totalRows: 0,
        };
      }
      catGroups[majorCat].agencies.push([mediumId, group]);
      catGroups[majorCat].totalRows += group.rows.length;
    });

    // 중분류 이름순 정렬
    Object.values(catGroups).forEach((g) =>
      g.agencies.sort((a, b) => a[1].name.localeCompare(b[1].name))
    );

    // 분류 있는 것 먼저, 미분류 나중
    return Object.entries(catGroups).sort((a, b) => {
      if (a[0] === "__uncategorized__") return 1;
      if (b[0] === "__uncategorized__") return -1;
      return a[1].categoryName.localeCompare(b[1].categoryName);
    });
  }, [filteredData, agencyMediumMap, categoryNameMap, agencies]);

  // 카테고리 존재 여부 (카테고리가 없으면 기존 flat 그룹 뷰)
  const hasCategories = categories.length > 0;

  // flat 그룹 (카테고리 없을 때 or 전체 agency 목록)
  const flatGrouped = useMemo(() => {
    const allAgencies: [string, AgencyGroup][] = [];
    twoLevelGrouped.forEach(([, catGroup]) => {
      allAgencies.push(...catGroup.agencies);
    });
    return allAgencies;
  }, [twoLevelGrouped]);

  // 선택된 거래처 필터링
  const filteredFlat = selectedAgency
    ? flatGrouped.filter(([id]) => id === selectedAgency)
    : flatGrouped;

  const handleCardClick = (agencyId: string) => {
    setSelectedAgency((prev) => (prev === agencyId ? null : agencyId));
  };

  // 현재 선택 월의 요약 정보
  const currentMonthSummary = useMemo(() => {
    if (month && month !== "all") {
      return availableMonths.find((m) => m.month === month);
    }
    return {
      month: "all",
      total: availableMonths.reduce((s, m) => s + Number(m.total), 0),
      completed: availableMonths.reduce((s, m) => s + Number(m.completed), 0),
      pending: availableMonths.reduce((s, m) => s + Number(m.pending), 0),
      cancelled: availableMonths.reduce((s, m) => s + Number(m.cancelled), 0),
    };
  }, [month, availableMonths]);

  // 상태 뱃지 렌더링 헬퍼
  const renderStatusBadges = (counts: Record<string, number>) => (
    <>
      {counts["입력중"] > 0 && (
        <Badge className="bg-gray-100 text-gray-700 text-[10px]">
          입력중 {counts["입력중"]}
        </Badge>
      )}
      {counts["개통요청"] > 0 && (
        <Badge className="bg-blue-100 text-blue-700 text-[10px]">
          개통요청 {counts["개통요청"]}
        </Badge>
      )}
      {counts["진행중"] > 0 && (
        <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">
          진행중 {counts["진행중"]}
        </Badge>
      )}
      {counts["개통완료"] > 0 && (
        <Badge className="bg-green-100 text-green-700 text-[10px]">
          개통완료 {counts["개통완료"]}
        </Badge>
      )}
      {counts["보완요청"] > 0 && (
        <Badge className="bg-red-100 text-red-700 text-[10px]">
          보완요청 {counts["보완요청"]}
        </Badge>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">개통 관리</h1>
          {currentMonthSummary && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-500">
                {month && month !== "all"
                  ? `${month.split("-")[0]}년 ${parseInt(month.split("-")[1])}월`
                  : "전체"}
              </span>
              <Badge variant="secondary">{Number(currentMonthSummary.total)}건</Badge>
              {Number(currentMonthSummary.completed) > 0 && (
                <Badge className="bg-green-100 text-green-700 text-[10px]">
                  개통완료 {Number(currentMonthSummary.completed)}
                </Badge>
              )}
              {Number(currentMonthSummary.pending) > 0 && (
                <Badge className="bg-blue-100 text-blue-700 text-[10px]">
                  대기 {Number(currentMonthSummary.pending)}
                </Badge>
              )}
              {Number(currentMonthSummary.cancelled) > 0 && (
                <Badge className="bg-red-100 text-red-700 text-[10px]">
                  취소 {Number(currentMonthSummary.cancelled)}
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            <Button
              variant={viewMode === "grouped" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grouped")}
              className="rounded-r-none"
            >
              <LayoutGrid className="mr-1 h-4 w-4" />
              거래처별
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List className="mr-1 h-4 w-4" />
              전체목록
            </Button>
          </div>
          {user?.role !== "GUEST" && (
            <Button asChild>
              <Link href="/activations/new">
                <Plus className="mr-2 h-4 w-4" />
                새 개통 등록
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Filters
        status={status}
        onStatusChange={(v) => { setStatus(v); setPage(1); }}
        dateFrom={dateFrom}
        onDateFromChange={(v) => { setDateFrom(v); setPage(1); }}
        dateTo={dateTo}
        onDateToChange={(v) => { setDateTo(v); setPage(1); }}
        onClear={() => { setStatus("all"); setDateFrom(""); setDateTo(""); setMonth("all"); setPage(1); }}
        month={month}
        onMonthChange={(v) => { setMonth(v); setPage(1); }}
        availableMonths={availableMonths}
      />

      {/* 인페이지 대분류/중분류 필터 */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-600">분류 필터</span>
        <CascadingFilter
          categories={categories}
          selectedMajors={localMajors}
          selectedMediums={localMediums}
          onMajorsChange={setLocalMajors}
          onMediumsChange={(ids) => {
            setLocalMediums(ids);
          }}
        />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-gray-500">
          로딩 중...
        </div>
      ) : viewMode === "list" ? (
        <DataTable
          columns={columns}
          data={filteredData}
          total={filteredData.length}
          page={page}
          pageSize={200}
          onPageChange={setPage}
          searchPlaceholder="고객명으로 검색..."
          highlightId={highlightId}
          getRowId={(row: ActivationRow) => row.id}
          getRowClassName={(row: ActivationRow) => {
            const hasSupp =
              row.workStatus === "보완요청" ||
              row.applicationDocsReview === "보완요청" ||
              row.nameChangeDocsReview === "보완요청" ||
              row.arcReview === "보완요청" ||
              row.autopayReview === "보완요청";
            return hasSupp ? "bg-red-50/70" : "";
          }}
        />
      ) : (
        <div className="space-y-4">
          {/* 선택 해제 버튼 */}
          {selectedAgency && (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-sm px-3 py-1">
                {categoryNameMap[selectedAgency] || agencyMap[selectedAgency] || selectedAgency}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAgency(null)}
              >
                <X className="mr-1 h-4 w-4" />
                전체 보기
              </Button>
            </div>
          )}

          {/* 2단계 그룹 카드: 대분류 → 중분류 */}
          {hasCategories ? (
            twoLevelGrouped.map(([catId, catGroup]) => (
              <div key={catId}>
                {/* 대분류 헤더 */}
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                    {catGroup.categoryName}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {catGroup.totalRows}건
                  </Badge>
                </div>
                {/* 해당 대분류의 중분류 카드들 */}
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 mb-3">
                  {catGroup.agencies.map(([agencyId, group]) => (
                    <Card
                      key={agencyId}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedAgency === agencyId
                          ? "ring-2 ring-blue-500 shadow-md"
                          : selectedAgency
                          ? "opacity-40"
                          : ""
                      }`}
                      onClick={() => handleCardClick(agencyId)}
                    >
                      <CardContent className="p-3">
                        <p className="font-semibold text-sm truncate">
                          {group.name}
                        </p>
                        <p className="text-2xl font-bold mt-1">
                          {group.rows.length}건
                        </p>
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {renderStatusBadges(group.counts)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          ) : (
            /* 카테고리 없을 때: 기존 flat 카드 */
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {flatGrouped.map(([agencyId, group]) => (
                <Card
                  key={agencyId}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedAgency === agencyId
                      ? "ring-2 ring-blue-500 shadow-md"
                      : selectedAgency
                      ? "opacity-40"
                      : ""
                  }`}
                  onClick={() => handleCardClick(agencyId)}
                >
                  <CardContent className="p-3">
                    <p className="font-semibold text-sm truncate">
                      {group.name}
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      {group.rows.length}건
                    </p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {renderStatusBadges(group.counts)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 중분류별 테이블 (선택된 중분류만 or 전체) */}
          {filteredFlat.map(([agencyId, group]) => (
            <div key={agencyId}>
              <div className="flex items-center gap-3 mb-2 mt-4">
                <h2 className="text-lg font-semibold">{group.name}</h2>
                <Badge variant="secondary">{group.rows.length}건</Badge>
                {renderStatusBadges(group.counts)}
              </div>
              <DataTable
                columns={columns}
                data={group.rows}
                pageSize={20}
                searchPlaceholder="고객명으로 검색..."
                highlightId={highlightId}
                getRowId={(row: ActivationRow) => row.id}
                getRowClassName={(row: ActivationRow) => {
                  const hasSupp =
                    row.workStatus === "보완요청" ||
                    row.applicationDocsReview === "보완요청" ||
                    row.nameChangeDocsReview === "보완요청" ||
                    row.arcReview === "보완요청" ||
                    row.autopayReview === "보완요청";
                  return hasSupp ? "bg-red-50/70" : "";
                }}
              />
            </div>
          ))}

          {filteredFlat.length === 0 && (
            <div className="flex h-32 items-center justify-center text-gray-500">
              데이터가 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
