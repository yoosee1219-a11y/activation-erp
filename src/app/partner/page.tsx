"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAgencyFilter } from "@/hooks/use-agency-filter";
import { DataTable } from "@/components/activations/data-table";
import {
  getPartnerColumns,
  type PartnerActivationRow,
} from "@/components/partner/partner-columns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Clock, CheckCircle2, Loader2, RotateCcw, X, RefreshCw, FileEdit, Package, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { SupplementPanel } from "@/components/dashboard/supplement-panel";
import type { SupplementStat, SupplementItem } from "@/components/dashboard/supplement-panel";

type WorkStatusFilter = "입력중" | "개통요청" | "진행중" | "개통완료" | "보완요청" | null;

interface UsimAgencyStats {
  agencyId: string;
  agencyName: string;
  totalAssigned: number;
  currentStock: number;
  used: number;
  cancelled: number;
  resetReady: number;
}

export default function PartnerPage() {
  const { user } = useAuth();
  const { agencies, categories } = useAgencyFilter();
  const [data, setData] = useState<PartnerActivationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState("all");
  const [statusFilter, setStatusFilter] = useState<WorkStatusFilter>(null);

  // 유심 재고 현황
  const [usimStats, setUsimStats] = useState<UsimAgencyStats[]>([]);
  const [usimExpanded, setUsimExpanded] = useState(false);

  // 서류 보완 현황
  const [supplementStats, setSupplementStats] = useState<SupplementStat[]>([]);
  const [supplementList, setSupplementList] = useState<SupplementItem[]>([]);

  // 카테고리 기반 필터 상태
  const [selectedMediumCategories, setSelectedMediumCategories] = useState<string[]>([]);
  const [categoryFilterInitialized, setCategoryFilterInitialized] = useState(false);

  // 카테고리 기반 접근인지 판별
  const hasCategoryAccess = useMemo(() => {
    return !!user?.allowedMajorCategory;
  }, [user]);

  // 사용자의 허용된 중분류 목록
  const allowedMediumCats = useMemo(() => {
    if (!user?.allowedMajorCategory || !categories.length) return [];
    const majorNode = categories.find((c) => c.id === user.allowedMajorCategory);
    if (!majorNode?.children) return [];
    // allowedMediumCategories가 비어있으면 해당 대분류의 전체 중분류
    if (!user.allowedMediumCategories.length) return majorNode.children;
    return majorNode.children.filter((c) => user.allowedMediumCategories.includes(c.id));
  }, [user, categories]);

  // 카테고리 필터 초기화 (전체 선택)
  useEffect(() => {
    if (hasCategoryAccess && allowedMediumCats.length > 0 && !categoryFilterInitialized) {
      setSelectedMediumCategories(allowedMediumCats.map((c) => c.id));
      setCategoryFilterInitialized(true);
    }
  }, [hasCategoryAccess, allowedMediumCats, categoryFilterInitialized]);

  // 허용된 거래처 목록 (직접 배정 방식)
  const allowedAgencies = useMemo(() => {
    if (!user) return [];
    if (hasCategoryAccess) return agencies; // 카테고리 기반이면 agencies API가 이미 필터링
    if (user.allowedAgencies.includes("ALL")) return agencies;
    return agencies.filter((a) => user.allowedAgencies.includes(a.id));
  }, [user, agencies, hasCategoryAccess]);

  // 대분류 이름
  const majorCategoryName = useMemo(() => {
    if (!user?.allowedMajorCategory) return "";
    const major = categories.find((c) => c.id === user.allowedMajorCategory);
    return major?.name || user.allowedMajorCategory;
  }, [user, categories]);

  // 유심 재고 통계 fetch
  const fetchUsimStats = useCallback(async () => {
    try {
      const res = await fetch("/api/usims/stats");
      if (res.ok) {
        const result = await res.json();
        setUsimStats(result.stats || []);
      }
    } catch {
      // 유심 통계 실패해도 무시 (메인 기능 아님)
    }
  }, []);

  // 서류 보완 통계 fetch
  const fetchSupplementData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (hasCategoryAccess) {
        if (selectedMediumCategories.length > 0 && selectedMediumCategories.length < allowedMediumCats.length) {
          params.set("mediumCategories", selectedMediumCategories.join(","));
        }
      } else if (selectedAgency !== "all") {
        params.set("agencyIds", selectedAgency);
      }

      const res = await fetch(`/api/dashboard?${params}`);
      if (res.ok) {
        const result = await res.json();
        setSupplementStats(result.supplementStats || []);
        setSupplementList(result.supplementList || []);
      }
    } catch {
      // 보완 통계 실패해도 무시
    }
  }, [hasCategoryAccess, selectedMediumCategories, allowedMediumCats.length, selectedAgency]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (hasCategoryAccess) {
        // 카테고리 기반 필터링
        if (selectedMediumCategories.length > 0 && selectedMediumCategories.length < allowedMediumCats.length) {
          params.set("mediumCategories", selectedMediumCategories.join(","));
        }
        // 전체 선택이면 파라미터 없이 (서버에서 카테고리 기반 필터링)
      } else {
        // 직접 에이전시 필터링
        if (selectedAgency !== "all") {
          params.set("agencyId", selectedAgency);
        }
      }

      params.set("page", page.toString());
      params.set("pageSize", "200");

      const res = await fetch(`/api/activations?${params}`);
      const result = await res.json();

      // 거래처명 매핑
      const agencyMap: Record<string, string> = {};
      agencies.forEach((a) => (agencyMap[a.id] = a.name));
      const rows = (result.data || []).map((row: PartnerActivationRow) => ({
        ...row,
        agencyName: agencyMap[row.agencyId] || row.agencyId,
      }));

      setData(rows);
      setTotal(result.total || 0);
    } catch {
      toast.error("데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [page, selectedAgency, selectedMediumCategories, agencies, hasCategoryAccess, allowedMediumCats.length]);

  useEffect(() => {
    if (hasCategoryAccess && !categoryFilterInitialized) return; // 초기화 전에는 fetch하지 않음
    fetchData();
    fetchUsimStats();
    fetchSupplementData();
  }, [fetchData, fetchUsimStats, fetchSupplementData, hasCategoryAccess, categoryFilterInitialized]);

  // handleUpdate를 ref로 감싸서 stale closure 방지
  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;

  const handleUpdate = useCallback(
    async (id: string, field: string, value: string) => {
      // 낙관적 업데이트
      setData((prev) =>
        prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
      );
      try {
        const res = await fetch(`/api/activations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value }),
        });
        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error || "수정에 실패했습니다.");
          fetchDataRef.current();
        }
      } catch {
        toast.error("수정 중 오류가 발생했습니다.");
        fetchDataRef.current();
      }
    },
    []
  );

  const handleAddRow = async () => {
    // 거래처 결정
    let agencyId: string;

    if (hasCategoryAccess) {
      // 카테고리 기반: 선택된 중분류에 속한 첫 번째 거래처
      const selectedAgencies = agencies.filter((a) =>
        selectedMediumCategories.includes(a.mediumCategory || "")
      );
      if (selectedAgencies.length === 1) {
        agencyId = selectedAgencies[0].id;
      } else if (selectedAgencies.length > 1) {
        toast.error("거래처를 하나만 선택한 후 추가해주세요.");
        return;
      } else {
        toast.error("선택된 분류에 거래처가 없습니다.");
        return;
      }
    } else {
      if (!user?.allowedAgencies?.length) {
        toast.error("거래처가 배정되지 않았습니다.");
        return;
      }
      if (selectedAgency !== "all") {
        agencyId = selectedAgency;
      } else if (user.allowedAgencies.includes("ALL")) {
        toast.error("거래처를 먼저 선택해주세요.");
        return;
      } else if (user.allowedAgencies.length === 1) {
        agencyId = user.allowedAgencies[0];
      } else {
        toast.error("거래처를 먼저 선택해주세요.");
        return;
      }
    }

    setCreating(true);
    try {
      const res = await fetch("/api/activations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencyId,
          customerName: "(신규)",
        }),
      });

      if (res.ok) {
        toast.success("새 행이 추가되었습니다. 고객명을 입력해주세요.");
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "추가에 실패했습니다.");
      }
    } catch {
      toast.error("추가 중 오류가 발생했습니다.");
    } finally {
      setCreating(false);
    }
  };

  const columns = useMemo(
    () => getPartnerColumns({ onUpdate: handleUpdate }),
    [handleUpdate]
  );

  // 요약 통계 (workStatus 기준 - 5개)
  const stats = useMemo(() => {
    const drafting = data.filter(
      (r) => !r.workStatus || r.workStatus === "입력중"
    ).length;
    const requested = data.filter(
      (r) => r.workStatus === "개통요청"
    ).length;
    const working = data.filter(
      (r) => r.workStatus === "진행중"
    ).length;
    const completed = data.filter(
      (r) => r.workStatus === "개통완료"
    ).length;
    const needsFix = data.filter(
      (r) => r.workStatus === "보완요청"
    ).length;
    return { drafting, requested, working, completed, needsFix };
  }, [data]);

  // 유심 합산 통계
  const usimTotals = useMemo(() => {
    return usimStats.reduce(
      (acc, s) => ({
        totalAssigned: acc.totalAssigned + s.totalAssigned,
        currentStock: acc.currentStock + s.currentStock,
        used: acc.used + s.used,
        cancelled: acc.cancelled + s.cancelled,
      }),
      { totalAssigned: 0, currentStock: 0, used: 0, cancelled: 0 }
    );
  }, [usimStats]);

  // 필터링된 데이터
  const filteredData = useMemo(() => {
    if (!statusFilter) return data;
    return data.filter((r) => {
      const ws = r.workStatus || "입력중";
      return ws === statusFilter;
    });
  }, [data, statusFilter]);

  const handleCardClick = (filter: WorkStatusFilter) => {
    setStatusFilter((prev) => (prev === filter ? null : filter));
  };

  // 중분류 체크박스 토글
  const handleMediumCategoryToggle = (catId: string) => {
    setSelectedMediumCategories((prev) => {
      if (prev.includes(catId)) {
        // 최소 1개는 선택 유지
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== catId);
      }
      return [...prev, catId];
    });
    setPage(1);
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    const allIds = allowedMediumCats.map((c) => c.id);
    if (selectedMediumCategories.length === allIds.length) {
      // 전체 해제 → 첫 번째만 남기기 (최소 1개)
      setSelectedMediumCategories([allIds[0]]);
    } else {
      setSelectedMediumCategories(allIds);
    }
    setPage(1);
  };

  const isAllSelected = selectedMediumCategories.length === allowedMediumCats.length;

  const today = new Date();
  const dateStr = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">개통 현황</h1>
        <div className="rounded-lg bg-gray-900 px-3 py-1.5 text-white shadow">
          <span className="text-xs font-medium">{dateStr}</span>
        </div>
      </div>

      {/* 요약 카드 5개 (workStatus 기준, 클릭 필터링) */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "입력중"
              ? "ring-2 ring-gray-500 shadow-md"
              : "hover:ring-1 hover:ring-gray-200"
          }`}
          onClick={() => handleCardClick("입력중")}
        >
          <CardContent className="flex items-center gap-2.5 p-3">
            <div className="rounded-md bg-gray-100 p-1.5">
              <FileEdit className="h-4 w-4 text-gray-700" />
            </div>
            <div>
              <p className="text-xs text-gray-500">입력중</p>
              <p className="text-xl font-bold">{stats.drafting}건</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "개통요청"
              ? "ring-2 ring-blue-500 shadow-md"
              : "hover:ring-1 hover:ring-blue-200"
          }`}
          onClick={() => handleCardClick("개통요청")}
        >
          <CardContent className="flex items-center gap-2.5 p-3">
            <div className="rounded-md bg-blue-100 p-1.5">
              <Clock className="h-4 w-4 text-blue-700" />
            </div>
            <div>
              <p className="text-xs text-gray-500">개통요청</p>
              <p className="text-xl font-bold">{stats.requested}건</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "진행중"
              ? "ring-2 ring-yellow-500 shadow-md"
              : "hover:ring-1 hover:ring-yellow-200"
          }`}
          onClick={() => handleCardClick("진행중")}
        >
          <CardContent className="flex items-center gap-2.5 p-3">
            <div className="rounded-md bg-yellow-100 p-1.5">
              <Loader2 className="h-4 w-4 text-yellow-700" />
            </div>
            <div>
              <p className="text-xs text-gray-500">진행중</p>
              <p className="text-xl font-bold">{stats.working}건</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "개통완료"
              ? "ring-2 ring-green-500 shadow-md"
              : "hover:ring-1 hover:ring-green-200"
          }`}
          onClick={() => handleCardClick("개통완료")}
        >
          <CardContent className="flex items-center gap-2.5 p-3">
            <div className="rounded-md bg-green-100 p-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-700" />
            </div>
            <div>
              <p className="text-xs text-gray-500">개통완료</p>
              <p className="text-xl font-bold">{stats.completed}건</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "보완요청"
              ? "ring-2 ring-red-500 shadow-md"
              : "hover:ring-1 hover:ring-red-200"
          }`}
          onClick={() => handleCardClick("보완요청")}
        >
          <CardContent className="flex items-center gap-2.5 p-3">
            <div className="rounded-md bg-red-100 p-1.5">
              <RotateCcw className="h-4 w-4 text-red-700" />
            </div>
            <div>
              <p className="text-xs text-gray-500">보완요청</p>
              <p className="text-xl font-bold">{stats.needsFix}건</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 유심 재고 현황 (항상 표시) */}
      <Card className="border-blue-100 bg-blue-50/30">
        <div
          className={`flex items-center justify-between px-4 py-3 ${usimStats.length > 1 ? "cursor-pointer" : ""}`}
          onClick={() => usimStats.length > 1 && setUsimExpanded(!usimExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Package className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900">유심 재고 현황</p>
              {usimTotals.totalAssigned > 0 ? (
                <p className="text-xs text-blue-600">
                  총 배정 {usimTotals.totalAssigned}장 · 잔여 재고{" "}
                  <span className="font-bold text-blue-800">{usimTotals.currentStock}장</span> · 사용{" "}
                  {usimTotals.used}장 · 취소 {usimTotals.cancelled}장
                </p>
              ) : (
                <p className="text-xs text-gray-400">배정된 유심이 없습니다</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {usimStats.length > 1 && (
              <span className="text-xs text-blue-500">
                {usimStats.length}개 거래처
              </span>
            )}
            {usimStats.length > 1 ? (
              usimExpanded ? (
                <ChevronDown className="h-4 w-4 text-blue-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-blue-500" />
              )
            ) : null}
          </div>
        </div>

        {/* 거래처별 상세 (다중 거래처일 때만 펼침) */}
        {usimExpanded && usimStats.length > 1 && (
          <div className="border-t border-blue-100 px-4 py-2">
            <div className="space-y-1.5">
              {usimStats.map((s) => (
                <div
                  key={s.agencyId}
                  className="flex items-center justify-between rounded-md bg-white/60 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-gray-700">{s.agencyName}</span>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>배정 <span className="font-medium text-gray-700">{s.totalAssigned}</span>장</span>
                    <span>재고 <span className="font-bold text-blue-700">{s.currentStock}</span>장</span>
                    <span>사용 <span className="font-medium text-gray-700">{s.used}</span>장</span>
                    <span>취소 <span className="font-medium text-red-600">{s.cancelled}</span>장</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* 서류 보완 현황 */}
      {(supplementStats.length > 0 || supplementList.length > 0) && (
        <div>
          <h2 className="text-base font-bold mb-2">서류 보완 현황</h2>
          <SupplementPanel
            supplementStats={supplementStats}
            supplementList={supplementList}
          />
        </div>
      )}

      {/* 구분선 */}
      <div className="border-t border-gray-200" />

      {/* 헤더 + 필터 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">고객 개통 관리</h1>
          {statusFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter(null)}
              className="h-7 gap-1 text-xs"
            >
              {statusFilter} 필터 해제
              <X className="h-3 w-3" />
            </Button>
          )}

          {/* 카테고리 기반 필터 (중분류 체크박스) */}
          {hasCategoryAccess && allowedMediumCats.length > 0 ? (
            <div className="flex items-center gap-3 rounded-lg border bg-white px-3 py-1.5">
              <span className="text-sm font-medium text-gray-700">{majorCategoryName}</span>
              <div className="h-4 w-px bg-gray-300" />
              {allowedMediumCats.length > 1 && (
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-xs font-medium text-gray-500">전체</span>
                </label>
              )}
              {allowedMediumCats.map((cat) => (
                <label key={cat.id} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={selectedMediumCategories.includes(cat.id)}
                    onCheckedChange={() => handleMediumCategoryToggle(cat.id)}
                  />
                  <span className="text-sm">{cat.name}</span>
                </label>
              ))}
            </div>
          ) : (
            /* 직접 에이전시 필터 (기존 방식) */
            allowedAgencies.length > 1 && (
              <Select
                value={selectedAgency}
                onValueChange={(v) => {
                  setSelectedAgency(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="전체 거래처" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 거래처</SelectItem>
                  {allowedAgencies.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchData()}
            disabled={loading}
            title="새로고침"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={handleAddRow} disabled={creating}>
            <Plus className="mr-2 h-4 w-4" />
            {creating ? "추가 중..." : "새 고객 추가"}
          </Button>
        </div>
      </div>

      {/* 스프레드시트 테이블 */}
      {loading ? (
        <div className="flex h-64 items-center justify-center text-gray-500">
          로딩 중...
        </div>
      ) : (
        <div className="min-h-[60vh]">
        <DataTable
          columns={columns}
          data={filteredData}
          total={statusFilter ? filteredData.length : total}
          page={page}
          pageSize={200}
          onPageChange={setPage}
          searchPlaceholder="고객명으로 검색..."
          getRowClassName={(row: PartnerActivationRow) => {
            const hasSupp =
              row.workStatus === "보완요청" ||
              row.applicationDocsReview === "보완요청" ||
              row.nameChangeDocsReview === "보완요청" ||
              row.arcAutopayReview === "보완요청";
            return hasSupp ? "bg-red-50/70" : "";
          }}
        />
        </div>
      )}
    </div>
  );
}
