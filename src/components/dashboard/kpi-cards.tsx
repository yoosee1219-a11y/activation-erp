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
}

type KpiKey = "total" | "pending" | "completed" | "autopay";

export function KpiCards({
  stats,
  kpiTotalByAgency = [],
  kpiPendingDetail = [],
  kpiAutopayDetail = [],
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

  const cards: {
    key: KpiKey;
    title: string;
    value: number;
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
      title: "대기 중",
      value: stats.pending,
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      ring: "ring-yellow-500",
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
      {/* KPI 카드 그리드 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <CardTitle className="text-sm font-medium text-gray-500">
                  {card.title}
                </CardTitle>
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

      {/* 대기 중 - 거래처별 그룹 + 입국예정일 */}
      {expanded === "pending" && pendingByAgency.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              대기 중 상세 ({stats.pending}건)
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
      {expanded && expanded !== "completed" && (
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
