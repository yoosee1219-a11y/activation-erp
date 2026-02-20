"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Smartphone,
  Clock,
  CheckCircle2,
  CreditCard,
} from "lucide-react";

interface KpiCardsProps {
  stats: {
    total: number;
    pending: number;
    completed: number;
    autopayPending: number;
  };
}

export function KpiCards({ stats }: KpiCardsProps) {
  const cards = [
    {
      title: "전체 개통",
      value: stats.total,
      icon: Smartphone,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "대기 중",
      value: stats.pending,
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      title: "개통 완료",
      value: stats.completed,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "자동이체 미등록",
      value: stats.autopayPending,
      icon: CreditCard,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              {card.title}
            </CardTitle>
            <div className={`rounded-lg p-2 ${card.bg}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
