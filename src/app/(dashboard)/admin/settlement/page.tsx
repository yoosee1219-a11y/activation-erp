"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calculator,
  Search,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronRight,
  Download,
  Pencil,
  Check,
  X,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// ─── Types ───
interface UsimData {
  received: number;
  used: number;
  cost: number;
  revenue: number;
  subtotal: number;
}

interface CommissionData {
  normalCount: number;
  committedCount: number;
  nonCommittedCount: number;
  normalAmount: number;
  supplementClawbackCount: number;
  supplementClawback: number;
  sixMonthClawbackCount: number;
  sixMonthClawback: number;
  manualClawbackCount: number;
  manualClawback: number;
  subtotal: number;
}

interface DetailItem {
  id: string;
  customerName: string;
  activationDate: string | null;
  workStatus: string | null;
  terminationDate: string | null;
  terminationReason: string | null;
  selectedCommitment: boolean | null;
}

interface AgencySettlement {
  agencyId: string;
  agencyName: string;
  commissionRate: number;
  deductionRate: number;
  usim: UsimData;
  commission: CommissionData;
  total: number;
  details: DetailItem[];
  // 수동 조정 (프론트 전용, API에서 오지 않음)
  manualAdjustment?: number;
}

interface SettlementResponse {
  month: string;
  unitCost: number;
  agencies: AgencySettlement[];
  grandTotal: number;
}

// ─── Helpers ───
function formatKRW(value: number): string {
  return value.toLocaleString("ko-KR");
}

function getMonthOptions(): string[] {
  const options: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    options.push(`${y}-${m}`);
  }
  return options;
}

function AmountCell({ value }: { value: number }) {
  if (value > 0) {
    return <span className="text-blue-600 font-semibold">+{formatKRW(value)}</span>;
  }
  if (value < 0) {
    return <span className="text-red-600 font-semibold">{formatKRW(value)}</span>;
  }
  return <span className="text-gray-400">0</span>;
}

// 책갈피 탭 (대시보드와 동일 스타일)
function SettlementTab({
  active,
  onClick,
  label,
  count,
  size = "lg",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  size?: "lg" | "sm";
}) {
  const isLg = size === "lg";
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`group relative flex min-w-0 items-center justify-center gap-2 rounded-t-lg ${
        isLg ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs"
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
          active ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-700"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-400">-</span>;
  const map: Record<string, string> = {
    "입력중": "bg-gray-100 text-gray-600",
    "개통요청": "bg-yellow-100 text-yellow-700",
    "진행중": "bg-blue-100 text-blue-700",
    "개통완료": "bg-green-100 text-green-700",
    "보완요청": "bg-orange-100 text-orange-700",
    "해지": "bg-red-100 text-red-700",
  };
  return (
    <Badge className={map[status] || "bg-gray-100 text-gray-600"}>
      {status}
    </Badge>
  );
}

// ─── Main Page ───
export default function SettlementPage() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [selectedMajor, setSelectedMajor] = useState("all");
  const [selectedMedium, setSelectedMedium] = useState("all");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SettlementResponse | null>(null);
  const [expandedAgencies, setExpandedAgencies] = useState<Set<string>>(
    new Set()
  );
  const [manualAdjustments, setManualAdjustments] = useState<
    Record<string, number>
  >({});
  const [settlementStatus, setSettlementStatus] = useState<{
    isSettled: boolean;
    settledCount: number;
    settledAt: string | null;
  } | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const monthOptions = getMonthOptions();

  // Load user role check
  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((d) => {
        setUserRole(d.user?.role || null);
      })
      .catch(() => setUserRole(null));
  }, []);

  // Load categories list
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => toast.error("카테고리 목록 로드 실패"));
  }, []);

  const mediumCats = useMemo(() => {
    if (!selectedMajor || selectedMajor === "all") return [];
    const major = categories.find((c: any) => c.id === selectedMajor);
    return major?.children || [];
  }, [selectedMajor, categories]);

  // Fetch settlement data
  const fetchSettlement = useCallback(async () => {
    setLoading(true);
    setData(null);
    setExpandedAgencies(new Set());
    try {
      const params = new URLSearchParams({ month: selectedMonth });
      if (selectedMedium !== "all") {
        params.set("mediumCategory", selectedMedium);
      } else if (selectedMajor !== "all") {
        params.set("majorCategory", selectedMajor);
      }
      const res = await fetch(`/api/settlement?${params}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "조회 실패");
      }
      const result: SettlementResponse = await res.json();
      setData(result);

      // If single agency, auto-expand
      if (result.agencies.length === 1) {
        setExpandedAgencies(new Set([result.agencies[0].agencyId]));
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "정산 조회 실패");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedMajor, selectedMedium]);

  // 정산 확정 상태 조회
  const fetchSettlementStatus = useCallback(async (month: string) => {
    try {
      const res = await fetch(`/api/settlement/confirm?month=${month}`);
      if (res.ok) {
        const result = await res.json();
        setSettlementStatus(result);
      }
    } catch {
      setSettlementStatus(null);
    }
  }, []);

  // fetchSettlement 성공 시 확정 상태도 조회
  useEffect(() => {
    if (data?.month) {
      fetchSettlementStatus(data.month);
    }
  }, [data?.month, fetchSettlementStatus]);

  // 정산 확정 처리
  const handleSettlementConfirm = async () => {
    if (!data) return;
    setConfirming(true);
    try {
      const res = await fetch("/api/settlement/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: data.month }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "정산 확정 실패");
      }
      toast.success(
        `${data.month} 정산 확정 완료 (${result.settledCount}건 차감확정)`
      );
      setConfirmDialogOpen(false);
      // 상태 갱신
      await fetchSettlementStatus(data.month);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "정산 확정 실패");
    } finally {
      setConfirming(false);
    }
  };

  // 차감 대상 건수 계산 (확정 다이얼로그용)
  const clawbackSummary = useMemo(() => {
    if (!data) return null;
    let totalCount = 0;
    let totalAmount = 0;
    for (const a of data.agencies) {
      const count =
        a.commission.supplementClawbackCount +
        a.commission.sixMonthClawbackCount +
        a.commission.manualClawbackCount;
      const amount =
        Math.abs(a.commission.supplementClawback) +
        Math.abs(a.commission.sixMonthClawback) +
        Math.abs(a.commission.manualClawback);
      totalCount += count;
      totalAmount += amount;
    }
    return { totalCount, totalAmount };
  }, [data]);

  // 수수료 단가 수정 (DB 반영)
  const handleCommissionRateUpdate = async (
    agencyId: string,
    newRate: number
  ) => {
    try {
      const res = await fetch("/api/settlement/adjust", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agencyId, commissionRate: newRate }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "수수료 단가 수정 실패");
      }
      toast.success("수수료 단가가 수정되었습니다. 조회를 다시 실행하세요.");
      // 로컬 데이터에도 즉시 반영 — 차감은 deductionRate 기준 (변경 없음)
      if (data) {
        const updated = {
          ...data,
          agencies: data.agencies.map((a) => {
            if (a.agencyId !== agencyId) return a;
            const dr = a.deductionRate; // 차감단가는 변경 없음
            const commissionRevenue = a.commission.committedCount * newRate;
            const supplementClawback =
              a.commission.supplementClawbackCount * -dr;
            const sixMonthClawback =
              a.commission.sixMonthClawbackCount * -dr;
            const manualClawback =
              a.commission.manualClawbackCount * -dr;
            const commissionSubtotal =
              commissionRevenue + supplementClawback + sixMonthClawback + manualClawback;
            const adj = manualAdjustments[agencyId] || 0;
            return {
              ...a,
              commissionRate: newRate,
              commission: {
                ...a.commission,
                normalAmount: commissionRevenue,
                supplementClawback,
                sixMonthClawback,
                manualClawback,
                subtotal: commissionSubtotal,
              },
              total: a.usim.subtotal + commissionSubtotal + adj,
            };
          }),
        };
        updated.grandTotal = updated.agencies.reduce(
          (sum, r) => sum + r.total,
          0
        );
        setData(updated);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "수수료 단가 수정 실패");
    }
  };

  // 차감단가 수정
  const handleDeductionRateUpdate = async (
    agencyId: string,
    newRate: number | null
  ) => {
    try {
      const res = await fetch("/api/settlement/adjust", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agencyId, deductionRate: newRate }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "차감 단가 수정 실패");
      }
      toast.success("차감 단가가 수정되었습니다. 조회를 다시 실행하세요.");
      // 로컬 데이터에도 즉시 반영
      if (data) {
        const updated = {
          ...data,
          agencies: data.agencies.map((a) => {
            if (a.agencyId !== agencyId) return a;
            const effectiveRate = newRate ?? a.commissionRate;
            const commissionRevenue = a.commission.committedCount * a.commissionRate;
            const supplementClawback =
              a.commission.supplementClawbackCount * -effectiveRate;
            const sixMonthClawback =
              a.commission.sixMonthClawbackCount * -effectiveRate;
            const manualClawback =
              a.commission.manualClawbackCount * -effectiveRate;
            const commissionSubtotal =
              commissionRevenue + supplementClawback + sixMonthClawback + manualClawback;
            const adj = manualAdjustments[agencyId] || 0;
            return {
              ...a,
              deductionRate: effectiveRate,
              commission: {
                ...a.commission,
                normalAmount: commissionRevenue,
                supplementClawback,
                sixMonthClawback,
                manualClawback,
                subtotal: commissionSubtotal,
              },
              total: a.usim.subtotal + commissionSubtotal + adj,
            };
          }),
        };
        updated.grandTotal = updated.agencies.reduce(
          (sum, r) => sum + r.total,
          0
        );
        setData(updated);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "차감 단가 수정 실패");
    }
  };

  // 수동 조정금액 변경 (프론트 전용)
  const handleManualAdjustment = (agencyId: string, amount: number) => {
    setManualAdjustments((prev) => ({ ...prev, [agencyId]: amount }));
    if (data) {
      const updated = {
        ...data,
        agencies: data.agencies.map((a) => {
          if (a.agencyId !== agencyId) return a;
          return {
            ...a,
            manualAdjustment: amount,
            total: a.usim.subtotal + a.commission.subtotal + amount,
          };
        }),
      };
      updated.grandTotal = updated.agencies.reduce(
        (sum, r) => sum + r.total,
        0
      );
      setData(updated);
    }
  };

  const downloadExcel = () => {
    if (!data) return;

    // Sheet 1: Summary
    const summaryRows = data.agencies.map((a) => ({
      "거래처": a.agencyName,
      "수수료 단가": a.commissionRate,
      "USIM 배정 (당월)": a.usim.received,
      "USIM 배정 비용": a.usim.cost,
      "USIM 사용 (개통)": a.usim.used,
      "USIM 환급": a.usim.revenue,
      "USIM 소계": a.usim.subtotal,
      "약정 개통": a.commission.committedCount,
      "약정 수수료": a.commission.normalAmount,
      "비약정 개통": a.commission.nonCommittedCount,
      "환수 (보완미완료)": a.commission.supplementClawbackCount,
      "환수 (보완) 금액": a.commission.supplementClawback,
      "환수 (6개월)": a.commission.sixMonthClawbackCount,
      "환수 (6개월) 금액": a.commission.sixMonthClawback,
      "환수 (수동)": a.commission.manualClawbackCount,
      "환수 (수동) 금액": a.commission.manualClawback,
      "수수료 소계": a.commission.subtotal,
      "수동 조정": a.manualAdjustment || 0,
      "최종 정산금액": a.total,
    }));

    // Add total row
    summaryRows.push({
      "거래처": "합계",
      "수수료 단가": 0,
      "USIM 배정 (당월)": data.agencies.reduce((s, a) => s + a.usim.received, 0),
      "USIM 배정 비용": data.agencies.reduce((s, a) => s + a.usim.cost, 0),
      "USIM 사용 (개통)": data.agencies.reduce((s, a) => s + a.usim.used, 0),
      "USIM 환급": data.agencies.reduce((s, a) => s + a.usim.revenue, 0),
      "USIM 소계": data.agencies.reduce((s, a) => s + a.usim.subtotal, 0),
      "약정 개통": data.agencies.reduce((s, a) => s + a.commission.committedCount, 0),
      "약정 수수료": data.agencies.reduce((s, a) => s + a.commission.normalAmount, 0),
      "비약정 개통": data.agencies.reduce((s, a) => s + a.commission.nonCommittedCount, 0),
      "환수 (보완미완료)": data.agencies.reduce((s, a) => s + a.commission.supplementClawbackCount, 0),
      "환수 (보완) 금액": data.agencies.reduce((s, a) => s + a.commission.supplementClawback, 0),
      "환수 (6개월)": data.agencies.reduce((s, a) => s + a.commission.sixMonthClawbackCount, 0),
      "환수 (6개월) 금액": data.agencies.reduce((s, a) => s + a.commission.sixMonthClawback, 0),
      "환수 (수동)": data.agencies.reduce((s, a) => s + a.commission.manualClawbackCount, 0),
      "환수 (수동) 금액": data.agencies.reduce((s, a) => s + a.commission.manualClawback, 0),
      "수수료 소계": data.agencies.reduce((s, a) => s + a.commission.subtotal, 0),
      "수동 조정": data.agencies.reduce((s, a) => s + (a.manualAdjustment || 0), 0),
      "최종 정산금액": data.grandTotal,
    });

    // Sheet 2: Details
    const detailRows: any[] = [];
    data.agencies.forEach((a) => {
      a.details.forEach((d) => {
        const isCommitted = !!d.selectedCommitment;
        const isTerminated = !!d.terminationDate;
        const commission = isCommitted && !isTerminated ? a.commissionRate : 0;
        const clawback = isCommitted && isTerminated ? -a.commissionRate : 0;
        detailRows.push({
          "거래처": a.agencyName,
          "고객명": d.customerName,
          "개통일자": d.activationDate || "-",
          "약정선택": isCommitted ? "O" : "X",
          "상태": d.workStatus || "-",
          "해지일자": d.terminationDate || "-",
          "해지사유": d.terminationReason || "-",
          "수수료": commission,
          "환수": clawback,
        });
      });
    });

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(summaryRows);
    const ws2 = XLSX.utils.json_to_sheet(detailRows);
    XLSX.utils.book_append_sheet(wb, ws1, "정산요약");
    XLSX.utils.book_append_sheet(wb, ws2, "상세내역");
    XLSX.writeFile(wb, `정산서_${data.month}.xlsx`);
  };

  const toggleExpand = (agencyId: string) => {
    setExpandedAgencies((prev) => {
      const next = new Set(prev);
      if (next.has(agencyId)) {
        next.delete(agencyId);
      } else {
        next.add(agencyId);
      }
      return next;
    });
  };

  // ─── 책갈피 탭 (대분류 → 거래처) 상태 ───
  const [settlementMajor, setSettlementMajor] = useState<string>("all");
  const [settlementMedium, setSettlementMedium] = useState<string>("all");

  // 대분류 변경 시 중분류 초기화
  useEffect(() => {
    setSettlementMedium("all");
  }, [settlementMajor]);

  // 거래처(중분류) → 대분류 매핑
  const agencyMajorInfo = useMemo(() => {
    const m = new Map<string, { majorId: string; majorName: string }>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    categories.forEach((major: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (major.children || []).forEach((medium: any) => {
        m.set(medium.id, { majorId: major.id, majorName: major.name });
      });
    });
    return m;
  }, [categories]);

  // 대분류 탭 + 카운트
  const settlementMajorTabs = useMemo(() => {
    if (!data) return [];
    const counts = new Map<string, { name: string; count: number }>();
    data.agencies.forEach((a) => {
      const info = agencyMajorInfo.get(a.agencyId);
      if (info) {
        const cur = counts.get(info.majorId) || { name: info.majorName, count: 0 };
        cur.count += 1;
        counts.set(info.majorId, cur);
      }
    });
    return Array.from(counts.entries()).map(([id, v]) => ({
      id,
      name: v.name,
      count: v.count,
    }));
  }, [data, agencyMajorInfo]);

  // 선택된 대분류의 중분류(거래처) 탭
  const settlementMediumTabs = useMemo(() => {
    if (!data || settlementMajor === "all") return [];
    return data.agencies
      .filter((a) => agencyMajorInfo.get(a.agencyId)?.majorId === settlementMajor)
      .map((a) => ({ id: a.agencyId, name: a.agencyName, count: a.commission.normalCount }));
  }, [data, settlementMajor, agencyMajorInfo]);

  // 활성 탭 기준 표시할 거래처
  const visibleAgencies = useMemo(() => {
    if (!data) return [];
    if (settlementMedium !== "all") {
      return data.agencies.filter((a) => a.agencyId === settlementMedium);
    }
    if (settlementMajor !== "all") {
      return data.agencies.filter(
        (a) => agencyMajorInfo.get(a.agencyId)?.majorId === settlementMajor
      );
    }
    return data.agencies;
  }, [data, settlementMajor, settlementMedium, agencyMajorInfo]);

  // Role guard: ADMIN, SUB_ADMIN 접근 가능
  if (userRole !== null && userRole !== "ADMIN" && userRole !== "SUB_ADMIN") {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">접근 권한이 없습니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">정산 관리</h1>
        <p className="text-sm text-gray-500 mt-1">
          월별 거래처 정산 내역을 조회합니다.
        </p>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">
                정산월
              </label>
              <Select
                value={selectedMonth}
                onValueChange={setSelectedMonth}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">
                대분류
              </label>
              <Select
                value={selectedMajor}
                onValueChange={(v) => {
                  setSelectedMajor(v);
                  setSelectedMedium("all");
                }}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">
                중분류
              </label>
              <Select
                value={selectedMedium}
                onValueChange={setSelectedMedium}
                disabled={selectedMajor === "all"}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {mediumCats.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={fetchSettlement} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  조회 중...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  조회
                </>
              )}
            </Button>
            {data && (
              <>
                <Button variant="outline" onClick={downloadExcel}>
                  <Download className="h-4 w-4 mr-2" />
                  엑셀 다운로드
                </Button>
                {settlementStatus?.isSettled ? (
                  <Badge className="bg-green-100 text-green-700 px-3 py-1.5 text-sm gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    {data.month} 확정 완료 ({settlementStatus.settledCount}건)
                  </Badge>
                ) : (
                  <Button
                    variant="default"
                    onClick={() => setConfirmDialogOpen(true)}
                    disabled={!clawbackSummary || clawbackSummary.totalCount === 0}
                  >
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    정산 확정
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">정산 데이터를 계산 중...</span>
        </div>
      )}

      {/* No data state */}
      {!loading && !data && (
        <Card>
          <CardContent className="p-12 text-center text-gray-400">
            <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>정산월과 거래처를 선택한 후 조회 버튼을 눌러주세요.</p>
          </CardContent>
        </Card>
      )}

      {/* Settlement Results */}
      {!loading && data && (
        <div className="space-y-4">
          {/* 책갈피 탭 — 대분류 */}
          {settlementMajorTabs.length > 0 && (
            <div className="space-y-1">
              <div
                role="tablist"
                aria-label="대분류 탭"
                className="flex flex-wrap items-end gap-1 border-b border-gray-200"
              >
                <SettlementTab
                  active={settlementMajor === "all"}
                  onClick={() => setSettlementMajor("all")}
                  label="전체"
                  count={data.agencies.length}
                />
                {settlementMajorTabs.map((t) => (
                  <SettlementTab
                    key={t.id}
                    active={settlementMajor === t.id}
                    onClick={() => setSettlementMajor(t.id)}
                    label={t.name}
                    count={t.count}
                  />
                ))}
              </div>

              {settlementMediumTabs.length > 0 && (
                <div
                  role="tablist"
                  aria-label="거래처 탭"
                  className="flex flex-wrap items-end gap-1 border-b border-gray-200 pl-4"
                >
                  <span className="flex items-center gap-1 pr-2 text-[11px] font-medium text-gray-400">
                    거래처
                  </span>
                  <SettlementTab
                    size="sm"
                    active={settlementMedium === "all"}
                    onClick={() => setSettlementMedium("all")}
                    label="전체"
                    count={settlementMediumTabs.reduce((s, t) => s + t.count, 0)}
                  />
                  {settlementMediumTabs.map((t) => (
                    <SettlementTab
                      key={t.id}
                      size="sm"
                      active={settlementMedium === t.id}
                      onClick={() => setSettlementMedium(t.id)}
                      label={t.name}
                      count={t.count}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Per-agency cards (활성 탭 기준 필터) */}
          {visibleAgencies.map((agency) => (
            <AgencySettlementCard
              key={agency.agencyId}
              agency={agency}
              unitCost={data.unitCost}
              expanded={expandedAgencies.has(agency.agencyId)}
              onToggle={() => toggleExpand(agency.agencyId)}
              onCommissionRateUpdate={handleCommissionRateUpdate}
              onDeductionRateUpdate={handleDeductionRateUpdate}
              onManualAdjustment={handleManualAdjustment}
            />
          ))}

          {/* Empty state */}
          {data.agencies.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                해당 월에 정산 데이터가 없습니다.
              </CardContent>
            </Card>
          )}
          {visibleAgencies.length === 0 && data.agencies.length > 0 && (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                해당 탭에 정산 데이터가 없습니다.
              </CardContent>
            </Card>
          )}

          {/* Grand Total */}
          {data.agencies.length > 1 && (
            <Card className="border-2 border-gray-900">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">
                      {data.month} 전체 정산 합계
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {data.agencies.length}개 거래처
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-3xl font-bold ${
                        data.grandTotal >= 0
                          ? "text-blue-600"
                          : "text-red-600"
                      }`}
                    >
                      {data.grandTotal >= 0 ? "+" : ""}
                      {formatKRW(data.grandTotal)}원
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 정산 확정 다이얼로그 */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>정산 확정</DialogTitle>
            <DialogDescription>
              {data?.month} 차감 대상 건을 확정합니다.
              확정 후 해당 건은 보완 패널에서 제외됩니다.
            </DialogDescription>
          </DialogHeader>
          {clawbackSummary && (
            <div className="space-y-3 py-2">
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">정산월</span>
                  <span className="font-medium">{data?.month}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">차감확정 대상 건수</span>
                  <span className="font-bold text-red-600">
                    {clawbackSummary.totalCount}건
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">차감 총액</span>
                  <span className="font-bold text-red-600">
                    -{formatKRW(clawbackSummary.totalAmount)}원
                  </span>
                </div>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                확정하면 되돌릴 수 없습니다. 신중하게 진행해주세요.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={confirming}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleSettlementConfirm}
              disabled={confirming}
            >
              {confirming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  처리 중...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  확정
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Agency Settlement Card ───
function AgencySettlementCard({
  agency,
  unitCost,
  expanded,
  onToggle,
  onCommissionRateUpdate,
  onDeductionRateUpdate,
  onManualAdjustment,
}: {
  agency: AgencySettlement;
  unitCost: number;
  expanded: boolean;
  onToggle: () => void;
  onCommissionRateUpdate: (agencyId: string, newRate: number) => void;
  onDeductionRateUpdate: (agencyId: string, newRate: number | null) => void;
  onManualAdjustment: (agencyId: string, amount: number) => void;
}) {
  const [editingRate, setEditingRate] = useState(false);
  const [rateValue, setRateValue] = useState(String(agency.commissionRate));
  const [editingDeduction, setEditingDeduction] = useState(false);
  const [deductionValue, setDeductionValue] = useState(String(agency.deductionRate));
  const [editingAdjust, setEditingAdjust] = useState(false);
  const [adjustValue, setAdjustValue] = useState(
    String(agency.manualAdjustment || 0)
  );

  const totalIcon =
    agency.total > 0 ? (
      <TrendingUp className="h-5 w-5 text-blue-500" />
    ) : agency.total < 0 ? (
      <TrendingDown className="h-5 w-5 text-red-500" />
    ) : (
      <Minus className="h-5 w-5 text-gray-400" />
    );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold">{agency.agencyName}</span>
            {editingRate ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">수수료 단가:</span>
                <Input
                  type="number"
                  value={rateValue}
                  onChange={(e) => setRateValue(e.target.value)}
                  className="w-28 h-7 text-xs"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = parseInt(rateValue, 10);
                      if (!isNaN(v) && v >= 0) {
                        onCommissionRateUpdate(agency.agencyId, v);
                        setEditingRate(false);
                      }
                    }
                    if (e.key === "Escape") {
                      setRateValue(String(agency.commissionRate));
                      setEditingRate(false);
                    }
                  }}
                />
                <span className="text-xs text-gray-500">원</span>
                <button
                  onClick={() => {
                    const v = parseInt(rateValue, 10);
                    if (!isNaN(v) && v >= 0) {
                      onCommissionRateUpdate(agency.agencyId, v);
                      setEditingRate(false);
                    }
                  }}
                  className="p-0.5 hover:bg-green-50 rounded"
                >
                  <Check className="h-3.5 w-3.5 text-green-600" />
                </button>
                <button
                  onClick={() => {
                    setRateValue(String(agency.commissionRate));
                    setEditingRate(false);
                  }}
                  className="p-0.5 hover:bg-red-50 rounded"
                >
                  <X className="h-3.5 w-3.5 text-red-500" />
                </button>
              </div>
            ) : (
              <Badge
                variant="outline"
                className="text-xs font-normal cursor-pointer hover:bg-gray-50 gap-1"
                onClick={() => {
                  setRateValue(String(agency.commissionRate));
                  setEditingRate(true);
                }}
              >
                수수료 단가: {formatKRW(agency.commissionRate)}원
                <Pencil className="h-3 w-3 text-gray-400" />
              </Badge>
            )}
            {/* 차감단가 — 수수료와 다를 때만 강조 */}
            {editingDeduction ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">차감 단가:</span>
                <Input
                  type="number"
                  value={deductionValue}
                  onChange={(e) => setDeductionValue(e.target.value)}
                  className="w-28 h-7 text-xs"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = parseInt(deductionValue, 10);
                      if (!isNaN(v) && v >= 0) {
                        onDeductionRateUpdate(agency.agencyId, v);
                        setEditingDeduction(false);
                      }
                    }
                    if (e.key === "Escape") {
                      setDeductionValue(String(agency.deductionRate));
                      setEditingDeduction(false);
                    }
                  }}
                />
                <span className="text-xs text-gray-500">원</span>
                <button
                  onClick={() => {
                    const v = parseInt(deductionValue, 10);
                    if (!isNaN(v) && v >= 0) {
                      onDeductionRateUpdate(agency.agencyId, v);
                      setEditingDeduction(false);
                    }
                  }}
                  className="p-0.5 hover:bg-green-50 rounded"
                >
                  <Check className="h-3.5 w-3.5 text-green-600" />
                </button>
                <button
                  onClick={() => {
                    setDeductionValue(String(agency.deductionRate));
                    setEditingDeduction(false);
                  }}
                  className="p-0.5 hover:bg-red-50 rounded"
                >
                  <X className="h-3.5 w-3.5 text-red-500" />
                </button>
              </div>
            ) : (
              <Badge
                variant={agency.deductionRate !== agency.commissionRate ? "secondary" : "outline"}
                className="text-xs font-normal cursor-pointer hover:bg-gray-50 gap-1"
                onClick={() => {
                  setDeductionValue(String(agency.deductionRate));
                  setEditingDeduction(true);
                }}
              >
                차감 단가: {formatKRW(agency.deductionRate)}원
                {agency.deductionRate !== agency.commissionRate && (
                  <span className="text-amber-600 text-[10px]">별도</span>
                )}
                <Pencil className="h-3 w-3 text-gray-400" />
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            {totalIcon}
            <span
              className={`text-xl font-bold ${
                agency.total >= 0 ? "text-blue-600" : "text-red-600"
              }`}
            >
              {agency.total >= 0 ? "+" : ""}
              {formatKRW(agency.total)}원
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* USIM Section */}
          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="font-semibold text-sm text-gray-700 border-b pb-2">
              USIM 손익
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">
                  당월 배정 ({agency.usim.received}건 x {formatKRW(unitCost)}원)
                </span>
                <AmountCell value={agency.usim.cost} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">
                  사용 ({agency.usim.used}건 x {formatKRW(unitCost)}원)
                </span>
                <AmountCell value={agency.usim.revenue} />
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>USIM 소계</span>
                <AmountCell value={agency.usim.subtotal} />
              </div>
            </div>
          </div>

          {/* Commission Section */}
          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="font-semibold text-sm text-gray-700 border-b pb-2">
              개통 수수료
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">
                  약정 개통 ({agency.commission.committedCount}건)
                </span>
                <AmountCell value={agency.commission.normalAmount} />
              </div>
              {agency.commission.nonCommittedCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400 text-xs">
                    비약정 개통 ({agency.commission.nonCommittedCount}건) — 수수료 미지급
                  </span>
                  <span className="text-gray-400 text-sm">0</span>
                </div>
              )}
              {agency.commission.supplementClawbackCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    환수: 보완기한초과 ({agency.commission.supplementClawbackCount}건)
                  </span>
                  <AmountCell value={agency.commission.supplementClawback} />
                </div>
              )}
              {agency.commission.sixMonthClawbackCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    환수: 6개월해지 ({agency.commission.sixMonthClawbackCount}건)
                  </span>
                  <AmountCell value={agency.commission.sixMonthClawback} />
                </div>
              )}
              {agency.commission.manualClawbackCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    환수: 수동해지 ({agency.commission.manualClawbackCount}건)
                  </span>
                  <AmountCell value={agency.commission.manualClawback} />
                </div>
              )}
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>수수료 소계</span>
                <AmountCell value={agency.commission.subtotal} />
              </div>
            </div>
          </div>
        </div>

        {/* Manual Adjustment */}
        <div className="rounded-lg border border-dashed border-gray-300 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">수동 조정</span>
            {editingAdjust ? (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={adjustValue}
                  onChange={(e) => setAdjustValue(e.target.value)}
                  className="w-36 h-7 text-sm"
                  placeholder="0"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = parseInt(adjustValue, 10) || 0;
                      onManualAdjustment(agency.agencyId, v);
                      setEditingAdjust(false);
                    }
                    if (e.key === "Escape") {
                      setAdjustValue(String(agency.manualAdjustment || 0));
                      setEditingAdjust(false);
                    }
                  }}
                />
                <span className="text-xs text-gray-500">원</span>
                <button
                  onClick={() => {
                    const v = parseInt(adjustValue, 10) || 0;
                    onManualAdjustment(agency.agencyId, v);
                    setEditingAdjust(false);
                  }}
                  className="p-0.5 hover:bg-green-50 rounded"
                >
                  <Check className="h-3.5 w-3.5 text-green-600" />
                </button>
                <button
                  onClick={() => {
                    setAdjustValue(String(agency.manualAdjustment || 0));
                    setEditingAdjust(false);
                  }}
                  className="p-0.5 hover:bg-red-50 rounded"
                >
                  <X className="h-3.5 w-3.5 text-red-500" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAdjustValue(String(agency.manualAdjustment || 0));
                  setEditingAdjust(true);
                }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <AmountCell value={agency.manualAdjustment || 0} />
                <span className="text-xs">원</span>
                <Pencil className="h-3 w-3 text-gray-400" />
              </button>
            )}
          </div>
          <span className="text-xs text-gray-400">
            (엑셀 다운로드에 반영)
          </span>
        </div>

        {/* Total Row */}
        <div className="rounded-lg bg-gray-50 p-4 flex items-center justify-between">
          <span className="font-semibold text-gray-700">최종 정산금액</span>
          <span
            className={`text-lg font-bold ${
              agency.total >= 0 ? "text-blue-600" : "text-red-600"
            }`}
          >
            {agency.total >= 0 ? "+" : ""}
            {formatKRW(agency.total)}원
          </span>
        </div>

        {/* Detail Toggle */}
        {agency.details.length > 0 && (
          <div>
            <button
              onClick={onToggle}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              상세 내역 ({agency.details.length}건)
            </button>

            {expanded && (
              <div className="mt-3 rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-12 text-center">No</TableHead>
                      <TableHead>고객명</TableHead>
                      <TableHead>개통일자</TableHead>
                      <TableHead className="text-center">약정</TableHead>
                      <TableHead className="text-center">상태</TableHead>
                      <TableHead className="text-right">수수료</TableHead>
                      <TableHead className="text-right">환수</TableHead>
                      <TableHead>비고</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agency.details.map((detail, idx) => {
                      const isCommitted = !!detail.selectedCommitment;
                      const isTerminated = !!detail.terminationDate;
                      const commission = isCommitted && !isTerminated
                        ? agency.commissionRate
                        : 0;
                      const clawback = isCommitted && isTerminated
                        ? -agency.commissionRate
                        : 0;
                      const note = detail.terminationReason || "";

                      return (
                        <TableRow key={detail.id}>
                          <TableCell className="text-center text-gray-400 text-xs">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {detail.customerName}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {detail.activationDate || "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {isCommitted ? (
                              <Badge className="bg-blue-100 text-blue-700 text-[10px]">약정</Badge>
                            ) : (
                              <span className="text-gray-300 text-[10px]">비약정</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <StatusBadge status={detail.workStatus} />
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {commission > 0 ? (
                              <span className="text-blue-600">
                                +{formatKRW(commission)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {clawback < 0 ? (
                              <span className="text-red-600">
                                {formatKRW(clawback)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {note || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
