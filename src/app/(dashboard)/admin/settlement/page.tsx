"use client";

import { useState, useEffect, useCallback } from "react";
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
import {
  Calculator,
  Search,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───
interface Agency {
  id: string;
  name: string;
}

interface UsimData {
  received: number;
  used: number;
  cost: number;
  revenue: number;
  subtotal: number;
}

interface CommissionData {
  normalCount: number;
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
}

interface AgencySettlement {
  agencyId: string;
  agencyName: string;
  commissionRate: number;
  usim: UsimData;
  commission: CommissionData;
  total: number;
  details: DetailItem[];
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
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [selectedAgency, setSelectedAgency] = useState("all");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SettlementResponse | null>(null);
  const [expandedAgencies, setExpandedAgencies] = useState<Set<string>>(
    new Set()
  );

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

  // Load agencies list
  useEffect(() => {
    fetch("/api/agencies")
      .then((r) => r.json())
      .then((d) => setAgencies(d.agencies || []))
      .catch(() => toast.error("거래처 목록 로드 실패"));
  }, []);

  // Fetch settlement data
  const fetchSettlement = useCallback(async () => {
    setLoading(true);
    setData(null);
    setExpandedAgencies(new Set());
    try {
      const params = new URLSearchParams({ month: selectedMonth });
      if (selectedAgency !== "all") {
        params.set("agencyId", selectedAgency);
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
  }, [selectedMonth, selectedAgency]);

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

  // Role guard
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
                거래처
              </label>
              <Select
                value={selectedAgency}
                onValueChange={setSelectedAgency}
              >
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {agencies.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
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
          {/* Per-agency cards */}
          {data.agencies.map((agency) => (
            <AgencySettlementCard
              key={agency.agencyId}
              agency={agency}
              unitCost={data.unitCost}
              expanded={expandedAgencies.has(agency.agencyId)}
              onToggle={() => toggleExpand(agency.agencyId)}
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
    </div>
  );
}

// ─── Agency Settlement Card ───
function AgencySettlementCard({
  agency,
  unitCost,
  expanded,
  onToggle,
}: {
  agency: AgencySettlement;
  unitCost: number;
  expanded: boolean;
  onToggle: () => void;
}) {
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
            <Badge variant="outline" className="text-xs font-normal">
              수수료 단가: {formatKRW(agency.commissionRate)}원
            </Badge>
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
                  수령 ({agency.usim.received}건 x {formatKRW(unitCost)}원)
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
                  정상 개통 ({agency.commission.normalCount}건)
                </span>
                <AmountCell value={agency.commission.normalAmount} />
              </div>
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
                      <TableHead className="text-center">상태</TableHead>
                      <TableHead className="text-right">수수료</TableHead>
                      <TableHead className="text-right">환수</TableHead>
                      <TableHead>비고</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agency.details.map((detail, idx) => {
                      const isTerminated = !!detail.terminationDate;
                      const commission = !isTerminated
                        ? agency.commissionRate
                        : 0;
                      const clawback = isTerminated
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
