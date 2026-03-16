"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "../../dashboard-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface StatusConfig {
  id: number;
  statusKey: string;
  statusLabel: string;
  color: string | null;
  sortOrder: number | null;
  isActive: boolean | null;
}

export default function SettingsPage() {
  const { user } = useDashboard();
  const [statuses, setStatuses] = useState<StatusConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<StatusConfig | null>(null);
  const [form, setForm] = useState({
    statusKey: "",
    statusLabel: "",
    color: "#6b7280",
    sortOrder: 0,
  });

  if (user?.role !== "ADMIN" && user?.role !== "SUB_ADMIN") {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        접근 권한이 없습니다.
      </div>
    );
  }

  async function fetchStatuses() {
    try {
      const res = await fetch("/api/settings/status");
      const data = await res.json();
      setStatuses(data.statuses || []);
    } catch {
      toast.error("상태값을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatuses();
  }, []);

  function openCreateDialog() {
    setEditingStatus(null);
    setForm({ statusKey: "", statusLabel: "", color: "#6b7280", sortOrder: statuses.length + 1 });
    setDialogOpen(true);
  }

  function openEditDialog(s: StatusConfig) {
    setEditingStatus(s);
    setForm({
      statusKey: s.statusKey,
      statusLabel: s.statusLabel,
      color: s.color || "#6b7280",
      sortOrder: s.sortOrder ?? 0,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.statusKey.trim() || !form.statusLabel.trim()) {
      toast.error("키와 라벨을 모두 입력하세요.");
      return;
    }

    try {
      if (editingStatus) {
        const res = await fetch(`/api/settings/status/${editingStatus.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            statusLabel: form.statusLabel,
            color: form.color,
            sortOrder: form.sortOrder,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success("상태값이 수정되었습니다.");
      } else {
        const res = await fetch("/api/settings/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (res.status === 409) {
          toast.error("이미 존재하는 상태 키입니다.");
          return;
        }
        if (!res.ok) throw new Error();
        toast.success("상태값이 추가되었습니다.");
      }
      setDialogOpen(false);
      fetchStatuses();
    } catch {
      toast.error("저장에 실패했습니다.");
    }
  }

  async function handleDelete(s: StatusConfig) {
    if (!confirm(`"${s.statusLabel}" 상태를 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/settings/status/${s.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("삭제되었습니다.");
      fetchStatuses();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  }

  async function handleToggleActive(s: StatusConfig) {
    try {
      const res = await fetch(`/api/settings/status/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !s.isActive }),
      });
      if (!res.ok) throw new Error();
      fetchStatuses();
    } catch {
      toast.error("상태 변경에 실패했습니다.");
    }
  }

  const PRESET_COLORS = [
    { name: "노랑", value: "#f59e0b" },
    { name: "초록", value: "#10b981" },
    { name: "빨강", value: "#ef4444" },
    { name: "파랑", value: "#3b82f6" },
    { name: "보라", value: "#8b5cf6" },
    { name: "회색", value: "#6b7280" },
    { name: "핑크", value: "#ec4899" },
    { name: "청록", value: "#06b6d4" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">설정</h1>

      {/* 개통 상태값 관리 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>개통 상태값 관리</CardTitle>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            상태 추가
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-gray-500 py-4">로딩 중...</p>
          ) : statuses.length === 0 ? (
            <p className="text-center text-gray-500 py-4">등록된 상태값이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">순서</TableHead>
                  <TableHead>색상</TableHead>
                  <TableHead>키</TableHead>
                  <TableHead>라벨</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses.map((s) => (
                  <TableRow key={s.id} className={!s.isActive ? "opacity-50" : ""}>
                    <TableCell>
                      <span className="flex items-center gap-1 text-gray-400">
                        <GripVertical className="h-4 w-4" />
                        {s.sortOrder}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div
                        className="h-6 w-6 rounded-full border"
                        style={{ backgroundColor: s.color || "#6b7280" }}
                      />
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {s.statusKey}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">{s.statusLabel}</TableCell>
                    <TableCell>
                      <button onClick={() => handleToggleActive(s)}>
                        <Badge variant={s.isActive ? "default" : "secondary"}>
                          {s.isActive ? "활성" : "비활성"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(s)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {user?.role === "ADMIN" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(s)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 시스템 정보 */}
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

      {/* 상태 추가/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStatus ? "상태값 수정" : "새 상태값 추가"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>상태 키 (영문)</Label>
              <Input
                value={form.statusKey}
                onChange={(e) =>
                  setForm({ ...form, statusKey: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })
                }
                placeholder="예: in_progress"
                disabled={!!editingStatus}
              />
              {editingStatus && (
                <p className="text-xs text-gray-400">키는 수정할 수 없습니다.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>라벨 (표시명)</Label>
              <Input
                value={form.statusLabel}
                onChange={(e) => setForm({ ...form, statusLabel: e.target.value })}
                placeholder="예: 진행 중"
              />
            </div>
            <div className="space-y-2">
              <Label>색상</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      form.color === c.value
                        ? "border-black scale-110"
                        : "border-transparent hover:border-gray-300"
                    }`}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setForm({ ...form, color: c.value })}
                    title={c.name}
                  />
                ))}
                <Input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="h-8 w-8 p-0 border-0 cursor-pointer"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>정렬 순서</Label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })
                }
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSave}>
              {editingStatus ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
