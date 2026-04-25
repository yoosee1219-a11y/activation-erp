"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useDashboard } from "../dashboard-context";
import { DataTable } from "@/components/activations/data-table";
import { Filters } from "@/components/activations/filters";
import { CascadingFilter } from "@/components/layout/cascading-filter";
import {
  getColumns,
  type ActivationRow,
} from "@/components/activations/columns";
import { Button } from "@/components/ui/button";
import { Plus, Download, FolderOpen } from "lucide-react";
import { VisibilityState } from "@tanstack/react-table";
import Link from "next/link";
import { toast } from "sonner";
import {
  CustomerDetailDialog,
  type CustomerDetailData,
} from "@/components/partner/customer-detail-dialog";

const STAFF_LIST = ["권보미", "박서연", "김유림", "이아라"];

interface MonthSummary {
  month: string;
  total: number;
  completed: number;
  pending: number;
  cancelled: number;
}

export default function ActivationsPage() {
  const {
    getFilterParams,
    selectedMajors,
    selectedMediums,
    agencies,
    categories,
    user,
  } = useDashboard();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const [data, setData] = useState<ActivationRow[]>([]);
  const [, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  // 기본값: 당월 (전체 9999건 fetch 방지 — 4.3초 → ~0.5초)
  const [month, setMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [availableMonths, setAvailableMonths] = useState<MonthSummary[]>([]);
  const [localMajors, setLocalMajors] = useState<string[]>([]);
  const [localMediums, setLocalMediums] = useState<string[]>([]);
  const [detailCustomer, setDetailCustomer] =
    useState<CustomerDetailData | null>(null);

  // 책갈피 탭 상태
  const [selectedMajorTab, setSelectedMajorTab] = useState<string | null>(null);
  const [selectedMediumTab, setSelectedMediumTab] = useState<string | null>(
    null
  );

  // 대분류 탭 변경 시 중분류 탭 초기화
  useEffect(() => {
    setSelectedMediumTab(null);
  }, [selectedMajorTab]);

  const agencyMap = useMemo(() => {
    const map: Record<string, string> = {};
    agencies.forEach((a) => (map[a.id] = a.name));
    return map;
  }, [agencies]);

  // 카테고리 이름 맵
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

  // CascadingFilter (사이드 필터) 기준 1차 필터링
  const sideFilteredData = useMemo(() => {
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

  // 책갈피 탭 기준 2차 필터링
  const tabFilteredData = useMemo(() => {
    let result = sideFilteredData;
    if (selectedMediumTab) {
      result = result.filter(
        (row) => agencyMediumMap[row.agencyId] === selectedMediumTab
      );
    } else if (selectedMajorTab) {
      result = result.filter(
        (row) => agencyMajorMap[row.agencyId] === selectedMajorTab
      );
    }
    // 날짜순 (entryDate desc, null은 끝으로)
    return [...result].sort((a, b) => {
      const ad = a.entryDate || "";
      const bd = b.entryDate || "";
      if (!ad && !bd) return 0;
      if (!ad) return 1;
      if (!bd) return -1;
      return bd.localeCompare(ad);
    });
  }, [
    sideFilteredData,
    selectedMajorTab,
    selectedMediumTab,
    agencyMajorMap,
    agencyMediumMap,
  ]);

  // 대분류별 카운트 (sideFilteredData 기준)
  const majorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sideFilteredData.forEach((row) => {
      const major = agencyMajorMap[row.agencyId];
      if (major) counts[major] = (counts[major] || 0) + 1;
    });
    return counts;
  }, [sideFilteredData, agencyMajorMap]);

  // 선택된 대분류의 중분류 목록 + 카운트
  const mediumTabs = useMemo(() => {
    if (!selectedMajorTab) return [];
    const major = categories.find((c) => c.id === selectedMajorTab);
    const mediums = major?.children || [];
    const counts: Record<string, number> = {};
    sideFilteredData
      .filter((row) => agencyMajorMap[row.agencyId] === selectedMajorTab)
      .forEach((row) => {
        const m = agencyMediumMap[row.agencyId];
        if (m) counts[m] = (counts[m] || 0) + 1;
      });
    return mediums.map((m) => ({
      id: m.id,
      name: m.name,
      count: counts[m.id] || 0,
    }));
  }, [
    selectedMajorTab,
    categories,
    sideFilteredData,
    agencyMajorMap,
    agencyMediumMap,
  ]);

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
    const filterParams = getFilterParams();
    Object.entries(filterParams).forEach(([k, v]) => params.set(k, v));
    if (status !== "all") params.set("status", status);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (month && month !== "all") params.set("month", month);
    params.set("page", page.toString());
    params.set("pageSize", "9999"); // 클라이언트에서 탭 필터링하므로 전체 가져옴

    try {
      const res = await fetch(`/api/activations?${params}`);
      const result = await res.json();
      const rows = (result.data || []).map((row: ActivationRow) => ({
        ...row,
        agencyName: agencyMap[row.agencyId] || row.agencyId,
        majorCategoryName:
          categoryNameMap[agencyMajorMap[row.agencyId] || ""] || "미분류",
        mediumCategoryName:
          categoryNameMap[agencyMediumMap[row.agencyId] || ""] || "미분류",
      }));
      setData(rows);
      setTotal(result.total || 0);
    } catch {
      toast.error("데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [
    getFilterParams,
    selectedMajors,
    selectedMediums,
    agencyMap,
    agencyMajorMap,
    agencyMediumMap,
    categoryNameMap,
    status,
    dateFrom,
    dateTo,
    month,
    page,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    const password = prompt("삭제하려면 관리자 비밀번호를 입력하세요:");
    if (!password) return;
    try {
      const res = await fetch(`/api/activations/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        toast.success("삭제되었습니다.");
        fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "삭제에 실패했습니다.");
      }
    } catch {
      toast.error("삭제 중 오류가 발생했습니다.");
    }
  };

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
      "excludedFromSupplement",
    ]);
    const parsedValue: unknown = booleanFields.has(field)
      ? value === "true"
      : value;

    // 거래처 변경은 카테고리 이름까지 재매핑해야 하므로 PATCH 후 전체 재조회
    if (field === "agencyId") {
      try {
        const res = await fetch(`/api/activations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: parsedValue }),
        });
        if (!res.ok) {
          toast.error("거래처 변경 실패");
        } else {
          toast.success("거래처가 변경되었습니다.");
        }
      } catch {
        toast.error("거래처 변경 중 오류");
      }
      fetchData();
      return;
    }

    setData((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, [field]: parsedValue } : row
      )
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

  // 거래처 인라인 수정용 옵션 (활성 중분류 + 부모 대분류 이름)
  const agencyOptions = useMemo(() => {
    const opts: { id: string; name: string; parentName: string }[] = [];
    categories.forEach((major) => {
      (major.children || []).forEach((medium) => {
        opts.push({
          id: medium.id,
          name: medium.name,
          parentName: major.name,
        });
      });
    });
    return opts.sort((a, b) =>
      `${a.parentName}>${a.name}`.localeCompare(`${b.parentName}>${b.name}`)
    );
  }, [categories]);

  const columns = getColumns({
    onDelete: handleDelete,
    canDelete: user?.role === "ADMIN" || user?.role === "SUB_ADMIN",
    onInlineUpdate: user?.role !== "GUEST" ? handleInlineUpdate : undefined,
    onToggleLock: isAdmin ? handleToggleLock : undefined,
    canLock: isAdmin,
    staffList: STAFF_LIST,
    agencyOptions: isAdmin ? agencyOptions : [],
  });

  const defaultHiddenColumns: VisibilityState = {
    majorCategory: false,
    mediumCategory: false,
    usimNumber: false,
    newPhoneNumber: false,
    virtualAccount: false,
    subscriptionType: false,
    ratePlan: false,
    deviceChangeConfirmed: false,
    selectedCommitment: true,
    commitmentDate: false,
    entryDate: false,
    applicationDocs: false,
    applicationDocsReview: false,
    nameChangeDocs: false,
    nameChangeDocsReview: false,
    arcInfo: false,
    arcReview: false,
    autopayInfo: false,
    autopayReview: false,
    supplementDeadline: false,
    holdReason: false,
    terminationDate: false,
    terminationReason: false,
  };

  const handleExcelDownload = async () => {
    try {
      const params = new URLSearchParams();
      if (month && month !== "all") params.set("month", month);
      if (status && status !== "all") params.set("status", status);
      // 탭 선택을 export 필터로 전달
      if (selectedMediumTab) {
        params.set("mediumCategories", selectedMediumTab);
      } else if (selectedMajorTab) {
        params.set("majorCategories", selectedMajorTab);
      } else if (localMediums.length > 0) {
        params.set("mediumCategories", localMediums.join(","));
      } else if (localMajors.length > 0) {
        params.set("majorCategories", localMajors.join(","));
      }
      const res = await fetch(`/api/export?${params.toString()}`);
      if (!res.ok) throw new Error("다운로드 실패");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `개통관리_${month !== "all" ? month : "전체"}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("엑셀 다운로드에 실패했습니다.");
    }
  };

  // 탭 버튼 공통 (책갈피 스타일 — kpi-cards와 동일)
  const renderTab = (
    key: string,
    label: string,
    count: number,
    active: boolean,
    onClick: () => void,
    size: "lg" | "sm" = "lg"
  ) => {
    const isLg = size === "lg";
    return (
      <button
        key={key}
        type="button"
        role="tab"
        aria-selected={active}
        onClick={onClick}
        className={`group relative flex min-w-0 items-center justify-center gap-2 rounded-t-lg ${
          isLg ? "px-4 py-2.5 text-sm" : "px-3 py-1.5 text-xs"
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
            active
              ? "bg-gray-900 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          {count}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">개통 관리</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExcelDownload}>
            <Download className="h-4 w-4 mr-1" />
            엑셀 다운로드
          </Button>
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
        onStatusChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        dateFrom={dateFrom}
        onDateFromChange={(v) => {
          setDateFrom(v);
          setPage(1);
        }}
        dateTo={dateTo}
        onDateToChange={(v) => {
          setDateTo(v);
          setPage(1);
        }}
        onClear={() => {
          setStatus("all");
          setDateFrom("");
          setDateTo("");
          setMonth("all");
          setLocalMajors([]);
          setLocalMediums([]);
          setSelectedMajorTab(null);
          setSelectedMediumTab(null);
          setPage(1);
        }}
        month={month}
        onMonthChange={(v) => {
          setMonth(v);
          setPage(1);
        }}
        availableMonths={availableMonths}
      >
        <CascadingFilter
          categories={categories}
          selectedMajors={localMajors}
          selectedMediums={localMediums}
          onMajorsChange={setLocalMajors}
          onMediumsChange={setLocalMediums}
        />
      </Filters>

      {/* 책갈피 탭 — 대분류 */}
      <div className="space-y-1">
        <div
          role="tablist"
          aria-label="대분류 탭"
          className="flex flex-wrap items-end gap-1 border-b border-gray-200"
        >
          {renderTab(
            "__all__",
            "전체",
            sideFilteredData.length,
            !selectedMajorTab,
            () => setSelectedMajorTab(null),
            "lg"
          )}
          {categories.map((major) =>
            renderTab(
              major.id,
              major.name,
              majorCounts[major.id] || 0,
              selectedMajorTab === major.id,
              () => setSelectedMajorTab(major.id),
              "lg"
            )
          )}
        </div>

        {/* 책갈피 탭 — 중분류 (대분류 선택 시) */}
        {selectedMajorTab && mediumTabs.length > 0 && (
          <div
            role="tablist"
            aria-label="중분류 탭"
            className="flex flex-wrap items-end gap-1 border-b border-gray-200 pl-4"
          >
            <span className="flex items-center gap-1 pr-2 text-[11px] font-medium text-gray-400">
              <FolderOpen className="h-3 w-3" />
              중분류
            </span>
            {renderTab(
              "__major_all__",
              "전체",
              majorCounts[selectedMajorTab] || 0,
              !selectedMediumTab,
              () => setSelectedMediumTab(null),
              "sm"
            )}
            {mediumTabs.map((m) =>
              renderTab(
                m.id,
                m.name,
                m.count,
                selectedMediumTab === m.id,
                () => setSelectedMediumTab(m.id),
                "sm"
              )
            )}
          </div>
        )}
      </div>

      {/* 데이터 테이블 (날짜순 정렬됨) */}
      {loading ? (
        <div className="flex h-64 items-center justify-center text-gray-500">
          로딩 중...
        </div>
      ) : tabFilteredData.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/50 text-sm text-gray-400">
          해당 조건의 데이터가 없습니다.
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={tabFilteredData}
          total={tabFilteredData.length}
          page={page}
          pageSize={50}
          onPageChange={setPage}
          searchPlaceholder="가입번호/고객명/신규번호 검색..."
          highlightId={highlightId}
          getRowId={(row: ActivationRow) => row.id}
          getRowClassName={(row: ActivationRow) => {
            const isArc = row.activationMethod === "외국인등록증";
            const requiredDocs = isArc
              ? [row.applicationDocs, row.autopayInfo]
              : [
                  row.applicationDocs,
                  row.nameChangeDocs,
                  row.arcInfo,
                  row.autopayInfo,
                ];
            const requiredReviews = isArc
              ? [row.applicationDocsReview, row.autopayReview]
              : [
                  row.applicationDocsReview,
                  row.nameChangeDocsReview,
                  row.arcReview,
                  row.autopayReview,
                ];
            if (requiredReviews.every((r) => r === "완료")) {
              return "bg-green-50/80 hover:bg-green-100/80";
            }
            const hasIssue =
              row.workStatus === "보완요청" ||
              requiredReviews.some((r) => r === "보완요청") ||
              requiredDocs.some((d) => !d);
            return hasIssue ? "bg-red-50/70 hover:bg-red-100/70" : "";
          }}
          onRowClick={(row: ActivationRow) =>
            setDetailCustomer(row as unknown as CustomerDetailData)
          }
          initialColumnVisibility={defaultHiddenColumns}
        />
      )}

      <CustomerDetailDialog
        open={!!detailCustomer}
        onClose={() => setDetailCustomer(null)}
        customer={detailCustomer}
        onUpdate={
          user?.role !== "GUEST"
            ? (id, field, value) => {
                handleInlineUpdate(id, field, value);
                setDetailCustomer((prev) =>
                  prev ? { ...prev, [field]: value } : null
                );
              }
            : undefined
        }
        staffList={STAFF_LIST}
        isAdmin={isAdmin}
      />
    </div>
  );
}
