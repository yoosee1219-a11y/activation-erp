"use client";

import { useDashboard } from "../../layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const { user } = useDashboard();

  if (user?.role !== "ADMIN" && user?.role !== "SUB_ADMIN") {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        접근 권한이 없습니다.
      </div>
    );
  }

  const statuses = [
    { key: "pending", label: "대기", color: "#f59e0b" },
    { key: "completed", label: "개통완료", color: "#10b981" },
    { key: "cancelled", label: "개통취소", color: "#ef4444" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">설정</h1>

      <Card>
        <CardHeader>
          <CardTitle>개통 상태값</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {statuses.map((s) => (
              <div
                key={s.key}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="font-medium">{s.label}</span>
                </div>
                <Badge variant="outline">{s.key}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>시스템 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">버전</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">데이터베이스</span>
            <span>Neon PostgreSQL</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">인증</span>
            <span>Better Auth</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
