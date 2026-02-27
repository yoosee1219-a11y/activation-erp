"use client";

import { useState, useMemo, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone,
  Clock,
  CheckCircle2,
  CreditCard,
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";

interface KpiCardsProps {
  stats: {
    total: number;
    pending: number;
    completed: number;
    autopayPending: number;
  };
  kpiTotalByAgency?: Array<{
    agencyId: string;
    agencyName: string;
    count: number;
  }>;
  kpiPendingDetail?: Array<{
    id: string;
    agencyId: string;
    agencyName: string;
    customerName: string;
    entryDate: string | null;
    newPhoneNumber: string | null;
  }>;
  kpiAutopayDetail?: Array<{
    id: string;
    agencyId: string;
    agencyName: string;
    customerName: string;
    newPhoneNumber: string | null;
    activationDate: string | null;
    daysLeft: number | null;
  }>;
  supplementRequestStats?: {
    total: number;
    workStatusCount: number;
    reviewCount: number;
  };
  supplementRequestDetail?: Array<{
    id: string;
    agencyId: string;
    agencyName: string | null;
    customerName: string;
    newPhoneNumber: string | null;
    personInCharge: string | null;
    workStatus: string | null;
    applicationDocsReview: string | null;
    nameChangeDocsReview: string | null;
    arcAutopayReview: string | null;
  }>;
  pendingByPeriod?: {
    totalPending: number;
    monthlyPending: number;
    todayPending: number;
  };
  todayPendingDetail?: Array<{
    id: string;
    agencyId: string;
    agencyName: string | null;
    customerName: string;
    newPhoneNumber: string | null;
    entryDate: string | null;
    personInCharge: string | null;
  }>;
}

type KpiKey = "total" | "pending" | "completed" | "autopay" | "supplement" | "todayPending";

export function KpiCards({
  stats,
  kpiTotalByAgency = [],
  kpiPendingDetail = [],
  kpiAutopayDetail = [],
  supplementRequestStats = { total: 0, workStatusCount: 0, reviewCount: 0 },
  supplementRequestDetail = [],
  pendingByPeriod = { totalPending: 0, monthlyPending: 0, todayPending: 0 },
  todayPendingDetail = [],
}: KpiCardsProps) {
  const [expanded, setExpanded] = useState<KpiKey | null>(null);

  const toggle = (key: KpiKey) => {
    setExpanded((prev) => (prev === key ? null : key));
  };

  // 대기 중: 거래처별 그룹핑
  const pendingByAgency = useMemo(() => {
    const groups: Record<string, { name: string; items: typeof kpiPendingDetail }> = {};
    kpiPendingDetail.forEach((item) => {
      if (!groups[item.agencyId]) {
        groups[item.agencyId] = { name: item.agencyName, items: [] };
      }
      groups[item.agencyId].items.push(item);
    });
    return Object.entries(groups).sort((a, b) => b[1].items.length - a[1].items.length);
  }, [kpiPendingDetail]);

  // 자동이체: 거래처별 그룹핑
  const autopayByAgency = useMemo(() => {
    const groups: Record<string, { name: string; items: typeof kpiAutopayDetail }> = {};
    kpiAutopayDetail.forEach((item) => {
      if (!groups[item.agencyId]) {
        groups[item.agencyId] = { name: item.agencyName, items: [] };
      }
      groups[item.agencyId].items.push(item);
    });
    return Object.entries(groups).sort((a, b) => b[1].items.length - a[1].items.length);
  }, [kpiAutopayDetail]);

  // 보완요청: 거래처별 그룹핑
  const supplementByAgency = useMemo(() => {
    const groups: Record<string, { name: string; items: typeof supplementRequestDetail }> = {};
    supplementRequestDetail.forEach((item) => {
      const key = item.agencyId;
      if (!groups[key]) {
        groups[key] = { name: item.agencyName || item.agencyId, items: [] };
      }
      groups[key].items.push(item);
    });
    return Object.entries(groups).sort((a, b) => b[1].items.length - a[1].items.length);
  }, [supplementRequestDetail]);

  // 당일대기: 거래처별 그룹핑
  const todayByAgency = useMemo(() => {
    const groups: Record<string, { name: string; items: typeof todayPendingDetail }> = {};
    todayPendingDetail.forEach((item) => {
      const key = item.agencyId;
      if (!groups[key]) {
        groups[key] = { name: item.agencyName || item.agencyId, items: [] };
      }
      groups[key].items.push(item);
    });
    return Object.entries(groups).sort((a, b) => b[1].items.length - a[1].items.length);
  }, [todayPendingDetail]);

  // 보완요청 항목의 보완 사유 뱃지
  const getSupplementReasons = (item: typeof supplementRequestDetail[0]) => {
    const reasons: string[] = [];
    if (item.workStatus === "보완요청") reasons.push("진행상황");
    if (item.applicationDocsReview === "보완요청") reasons.push("가입신청서");
    if (item.nameChangeDocsReview === "보완요청") reasons.push("명의변경");
    if (item.arcAutopayReview === "보완요청") reasons.push("외국인등록증");
    return reasons;
  };

  const cards: {
    key: KpiKey;
    title: string;
    value: number;
    subtitle?: string;
    icon: typeof Smartphone;
    color: string;
    bg: string;
    ring: string;
    expandable: boolean;
  }[] = [
    {
      key: "total",
      title: "전체 개통",
      value: stats.total,
      icon: Smartphone,
      color: "text-blue-600",
      bg: "bg-blue-50",
      ring: "ring-blue-500",
      expandable: true,
    },
    {
      key: "pending",
      title: "개통대기 (당월)",
      value: pendingByPeriod.monthlyPending,
      subtitle: `총 ${pendingByPeriod.totalPending}건`,
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      ring: "ring-yellow-500",
      expandable: true,
    },
    {
      key: "todayPending",
      title: "당일 개통대기",
      value: pendingByPeriod.todayPending,
      subtitle: "오늘 입국예정",
      icon: CalendarDays,
      color: "text-orange-600",
      bg: "bg-orange-50",
      ring: "ring-orange-500",
      expandable: true,
    },
    {
      key: "completed",
      title: "개통 완료",
      value: stats.completed,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
      ring: "ring-green-500",
      expandable: false,
    },
    {
      key: "supplement",
      title: "보완요청 대기",
      value: Number(supplementRequestStats.total) || 0,
      subtitle: "거래처 보완 대기",
      icon: AlertTriangle,
      color: "text-rose-600",
      bg: "bg-rose-50",
      ring: "ring-rose-500",
      expandable: true,
    },
    {
      key: "autopay",
      title: "자동이체 미등록",
      value: stats.autopayPending,
      icon: CreditCard,
      color: "text-red-600",
      bg: "bg-red-50",
      ring: "ring-red-500",
      expandable: true,
    },
  ];

  return (
    <div className="space-y-4">
      {/* KPI 카드 그리드 - 6개 3x2 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const isExpanded = expanded === card.key;
          return (
            <Card
              key={card.key}
              className={`transition-all ${
                card.expandable
                  ? "cursor-pointer hover:shadow-md"
                  : ""
              } ${isExpanded ? `ring-2 ${card.ring}` : ""}`}
              onClick={() => card.expandable && toggle(card.key)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-sm font-medium text-gray-500">
                    {card.title}
                  </CardTitle>
                  {card.subtitle && (
                    <span className="text-xs text-gray-400">{card.subtitle}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {card.expandable && (
                    isExpanded
                      ? <ChevronUp className="h-4 w-4 text-gray-400" />
                      : <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                  <div className={`rounded-lg p-2 ${card.bg}`}>
                    <card.icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 전체 개통 - 거래처별 건수 */}
      {expanded === "total" && kpiTotalByAgency.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-blue-600" />
              거래처별 개통 건수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>거래처</TableHead>
                  <TableHead className="text-center">개통 건수</TableHead>
                  <TableHead className="text-right">비율</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpiTotalByAgency.map((row) => (
                  <TableRow key={row.agencyId}>
                    <TableCell className="font-medium">{row.agencyName}</TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-blue-100 text-blue-800">{row.count}건</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-500">
                      {stats.total > 0
                        ? ((Number(row.count) / stats.total) * 100).toFixed(1)
                        : 0}%
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-50 font-bold">
                  <TableCell>합계</TableCell>
                  <TableCell className="text-center">{stats.total}건</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 개통대기 당월 - 거래처별 그룹 + 입국예정일 */}
      {expanded === "pending" && pendingByAgency.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              개통대기 상세 (당월 {pendingByPeriod.monthlyPending}건 / 총 {pendingByPeriod.totalPending}건)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {pendingByAgency.map(([agencyId, group]) => (
              <div key={agencyId}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-sm">{group.name}</h3>
                  <Badge variant="secondary">{group.items.length}건</Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>고객명</TableHead>
                      <TableHead>번호</TableHead>
                      <TableHead className="text-center">입국예정일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.customerName}</TableCell>
                        <TableCell className="text-sm">{item.newPhoneNumber || "-"}</TableCell>
                        <TableCell className="text-center">
                          {item.entryDate ? (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              {format(new Date(item.entryDate), "yyyy-MM-dd")}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">미정</span>
                          )}
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

      {/* 당일 개통대기 - 오늘 입국예정 건 */}
      {expanded === "todayPending" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-orange-600" />
              당일 개통대기 ({pendingByPeriod.todayPending}건)
              <span className="text-xs font-normal text-gray-400 ml-2">
                입국예정일 = 오늘 &amp; 담당자 미배정/개통요청 상태
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayByAgency.length > 0 ? (
              <div className="space-y-6">
                {todayByAgency.map(([agencyId, group]) => (
                  <div key={agencyId}>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-sm">{group.name}</h3>
                      <Badge variant="secondary">{group.items.length}건</Badge>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>고객명</TableHead>
                          <TableHead>번호</TableHead>
                          <TableHead>담당자</TableHead>
                          <TableHead className="text-center">입국예정일</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.customerName}</TableCell>
                            <TableCell className="text-sm">{item.newPhoneNumber || "-"}</TableCell>
                            <TableCell className="text-sm">{item.personInCharge || "-"}</TableCell>
                            <TableCell className="text-center">
                              {item.entryDate ? (
                                <Badge className="bg-orange-100 text-orange-800">
                                  {format(new Date(item.entryDate), "yyyy-MM-dd")}
                                </Badge>
                              ) : (
                                <span className="text-gray-400">미정</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                오늘 입국예정인 개통대기 건이 없습니다. ✅
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 보완요청 대기 - 거래처 보완 대기건 상세 */}
      {expanded === "supplement" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              보완요청 대기 상세 ({Number(supplementRequestStats.total)}건)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {supplementByAgency.length > 0 ? (
              <div className="space-y-6">
                {supplementByAgency.map(([agencyId, group]) => (
                  <div key={agencyId}>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-sm">{group.name}</h3>
                      <Badge variant="secondary">{group.items.length}건</Badge>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>고객명</TableHead>
                          <TableHead>번호</TableHead>
                          <TableHead>담당자</TableHead>
                          <TableHead className="text-center">보완 사유</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.items.map((item) => {
                          const reasons = getSupplementReasons(item);
                          return (
                            <TableRow key={item.id} className="bg-rose-50/50">
                              <TableCell className="font-medium">{item.customerName}</TableCell>
                              <TableCell className="text-sm">{item.newPhoneNumber || "-"}</TableCell>
                              <TableCell className="text-sm">{item.personInCharge || "-"}</TableCell>
                              <TableCell className="text-center">
                                <div className="flex flex-wrap gap-1 justify-center">
                                  {reasons.map((r) => (
                                    <Badge key={r} className="bg-rose-100 text-rose-700 text-[10px]">
                                      {r}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                보완요청 대기 건이 없습니다. ✅
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 자동이체 미등록 - 거래처별 그룹 + 남은기한 */}
      {expanded === "autopay" && autopayByAgency.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-red-600" />
              자동이체 미등록 상세 ({stats.autopayPending}건)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {autopayByAgency.map(([agencyId, group]) => (
              <div key={agencyId}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-sm">{group.name}</h3>
                  <Badge variant="secondary">{group.items.length}건</Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>고객명</TableHead>
                      <TableHead>번호</TableHead>
                      <TableHead className="text-center">개통일</TableHead>
                      <TableHead className="text-center">남은 기한</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((item) => {
                      const days = item.daysLeft != null ? Number(item.daysLeft) : null;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.customerName}</TableCell>
                          <TableCell className="text-sm">{item.newPhoneNumber || "-"}</TableCell>
                          <TableCell className="text-center text-sm">
                            {item.activationDate
                              ? format(new Date(item.activationDate), "yyyy-MM-dd")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {days !== null ? (
                              <Badge
                                className={
                                  days < 0
                                    ? "bg-red-600 text-white"
                                    : days <= 7
                                    ? "bg-red-100 text-red-800"
                                    : days <= 14
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }
                              >
                                {days < 0 ? `${Math.abs(days)}일 초과` : `D-${days}`}
                              </Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 데이터 없을 때 */}
      {expanded && !["completed", "supplement", "todayPending"].includes(expanded) && (
        (expanded === "total" && kpiTotalByAgency.length === 0) ||
        (expanded === "pending" && pendingByAgency.length === 0) ||
        (expanded === "autopay" && autopayByAgency.length === 0)
      ) && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            해당하는 건이 없습니다.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
