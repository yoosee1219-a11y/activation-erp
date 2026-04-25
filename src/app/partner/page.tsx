"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAgencyFilter } from "@/hooks/use-agency-filter";
import { DataTable } from "@/components/activations/data-table";
import {
  getPartnerColumns,
  type PartnerActivationRow,
} from "@/components/partner/partner-columns";
import { MonthSelector } from "@/components/partner/month-selector";
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
import { Plus, Clock, CheckCircle2, Loader2, RotateCcw, X, RefreshCw, FileEdit, Package, ChevronDown, ChevronRight, ChevronUp, XCircle, Lock, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SupplementPanel } from "@/components/dashboard/supplement-panel";
import type { SupplementStat, SupplementItem } from "@/components/dashboard/supplement-panel";
import { BookmarkTab, BookmarkTabsBar } from "@/components/ui/bookmark-tabs";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { CustomerDetailDialog } from "@/components/partner/customer-detail-dialog";

type WorkStatusFilter = "입력중" | "개통요청" | "진행중" | "개통완료" | "최종완료" | "보완요청" | "해지" | null;

interface UsimAgencyStats {
  agencyId: string;
  agencyName: string;
  totalAssigned: number;
  currentStock: number;
  used: number;
  cancelled: number;
  resetReady: number;
}

interface MonthSummary {
  month: string;
  total: string;
  completed: string;
  pending: string;
  cancelled: string;
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

  // 월별 필터
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [availableMonths, setAvailableMonths] = useState<MonthSummary[]>([]);

  // 대시보드 접기/펼치기 (deprecated — mainView로 대체됨)
  const [dashboardCollapsed, setDashboardCollapsed] = useState(false);

  // 메인 책갈피: 어느 영역을 볼지
  const [mainView, setMainView] = useState<"dashboard" | "activations">("dashboard");

  // 유심 재고 현황
  const [usimStats, setUsimStats] = useState<UsimAgencyStats[]>([]);
  const [usimExpanded, setUsimExpanded] = useState(false);

  // 서류 보완 현황
  const [supplementStats, setSupplementStats] = useState<SupplementStat[]>([]);
  const [supplementList, setSupplementList] = useState<SupplementItem[]>([]);

  // 비밀번호 변경 다이얼로그
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  // 엑셀 업로드 다이얼로그
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: number } | null>(null);

  // 고객 상세 팝업
  const [detailCustomer, setDetailCustomer] = useState<PartnerActivationRow | null>(null);

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
    if (hasCategoryAccess) return agencies;
    if (user.allowedAgencies.includes("ALL")) return agencies;
    return agencies.filter((a) => user.allowedAgencies.includes(a.id));
  }, [user, agencies, hasCategoryAccess]);

  // 대분류 이름
  const majorCategoryName = useMemo(() => {
    if (!user?.allowedMajorCategory) return "";
    const major = categories.find((c) => c.id === user.allowedMajorCategory);
    return major?.name || user.allowedMajorCategory;
  }, [user, categories]);

  // 월별 데이터 fetch
  const fetchMonths = useCallback(async () => {
    try {
      const res = await fetch("/api/activations/months");
      if (res.ok) {
        const result = await res.json();
        setAvailableMonths(result.months || []);
      }
    } catch {
      // 무시
    }
  }, []);

  useEffect(() => {
    fetchMonths();
  }, [fetchMonths]);

  // 유심 재고 통계 fetch
  const fetchUsimStats = useCallback(async () => {
    try {
      const res = await fetch("/api/usims/stats");
      if (res.ok) {
        const result = await res.json();
        setUsimStats(result.stats || []);
      }
    } catch {
      // 유심 통계 실패해도 무시
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

  // 현재 YYYY-MM 계산
  const getCurrentYM = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (hasCategoryAccess) {
        if (selectedMediumCategories.length > 0 && selectedMediumCategories.length < allowedMediumCats.length) {
          params.set("mediumCategories", selectedMediumCategories.join(","));
        }
      } else {
        if (selectedAgency !== "all") {
          params.set("agencyId", selectedAgency);
        }
      }

      // 월별 필터 적용
      if (selectedMonth !== "all") {
        const monthValue = selectedMonth === "current" ? getCurrentYM() : selectedMonth;
        params.set("month", monthValue);
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
  }, [page, selectedAgency, selectedMediumCategories, agencies, hasCategoryAccess, allowedMediumCats.length, selectedMonth]);

  useEffect(() => {
    if (hasCategoryAccess && !categoryFilterInitialized) return;
    fetchData();
    fetchUsimStats();
    fetchSupplementData();
  }, [fetchData, fetchUsimStats, fetchSupplementData, hasCategoryAccess, categoryFilterInitialized]);

  // handleUpdate를 ref로 감싸서 stale closure 방지
  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;

  const handleUpdate = useCallback(
    async (id: string, field: string, value: string) => {
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
    let agencyId: string;

    if (hasCategoryAccess) {
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

  // 요약 통계 (workStatus 기준 - 6개)
  const stats = useMemo(() => {
    const drafting = data.filter((r) => !r.workStatus || r.workStatus === "입력중").length;
    const requested = data.filter((r) => r.workStatus === "개통요청").length;
    const working = data.filter((r) => r.workStatus === "진행중").length;
    const completed = data.filter((r) => r.workStatus === "개통완료" || r.workStatus === "최종완료").length;
    const needsFix = data.filter((r) => r.workStatus === "보완요청").length;
    const terminated = data.filter((r) => r.workStatus === "해지").length;
    return { drafting, requested, working, completed, needsFix, terminated };
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
      if (statusFilter === "개통완료") {
        return ws === "개통완료" || ws === "최종완료";
      }
      return ws === statusFilter;
    });
  }, [data, statusFilter]);

  const handleCardClick = (filter: WorkStatusFilter) => {
    setStatusFilter((prev) => (prev === filter ? null : filter));
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    setPage(1);
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      toast.error("모든 필드를 입력해 주세요.");
      return;
    }
    if (newPw.length < 4) {
      toast.error("새 비밀번호는 4자 이상이어야 합니다.");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    setChangingPw(true);
    try {
      const res = await fetch("/api/users/change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      if (res.ok) {
        toast.success("비밀번호가 변경되었습니다.");
        setPasswordDialogOpen(false);
        setCurrentPw("");
        setNewPw("");
        setConfirmPw("");
      } else {
        const err = await res.json();
        toast.error(err.error || "변경 실패");
      }
    } catch {
      toast.error("비밀번호 변경 중 오류가 발생했습니다.");
    } finally {
      setChangingPw(false);
    }
  };

  const handleExcelDownload = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedMonth) params.set("month", selectedMonth);
      const res = await fetch(`/api/export?${params.toString()}`);
      if (!res.ok) throw new Error("다운로드 실패");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `개통관리_${selectedMonth || "전체"}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("엑셀 다운로드에 실패했습니다.");
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (file.name.endsWith(".csv")) {
          const parsed = Papa.parse(data as string, { header: true, skipEmptyLines: true });
          setImportPreview(parsed.data.slice(0, 10) as Record<string, string>[]);
        } else {
          const wb = XLSX.read(data, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
          setImportPreview(json.slice(0, 10));
        }
      } catch {
        toast.error("파일을 읽는 중 오류가 발생했습니다.");
        setImportPreview([]);
      }
    };
    if (file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const handleImportUpload = async () => {
    if (!importFile) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const reader = new FileReader();
      const rows = await new Promise<Record<string, string>[]>((resolve, reject) => {
        reader.onload = (evt) => {
          try {
            const data = evt.target?.result;
            if (importFile.name.endsWith(".csv")) {
              const parsed = Papa.parse(data as string, { header: true, skipEmptyLines: true });
              resolve(parsed.data as Record<string, string>[]);
            } else {
              const wb = XLSX.read(data, { type: "array" });
              const ws = wb.Sheets[wb.SheetNames[0]];
              resolve(XLSX.utils.sheet_to_json<Record<string, string>>(ws));
            }
          } catch (err) {
            reject(err);
          }
        };
        if (importFile.name.endsWith(".csv")) {
          reader.readAsText(importFile);
        } else {
          reader.readAsArrayBuffer(importFile);
        }
      });

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "업로드에 실패했습니다.");
        return;
      }
      const inserted = result.inserted || 0;
      const duplicates = result.duplicates || 0;
      const errorCount = Array.isArray(result.errors) ? result.errors.length : (result.errors || 0);
      setImportResult({
        created: inserted,
        skipped: (result.skipped || 0) + duplicates,
        errors: errorCount,
      });
      toast.success(`업로드 완료: ${inserted}건 생성, ${duplicates}건 중복, ${errorCount}건 오류`);
      fetchData();
    } catch {
      toast.error("업로드 중 오류가 발생했습니다.");
    } finally {
      setImportLoading(false);
    }
  };

  // 중분류 체크박스 토글
  const handleMediumCategoryToggle = (catId: string) => {
    setSelectedMediumCategories((prev) => {
      if (prev.includes(catId)) {
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
    <div className="space-y-3">
      {/* 메인 책갈피 — 한 화면에 한 영역만 표시 (스크롤 최소) */}
      <BookmarkTabsBar>
        <BookmarkTab
          active={mainView === "dashboard"}
          onClick={() => setMainView("dashboard")}
          label="개통 현황"
          count={data.length}
        />
        <BookmarkTab
          active={mainView === "activations"}
          onClick={() => setMainView("activations")}
          label="고객 개통 관리"
          count={filteredData.length}
        />
      </BookmarkTabsBar>

      {/* ═══════════════════════════════════════════════════════════
          섹션 A: 대시보드 (mainView === "dashboard")
          ═══════════════════════════════════════════════════════════ */}
      {mainView === "dashboard" && (
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-4">
          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">개통 현황</h1>
              <button
                onClick={() => setDashboardCollapsed(!dashboardCollapsed)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title={dashboardCollapsed ? "펼치기" : "접기"}
              >
                {dashboardCollapsed ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronUp className="h-5 w-5" />
                )}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExcelDownload}>
                <Download className="h-4 w-4 mr-1" />
                엑셀 다운로드
              </Button>
              <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-1" />
                엑셀 업로드
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPasswordDialogOpen(true)}>
                <Lock className="h-4 w-4 mr-1" />
                비밀번호 변경
              </Button>
              <div className="rounded-lg bg-gray-900 px-3 py-1.5 text-white shadow">
                <span className="text-xs font-medium">{dateStr}</span>
              </div>
            </div>
          </div>

          {/* 월 선택기 */}
          <MonthSelector
            availableMonths={availableMonths}
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
          />

          {!dashboardCollapsed && (
            <>
              {/* 진행상황 책갈피 탭 (전체 + 6개 상태) */}
              <BookmarkTabsBar>
                <BookmarkTab
                  active={!statusFilter}
                  onClick={() => setStatusFilter(null)}
                  label="전체"
                  count={
                    stats.drafting +
                    stats.requested +
                    stats.working +
                    stats.completed +
                    stats.needsFix +
                    stats.terminated
                  }
                />
                <BookmarkTab
                  active={statusFilter === "입력중"}
                  onClick={() => handleCardClick("입력중")}
                  label="입력중"
                  count={stats.drafting}
                  icon={<FileEdit className="h-3.5 w-3.5" />}
                />
                <BookmarkTab
                  active={statusFilter === "개통요청"}
                  onClick={() => handleCardClick("개통요청")}
                  label="개통요청"
                  count={stats.requested}
                  icon={<Clock className="h-3.5 w-3.5" />}
                />
                <BookmarkTab
                  active={statusFilter === "진행중"}
                  onClick={() => handleCardClick("진행중")}
                  label="진행중"
                  count={stats.working}
                  icon={<Loader2 className="h-3.5 w-3.5" />}
                />
                <BookmarkTab
                  active={statusFilter === "개통완료"}
                  onClick={() => handleCardClick("개통완료")}
                  label="개통완료"
                  count={stats.completed}
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                />
                <BookmarkTab
                  active={statusFilter === "보완요청"}
                  onClick={() => handleCardClick("보완요청")}
                  label="보완요청"
                  count={stats.needsFix}
                  icon={<RotateCcw className="h-3.5 w-3.5" />}
                />
                <BookmarkTab
                  active={statusFilter === "해지"}
                  onClick={() => handleCardClick("해지")}
                  label="해지"
                  count={stats.terminated}
                  icon={<XCircle className="h-3.5 w-3.5" />}
                />
              </BookmarkTabsBar>

              {/* 유심 재고 현황 */}
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
                      <span className="text-xs text-blue-500">{usimStats.length}개 거래처</span>
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
            </>
          )}
        </CardContent>
      </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════
          섹션 B: 고객 개통 관리 (mainView === "activations")
          ═══════════════════════════════════════════════════════════ */}
      {mainView === "activations" && (
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-4">
          {/* 헤더 + 필터 */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 flex-wrap">
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

              {/* 카테고리 기반 필터 */}
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
                searchPlaceholder="가입번호/고객명/신규번호 검색..."
                initialColumnVisibility={{
                  usimNumber: false,
                  entryDate: false,
                  subscriptionType: false,
                  ratePlan: false,
                  // 가입번호는 고객정보 조회 핵심키이므로 기본 표시, 신규번호는 상세에서 확인
                  newPhoneNumber: false,
                  virtualAccount: false,
                  activationDate: false,
                  applicationDocs: false,
                  applicationDocsReview: false,
                  nameChangeDocs: false,
                  nameChangeDocsReview: false,
                  arcInfo: false,
                  arcReview: false,
                  autopayInfo: false,
                  autopayReview: false,
                }}
                getRowClassName={(row: PartnerActivationRow) => {
                  const isArc = row.activationMethod === "외국인등록증";

                  // 개통방법에 따른 필수 서류/검수 필드
                  const requiredDocs = isArc
                    ? [row.applicationDocs, row.autopayInfo]
                    : [row.applicationDocs, row.nameChangeDocs, row.arcInfo, row.autopayInfo];
                  const requiredReviews = isArc
                    ? [row.applicationDocsReview, row.autopayReview]
                    : [row.applicationDocsReview, row.nameChangeDocsReview, row.arcReview, row.autopayReview];

                  // 모든 필수 검수 완료 → 초록
                  if (requiredReviews.every(r => r === "완료")) {
                    return "bg-green-50/80 hover:bg-green-100/80";
                  }

                  // 보완요청 또는 미첨부 → 빨강
                  const hasIssue =
                    row.workStatus === "보완요청" ||
                    requiredReviews.some(r => r === "보완요청") ||
                    requiredDocs.some(d => !d);
                  if (hasIssue) {
                    return "bg-red-50/70 hover:bg-red-100/70";
                  }

                  return "";
                }}
                onRowClick={(row: PartnerActivationRow) => setDetailCustomer(row)}
              />
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* 비밀번호 변경 다이얼로그 */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>비밀번호 변경</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>현재 비밀번호</Label>
              <Input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="현재 비밀번호 입력"
              />
            </div>
            <div className="space-y-2">
              <Label>새 비밀번호</Label>
              <Input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="4자 이상"
              />
            </div>
            <div className="space-y-2">
              <Label>새 비밀번호 확인</Label>
              <Input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="새 비밀번호 다시 입력"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleChangePassword} disabled={changingPw}>
              {changingPw ? "변경 중..." : "변경"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 엑셀 업로드 다이얼로그 */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => {
        setImportDialogOpen(open);
        if (!open) {
          setImportFile(null);
          setImportPreview([]);
          setImportResult(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>엑셀 업로드</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportFileChange}
            />
            {importPreview.length > 0 && (
              <div className="max-h-64 overflow-auto rounded border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-100">
                    <tr>
                      {Object.keys(importPreview[0]).map((key) => (
                        <th key={key} className="px-2 py-1 text-left font-medium">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((row, i) => (
                      <tr key={i} className="border-t">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="px-2 py-1 whitespace-nowrap">
                            {String(val ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="px-2 py-1 text-xs text-gray-500">
                  미리보기 (최대 10행)
                </p>
              </div>
            )}
            {importResult && (
              <div className="rounded border bg-gray-50 p-3 text-sm">
                <p>생성: <span className="font-semibold text-green-600">{importResult.created}건</span></p>
                <p>건너뜀: <span className="font-semibold text-yellow-600">{importResult.skipped}건</span></p>
                {importResult.errors > 0 && (
                  <p>오류: <span className="font-semibold text-red-600">{importResult.errors}건</span></p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              닫기
            </Button>
            <Button onClick={handleImportUpload} disabled={!importFile || importLoading}>
              {importLoading ? "업로드 중..." : "업로드"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 고객 상세 팝업 */}
      <CustomerDetailDialog
        open={!!detailCustomer}
        onClose={() => setDetailCustomer(null)}
        customer={detailCustomer}
        onUpdate={(id, field, value) => {
          handleUpdate(id, field, value);
          setDetailCustomer((prev) => prev ? { ...prev, [field]: value } : null);
        }}
      />
    </div>
  );
}
