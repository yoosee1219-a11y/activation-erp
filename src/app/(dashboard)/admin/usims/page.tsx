"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAgencyFilter, type Agency, type CategoryNode } from "@/hooks/use-agency-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Package,
  Plus,
  RotateCcw,
  Search,
  ChevronDown,
  ChevronRight,
  Loader2,
  ClipboardList,
  X,
  ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───
interface UsimAgencyStats {
  agencyId: string;
  agencyName: string;
  totalAssigned: number;
  currentStock: number;
  used: number;
  cancelled: number;
  resetReady: number;
}

interface UsimRow {
  id: string;
  usimSerialNumber: string;
  agencyId: string;
  agencyName?: string;
  status: string;
  assignedDate: string;
  usedDate: string | null;
  cancelledDate: string | null;
  resetDate: string | null;
  usedActivationId: string | null;
  notes: string | null;
}

// ─── Status Badge ───
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    ASSIGNED: { label: "배정됨", className: "bg-blue-100 text-blue-700" },
    USED: { label: "사용됨", className: "bg-gray-100 text-gray-600" },
    CANCELLED: { label: "개통취소", className: "bg-red-100 text-red-700" },
    RESET_READY: { label: "초기화완료", className: "bg-green-100 text-green-700" },
  };
  const { label, className } = map[status] || { label: status, className: "bg-gray-100 text-gray-600" };
  return <Badge className={className}>{label}</Badge>;
}

// ─── 카테고리 캐스케이드 셀렉트 공통 컴포넌트 ───
function CategoryCascadeFilter({
  categories,
  agencies,
  selectedMajor,
  selectedMedium,
  selectedAgency,
  onMajorChange,
  onMediumChange,
  onAgencyChange,
  showAllOption = false,
  majorLabel = "대분류",
  mediumLabel = "중분류",
  agencyLabel = "소분류 (업체)",
  showAgency = false,
}: {
  categories: CategoryNode[];
  agencies: Agency[];
  selectedMajor: string;
  selectedMedium: string;
  selectedAgency: string;
  onMajorChange: (v: string) => void;
  onMediumChange: (v: string) => void;
  onAgencyChange: (v: string) => void;
  showAllOption?: boolean;
  majorLabel?: string;
  mediumLabel?: string;
  agencyLabel?: string;
  showAgency?: boolean;
}) {
  const allValue = showAllOption ? "all" : "";
  const placeholder = showAllOption ? "전체" : "선택";

  const mediumCats = useMemo(() => {
    if (!selectedMajor || selectedMajor === "all") return [];
    const major = categories.find((c) => c.id === selectedMajor);
    return major?.children || [];
  }, [selectedMajor, categories]);

  const filteredAgencies = useMemo(() => {
    if (!selectedMedium || selectedMedium === "all") {
      if (!selectedMajor || selectedMajor === "all") return agencies;
      const mediumIds = mediumCats.map((c) => c.id);
      return agencies.filter((a) => mediumIds.includes(a.mediumCategory || ""));
    }
    return agencies.filter((a) => a.mediumCategory === selectedMedium);
  }, [selectedMajor, selectedMedium, agencies, mediumCats]);

  return (
    <>
      <div className="space-y-1">
        <Label className="text-xs">{majorLabel}</Label>
        <Select
          value={selectedMajor}
          onValueChange={(v) => {
            onMajorChange(v);
            onMediumChange(allValue);
            onAgencyChange(allValue);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={`${placeholder}`} />
          </SelectTrigger>
          <SelectContent>
            {showAllOption && <SelectItem value="all">전체</SelectItem>}
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">{mediumLabel}</Label>
        <Select
          value={selectedMedium}
          onValueChange={(v) => {
            onMediumChange(v);
            onAgencyChange(allValue);
          }}
          disabled={!selectedMajor || selectedMajor === "all"}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={mediumCats.length === 0 ? "대분류 먼저 선택" : `${placeholder}`} />
          </SelectTrigger>
          <SelectContent>
            {showAllOption && <SelectItem value="all">전체</SelectItem>}
            {mediumCats.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showAgency && (
        <div className="space-y-1">
          <Label className="text-xs">{agencyLabel}</Label>
          <Select
            value={selectedAgency}
            onValueChange={onAgencyChange}
            disabled={filteredAgencies.length === 0}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder={filteredAgencies.length === 0 ? "상위 분류 먼저 선택" : `${placeholder}`} />
            </SelectTrigger>
            <SelectContent>
              {showAllOption && <SelectItem value="all">전체</SelectItem>}
              {filteredAgencies.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );
}

// ─── Main Page ───
export default function UsimManagementPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const { agencies, categories } = useAgencyFilter();
  const [refreshKey, setRefreshKey] = useState(0);

  // ─── 유심 작업이력 상태 ───
  const [usimLogs, setUsimLogs] = useState<any[]>([]);
  const [logsOpen, setLogsOpen] = useState(false);
  const logsOpenRef = useRef(false);

  // logsOpen 변경 시 ref도 동기화
  useEffect(() => {
    logsOpenRef.current = logsOpen;
  }, [logsOpen]);

  const fetchUsimLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/usims/logs");
      const data = await res.json();
      setUsimLogs(data.logs || []);
    } catch {
      console.error("유심 로그 로드 실패");
    }
  }, []);

  // 마운트 시 로그 프리로드 (패널이 열려 있을 때 바로 보여주기 위해)
  useEffect(() => {
    fetchUsimLogs();
  }, [fetchUsimLogs]);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    // 로그 패널이 열려 있으면 로그도 새로고침
    if (logsOpenRef.current) {
      fetchUsimLogs();
    }
  }, [fetchUsimLogs]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">유심 관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            업체별 유심 배정 및 재고를 관리합니다.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLogsOpen(!logsOpen);
            if (!logsOpen) fetchUsimLogs();
          }}
        >
          <ClipboardList className="h-4 w-4 mr-1" />
          작업이력
        </Button>
      </div>

      {/* ─── 유심 작업이력 패널 ─── */}
      {logsOpen && (
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">유심 작업이력</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLogsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="max-h-60 overflow-y-auto space-y-2">
              {usimLogs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">작업이력이 없습니다.</p>
              ) : (
                usimLogs.map((log: any) => (
                  <div key={log.id} className="text-xs border-b pb-2 last:border-0">
                    <div className="flex items-center gap-2 text-gray-400">
                      <span>{new Date(log.createdAt).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0">{log.userName}</Badge>
                    </div>
                    <p className="text-gray-700 mt-0.5">{log.details}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Package className="h-4 w-4" />
            재고 현황
          </TabsTrigger>
          <TabsTrigger value="assign" className="gap-2">
            <Plus className="h-4 w-4" />
            유심 배정
          </TabsTrigger>
          <TabsTrigger value="transfer" className="gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            유심 이송
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            취소/초기화 관리
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: 재고 현황 ─── */}
        <TabsContent value="overview" className="space-y-4">
          <OverviewTab agencies={agencies} categories={categories} refreshKey={refreshKey} />
        </TabsContent>

        {/* ─── Tab 2: 유심 배정 ─── */}
        <TabsContent value="assign" className="space-y-4">
          <AssignTab agencies={agencies} categories={categories} onAssigned={triggerRefresh} />
        </TabsContent>

        {/* ─── Tab 3: 유심 이송 ─── */}
        <TabsContent value="transfer" className="space-y-4">
          <TransferTab agencies={agencies} categories={categories} onTransferred={triggerRefresh} />
        </TabsContent>

        {/* ─── Tab 4: 취소/초기화 관리 ─── */}
        <TabsContent value="cancelled" className="space-y-4">
          <CancelledTab agencies={agencies} categories={categories} onReset={triggerRefresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════
// Tab 1: 재고 현황
// ═══════════════════════════════════════════
function OverviewTab({
  agencies,
  categories,
  refreshKey,
}: {
  agencies: Agency[];
  categories: CategoryNode[];
  refreshKey: number;
}) {
  const [selectedMajor, setSelectedMajor] = useState("all");
  const [selectedMedium, setSelectedMedium] = useState("all");
  const [stats, setStats] = useState<UsimAgencyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAgency, setExpandedAgency] = useState<string | null>(null);
  const [agencyUsims, setAgencyUsims] = useState<UsimRow[]>([]);
  const [loadingUsims, setLoadingUsims] = useState(false);

  // 통계 로드 (카테고리 필터 적용)
  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedMedium !== "all") {
        params.set("mediumCategories", selectedMedium);
      } else if (selectedMajor !== "all") {
        params.set("majorCategories", selectedMajor);
      }
      const res = await fetch(`/api/usims/stats?${params}`);
      const data = await res.json();
      setStats(data.stats || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedMajor, selectedMedium]);

  useEffect(() => {
    loadStats();
  }, [loadStats, refreshKey]);

  // 업체 클릭 시 유심 목록 펼치기
  const toggleAgency = async (agencyId: string) => {
    if (expandedAgency === agencyId) {
      setExpandedAgency(null);
      setAgencyUsims([]);
      return;
    }
    setExpandedAgency(agencyId);
    setLoadingUsims(true);
    try {
      const res = await fetch(`/api/usims?agencyId=${agencyId}&pageSize=500`);
      const data = await res.json();
      setAgencyUsims(data.data || []);
    } catch {
      toast.error("유심 목록 로드 실패");
    } finally {
      setLoadingUsims(false);
    }
  };

  // 전체 합계
  const totals = stats.reduce(
    (acc, s) => ({
      totalAssigned: acc.totalAssigned + s.totalAssigned,
      currentStock: acc.currentStock + s.currentStock,
      used: acc.used + s.used,
      cancelled: acc.cancelled + s.cancelled,
      resetReady: acc.resetReady + s.resetReady,
    }),
    { totalAssigned: 0, currentStock: 0, used: 0, cancelled: 0, resetReady: 0 }
  );

  return (
    <div className="space-y-4">
      {/* 카테고리 필터 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <CategoryCascadeFilter
              categories={categories}
              agencies={agencies}
              selectedMajor={selectedMajor}
              selectedMedium={selectedMedium}
              selectedAgency="all"
              onMajorChange={setSelectedMajor}
              onMediumChange={setSelectedMedium}
              onAgencyChange={() => {}}
              showAllOption
              showAgency={false}
            />
          </div>
        </CardContent>
      </Card>

      {/* 전체 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">전체 배정</p>
            <p className="text-2xl font-bold">{totals.totalAssigned}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">현재 재고</p>
            <p className="text-2xl font-bold text-blue-600">{totals.currentStock}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">사용 완료</p>
            <p className="text-2xl font-bold text-gray-500">{totals.used}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">개통취소</p>
            <p className="text-2xl font-bold text-red-600">{totals.cancelled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">초기화완료</p>
            <p className="text-2xl font-bold text-green-600">{totals.resetReady}</p>
          </CardContent>
        </Card>
      </div>

      {/* 업체별 테이블 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">로딩 중...</span>
        </div>
      ) : stats.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            배정된 유심이 없습니다. &quot;유심 배정&quot; 탭에서 유심을 배정해 주세요.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">업체별 유심 현황</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>업체명</TableHead>
                  <TableHead className="text-center">배정 유심</TableHead>
                  <TableHead className="text-center">현재 재고</TableHead>
                  <TableHead className="text-center">사용됨</TableHead>
                  <TableHead className="text-center">개통취소</TableHead>
                  <TableHead className="text-center">초기화</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((s) => (
                  <>
                    <TableRow
                      key={s.agencyId}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleAgency(s.agencyId)}
                    >
                      <TableCell className="w-8">
                        {expandedAgency === s.agencyId ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{s.agencyName}</TableCell>
                      <TableCell className="text-center font-semibold">{s.totalAssigned}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-blue-600">{s.currentStock}</span>
                      </TableCell>
                      <TableCell className="text-center text-gray-500">{s.used}</TableCell>
                      <TableCell className="text-center text-red-600">{s.cancelled}</TableCell>
                      <TableCell className="text-center text-green-600">{s.resetReady}</TableCell>
                    </TableRow>
                    {/* 확장: 유심 리스트 */}
                    {expandedAgency === s.agencyId && (
                      <TableRow key={`${s.agencyId}-detail`}>
                        <TableCell colSpan={7} className="p-0 bg-gray-50">
                          {loadingUsims ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="ml-2 text-sm text-gray-500">로딩 중...</span>
                            </div>
                          ) : agencyUsims.length === 0 ? (
                            <div className="py-4 text-center text-gray-400 text-sm">배정된 유심 없음</div>
                          ) : (
                            <div className="max-h-64 overflow-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-gray-100">
                                    <TableHead className="text-xs">유심 일련번호</TableHead>
                                    <TableHead className="text-xs text-center">상태</TableHead>
                                    <TableHead className="text-xs">배정일</TableHead>
                                    <TableHead className="text-xs">사용일</TableHead>
                                    <TableHead className="text-xs">메모</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {agencyUsims.map((u) => (
                                    <TableRow key={u.id} className="text-sm">
                                      <TableCell className="font-mono text-xs">{u.usimSerialNumber}</TableCell>
                                      <TableCell className="text-center">
                                        <StatusBadge status={u.status} />
                                      </TableCell>
                                      <TableCell className="text-xs">{u.assignedDate}</TableCell>
                                      <TableCell className="text-xs">{u.usedDate || "-"}</TableCell>
                                      <TableCell className="text-xs text-gray-500">{u.notes || "-"}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// Tab 2: 유심 배정
// ═══════════════════════════════════════════
function AssignTab({
  agencies,
  categories,
  onAssigned,
}: {
  agencies: Agency[];
  categories: CategoryNode[];
  onAssigned: () => void;
}) {
  const [selectedMajor, setSelectedMajor] = useState("");
  const [selectedMedium, setSelectedMedium] = useState("");
  const [assignedDate, setAssignedDate] = useState(new Date().toISOString().split("T")[0]);
  const [serialInput, setSerialInput] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [inputMode, setInputMode] = useState<"list" | "range">("range");
  const [submitting, setSubmitting] = useState(false);

  // Auto-resolve: 중분류 선택 시 해당 카테고리의 첫 번째 업체를 자동 선택
  const resolvedAgencyId = useMemo(() => {
    if (!selectedMedium) return "";
    const mediumAgencies = agencies.filter(a => a.mediumCategory === selectedMedium);
    return mediumAgencies[0]?.id || "";
  }, [selectedMedium, agencies]);

  // 범위에서 일련번호 배열 생성
  const generateRange = (start: string, end: string): string[] => {
    const numStart = parseInt(start);
    const numEnd = parseInt(end);
    if (isNaN(numStart) || isNaN(numEnd) || numEnd < numStart) return [];
    const prefix = start.replace(/\d+$/, "");
    const digitLen = start.length - prefix.length;
    const result: string[] = [];
    for (let i = numStart; i <= numEnd; i++) {
      result.push(prefix + i.toString().padStart(digitLen, "0"));
    }
    return result;
  };

  const getSerialNumbers = (): string[] => {
    if (inputMode === "range") {
      return generateRange(rangeStart, rangeEnd);
    }
    return serialInput
      .split(/[\n,\t]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const previewCount = getSerialNumbers().length;

  const handleSubmit = async () => {
    if (!resolvedAgencyId) {
      toast.error("업체를 선택해 주세요.");
      return;
    }
    const serials = getSerialNumbers();
    if (serials.length === 0) {
      toast.error("유심 일련번호를 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/usims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agencyId: resolvedAgencyId, serialNumbers: serials, assignedDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      setSerialInput("");
      setRangeStart("");
      setRangeEnd("");
      onAssigned();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "배정 실패");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">유심 일괄 배정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 대분류 → 중분류 캐스케이드 */}
        <div className="flex flex-wrap gap-3 items-end">
          <CategoryCascadeFilter
            categories={categories}
            agencies={agencies}
            selectedMajor={selectedMajor}
            selectedMedium={selectedMedium}
            selectedAgency=""
            onMajorChange={setSelectedMajor}
            onMediumChange={setSelectedMedium}
            onAgencyChange={() => {}}
            showAllOption={false}
            majorLabel="대분류 *"
            mediumLabel="중분류 *"
            showAgency={false}
          />

          {/* 배정일 */}
          <div className="space-y-1">
            <Label className="text-xs">배정일 *</Label>
            <Input type="date" className="w-44" value={assignedDate} onChange={(e) => setAssignedDate(e.target.value)} />
          </div>

          {/* 입력 모드 */}
          <div className="space-y-1">
            <Label className="text-xs">입력 방식</Label>
            <Select value={inputMode} onValueChange={(v) => setInputMode(v as "list" | "range")}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="range">범위 지정 (시작~끝)</SelectItem>
                <SelectItem value="list">직접 입력 (목록)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 일련번호 입력 */}
        {inputMode === "range" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>시작 번호</Label>
              <Input
                placeholder="예: 1300141"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>끝 번호</Label>
              <Input
                placeholder="예: 1300150"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>유심 일련번호 (줄바꿈, 쉼표, 탭으로 구분)</Label>
            <Textarea
              placeholder="1300141&#10;1300142&#10;1300143"
              rows={6}
              value={serialInput}
              onChange={(e) => setSerialInput(e.target.value)}
            />
          </div>
        )}

        {/* 미리보기 */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            배정 예정: <span className="font-semibold text-gray-900">{previewCount}건</span>
          </p>
          <Button onClick={handleSubmit} disabled={submitting || previewCount === 0}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                배정 중...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                {previewCount}건 배정
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════
// Tab 3: 취소/초기화 관리
// ═══════════════════════════════════════════
function CancelledTab({
  agencies,
  categories,
  onReset,
}: {
  agencies: Agency[];
  categories: CategoryNode[];
  onReset: () => void;
}) {
  const [cancelledUsims, setCancelledUsims] = useState<UsimRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [resetting, setResetting] = useState(false);
  const [search, setSearch] = useState("");

  // 카테고리 캐스케이드 필터
  const [filterMajor, setFilterMajor] = useState("all");
  const [filterMedium, setFilterMedium] = useState("all");
  const [filterAgency, setFilterAgency] = useState("all");

  const loadCancelled = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("status", "CANCELLED");
      params.set("pageSize", "500");

      if (filterAgency !== "all") {
        params.set("agencyId", filterAgency);
      } else if (filterMedium !== "all") {
        params.set("mediumCategories", filterMedium);
      } else if (filterMajor !== "all") {
        params.set("majorCategories", filterMajor);
      }

      if (search) params.set("search", search);

      const res = await fetch(`/api/usims?${params}`);
      const data = await res.json();
      setCancelledUsims(data.data || []);
      setSelectedIds(new Set());
    } catch {
      toast.error("데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [filterMajor, filterMedium, filterAgency, search]);

  useEffect(() => {
    loadCancelled();
  }, [loadCancelled]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === cancelledUsims.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cancelledUsims.map((u) => u.id)));
    }
  };

  const handleReset = async () => {
    if (selectedIds.size === 0) return;
    setResetting(true);
    try {
      const res = await fetch("/api/usims/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usimIds: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      loadCancelled();
      onReset();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "초기화 실패");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <CategoryCascadeFilter
              categories={categories}
              agencies={agencies}
              selectedMajor={filterMajor}
              selectedMedium={filterMedium}
              selectedAgency={filterAgency}
              onMajorChange={setFilterMajor}
              onMediumChange={setFilterMedium}
              onAgencyChange={setFilterAgency}
              showAllOption
              showAgency={false}
            />
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label className="text-xs">유심번호 검색</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="일련번호 검색..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Button
              variant="default"
              onClick={handleReset}
              disabled={selectedIds.size === 0 || resetting}
              className="bg-green-600 hover:bg-green-700"
            >
              {resetting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  처리 중...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  유심초기화 진행완료 ({selectedIds.size}건)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CANCELLED 유심 목록 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>개통취소 유심 ({cancelledUsims.length}건)</span>
            {cancelledUsims.length > 0 && (
              <p className="text-xs text-gray-400 font-normal">
                선택한 유심에 &quot;유심초기화 진행완료&quot; 버튼을 누르면 재고로 복구됩니다.
              </p>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : cancelledUsims.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">
              개통취소 상태의 유심이 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.size === cancelledUsims.length && cancelledUsims.length > 0}
                      onCheckedChange={selectAll}
                    />
                  </TableHead>
                  <TableHead>유심 일련번호</TableHead>
                  <TableHead>업체</TableHead>
                  <TableHead>배정일</TableHead>
                  <TableHead>취소일</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cancelledUsims.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(u.id)}
                        onCheckedChange={() => toggleSelect(u.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{u.usimSerialNumber}</TableCell>
                    <TableCell>{u.agencyName || u.agencyId}</TableCell>
                    <TableCell className="text-sm">{u.assignedDate}</TableCell>
                    <TableCell className="text-sm">{u.cancelledDate || "-"}</TableCell>
                    <TableCell>
                      <StatusBadge status={u.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════
// Tab 4: 유심 이송
// ═══════════════════════════════════════════
function TransferTab({
  agencies,
  categories,
  onTransferred,
}: {
  agencies: Agency[];
  categories: CategoryNode[];
  onTransferred: () => void;
}) {
  // Source category selection
  const [srcMajor, setSrcMajor] = useState("");
  const [srcMedium, setSrcMedium] = useState("");

  // Destination category selection
  const [dstMajor, setDstMajor] = useState("");
  const [dstMedium, setDstMedium] = useState("");

  // Transfer details
  const [transferCount, setTransferCount] = useState<number>(0);
  const [transferNotes, setTransferNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Auto-resolve: 중분류 → 해당 카테고리 소속 전체 업체 IDs
  const srcAgencyIds = useMemo(() => {
    if (!srcMedium) return [];
    return agencies.filter(a => a.mediumCategory === srcMedium).map(a => a.id);
  }, [srcMedium, agencies]);

  const dstAgencyIds = useMemo(() => {
    if (!dstMedium) return [];
    return agencies.filter(a => a.mediumCategory === dstMedium).map(a => a.id);
  }, [dstMedium, agencies]);

  // Category names for display
  const srcCategoryName = useMemo(() => {
    for (const cat of categories) {
      const medium = (cat.children || []).find(c => c.id === srcMedium);
      if (medium) return medium.name;
    }
    return "";
  }, [srcMedium, categories]);

  const dstCategoryName = useMemo(() => {
    for (const cat of categories) {
      const medium = (cat.children || []).find(c => c.id === dstMedium);
      if (medium) return medium.name;
    }
    return "";
  }, [dstMedium, categories]);

  const handleTransfer = async () => {
    if (srcAgencyIds.length === 0) {
      toast.error("보내는 분류를 선택해 주세요.");
      return;
    }
    if (dstAgencyIds.length === 0) {
      toast.error("받는 분류를 선택해 주세요.");
      return;
    }
    if (srcMedium === dstMedium) {
      toast.error("보내는 분류와 받는 분류가 동일합니다.");
      return;
    }
    if (!transferCount || transferCount <= 0) {
      toast.error("이송 수량을 1 이상 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/usims/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceAgencyIds: srcAgencyIds,
          targetAgencyIds: dstAgencyIds,
          count: transferCount,
          notes: transferNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      setTransferCount(0);
      setTransferNotes("");
      onTransferred();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "이송 실패");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">유심 업체 간 이송</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Source and Destination side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 items-start">
          {/* Source */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-red-100 text-red-700">출발</Badge>
              <span className="text-sm font-medium">보내는 업체</span>
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <CategoryCascadeFilter
                categories={categories}
                agencies={agencies}
                selectedMajor={srcMajor}
                selectedMedium={srcMedium}
                selectedAgency=""
                onMajorChange={setSrcMajor}
                onMediumChange={setSrcMedium}
                onAgencyChange={() => {}}
                showAllOption={false}
                majorLabel="대분류 *"
                mediumLabel="중분류 *"
                showAgency={false}
              />
            </div>
            {srcCategoryName && (
              <p className="text-sm text-gray-600">
                선택: <span className="font-semibold">{srcCategoryName}</span>
              </p>
            )}
          </div>

          {/* Arrow */}
          <div className="hidden lg:flex items-center justify-center pt-10">
            <div className="flex flex-col items-center gap-1">
              <ArrowRightLeft className="h-8 w-8 text-gray-400" />
              <span className="text-xs text-gray-400">이송</span>
            </div>
          </div>
          <div className="flex lg:hidden items-center justify-center">
            <ArrowRightLeft className="h-6 w-6 text-gray-400 rotate-90" />
          </div>

          {/* Destination */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-blue-100 text-blue-700">도착</Badge>
              <span className="text-sm font-medium">받는 업체</span>
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <CategoryCascadeFilter
                categories={categories}
                agencies={agencies}
                selectedMajor={dstMajor}
                selectedMedium={dstMedium}
                selectedAgency=""
                onMajorChange={setDstMajor}
                onMediumChange={setDstMedium}
                onAgencyChange={() => {}}
                showAllOption={false}
                majorLabel="대분류 *"
                mediumLabel="중분류 *"
                showAgency={false}
              />
            </div>
            {dstCategoryName && (
              <p className="text-sm text-gray-600">
                선택: <span className="font-semibold">{dstCategoryName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Transfer count and notes */}
        <div className="border-t pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>이송 수량 *</Label>
              <Input
                type="number"
                min={1}
                placeholder="이송할 유심 수량"
                value={transferCount || ""}
                onChange={(e) => setTransferCount(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-gray-400">
                출발 업체의 배정(ASSIGNED) 상태 유심 중 배정일이 오래된 순으로 이송됩니다.
              </p>
            </div>
            <div className="space-y-2">
              <Label>메모 (선택)</Label>
              <Input
                placeholder="이송 사유 등"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Summary and button */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {srcCategoryName && dstCategoryName && transferCount > 0 ? (
                <span>
                  <span className="font-semibold text-gray-900">{srcCategoryName}</span>
                  {" -> "}
                  <span className="font-semibold text-gray-900">{dstCategoryName}</span>
                  {" "}
                  <span className="font-semibold text-blue-600">{transferCount}건</span> 이송 예정
                </span>
              ) : (
                <span>분류와 수량을 선택해 주세요.</span>
              )}
            </div>
            <Button
              onClick={handleTransfer}
              disabled={submitting || srcAgencyIds.length === 0 || dstAgencyIds.length === 0 || transferCount <= 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  이송 중...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  유심 이송
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
