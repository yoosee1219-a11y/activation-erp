"use client";

import { useState, useEffect, useCallback } from "react";
import { useAgencyFilter, type Agency } from "@/hooks/use-agency-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Loader2,
  ClipboardList,
  ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───
interface UsimStockRow {
  agencyId: string;
  agencyName: string;
  totalAssigned: number;
  transferIn: number;
  transferOut: number;
  currentStock: number;
}

interface UsimLogRow {
  id: string;
  action: string;
  agencyId: string | null;
  agencyName: string | null;
  targetAgencyId: string | null;
  targetAgencyName: string | null;
  usimCount: number | null;
  details: string;
  userName: string;
  createdAt: string | null;
}

export default function UsimManagementPage() {
  const { agencies, loading: agencyLoading } = useAgencyFilter();
  const [stock, setStock] = useState<UsimStockRow[]>([]);
  const [logs, setLogs] = useState<UsimLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  // 배정 폼
  const [assignAgencyId, setAssignAgencyId] = useState("");
  const [assignQuantity, setAssignQuantity] = useState("");
  const [assignDate, setAssignDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [assigning, setAssigning] = useState(false);

  // 이송 폼
  const [transferFromId, setTransferFromId] = useState("");
  const [transferToId, setTransferToId] = useState("");
  const [transferQuantity, setTransferQuantity] = useState("");
  const [transferDate, setTransferDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [transferring, setTransferring] = useState(false);

  // ─── 데이터 로드 ───
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/usims");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setStock(data.stock || []);
      setLogs(data.logs || []);
    } catch {
      toast.error("데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── 배정 처리 ───
  const handleAssign = async () => {
    if (!assignAgencyId || !assignQuantity || Number(assignQuantity) <= 0) {
      toast.error("거래처와 수량을 입력해주세요.");
      return;
    }

    setAssigning(true);
    try {
      const res = await fetch("/api/usims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencyId: assignAgencyId,
          quantity: Number(assignQuantity),
          date: assignDate,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "배정 실패");
      }

      const result = await res.json();
      toast.success(result.message);
      setAssignQuantity("");
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "배정 실패");
    } finally {
      setAssigning(false);
    }
  };

  // ─── 이송 처리 ───
  const handleTransfer = async () => {
    if (
      !transferFromId ||
      !transferToId ||
      !transferQuantity ||
      Number(transferQuantity) <= 0
    ) {
      toast.error("출발/도착 거래처와 수량을 입력해주세요.");
      return;
    }

    if (transferFromId === transferToId) {
      toast.error("같은 거래처로 이송할 수 없습니다.");
      return;
    }

    setTransferring(true);
    try {
      const res = await fetch("/api/usims/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAgencyId: transferFromId,
          toAgencyId: transferToId,
          quantity: Number(transferQuantity),
          date: transferDate,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "이송 실패");
      }

      const result = await res.json();
      toast.success(result.message);
      setTransferQuantity("");
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "이송 실패");
    } finally {
      setTransferring(false);
    }
  };

  // ─── 총 재고 합계 ───
  const totalStock = stock.reduce((sum, s) => sum + s.currentStock, 0);
  const totalAssigned = stock.reduce((sum, s) => sum + s.totalAssigned, 0);

  if (agencyLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">유심 관리</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4" />
          총 재고: <span className="font-bold text-foreground">{totalStock}개</span>
          {" / "}
          총 배정: <span className="font-bold text-foreground">{totalAssigned}개</span>
        </div>
      </div>

      <Tabs defaultValue="assign">
        <TabsList>
          <TabsTrigger value="assign" className="gap-1">
            <Plus className="h-4 w-4" />
            배정
          </TabsTrigger>
          <TabsTrigger value="transfer" className="gap-1">
            <ArrowRightLeft className="h-4 w-4" />
            이송
          </TabsTrigger>
          <TabsTrigger value="stock" className="gap-1">
            <Package className="h-4 w-4" />
            현황
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1">
            <ClipboardList className="h-4 w-4" />
            이력
          </TabsTrigger>
        </TabsList>

        {/* ─── 배정 탭 ─── */}
        <TabsContent value="assign">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">유심 배정</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <Label>거래처</Label>
                  <Select
                    value={assignAgencyId}
                    onValueChange={setAssignAgencyId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="거래처 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {agencies.map((a: Agency) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>수량</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="배정 수량"
                    value={assignQuantity}
                    onChange={(e) => setAssignQuantity(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>날짜</Label>
                  <Input
                    type="date"
                    value={assignDate}
                    onChange={(e) => setAssignDate(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleAssign}
                  disabled={assigning}
                  className="h-10"
                >
                  {assigning ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  배정
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── 이송 탭 ─── */}
        <TabsContent value="transfer">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">유심 이송</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="space-y-2">
                  <Label>출발 거래처</Label>
                  <Select
                    value={transferFromId}
                    onValueChange={setTransferFromId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="출발 거래처" />
                    </SelectTrigger>
                    <SelectContent>
                      {agencies.map((a: Agency) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>도착 거래처</Label>
                  <Select
                    value={transferToId}
                    onValueChange={setTransferToId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="도착 거래처" />
                    </SelectTrigger>
                    <SelectContent>
                      {agencies.map((a: Agency) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>수량</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="이송 수량"
                    value={transferQuantity}
                    onChange={(e) => setTransferQuantity(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>날짜</Label>
                  <Input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleTransfer}
                  disabled={transferring}
                  className="h-10"
                >
                  {transferring ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                  )}
                  이송
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── 현황 탭 ─── */}
        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">거래처별 유심 현황</CardTitle>
            </CardHeader>
            <CardContent>
              {stock.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  유심 데이터가 없습니다.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>거래처</TableHead>
                        <TableHead className="text-right">총 배정</TableHead>
                        <TableHead className="text-right">이송 입고</TableHead>
                        <TableHead className="text-right">이송 출고</TableHead>
                        <TableHead className="text-right font-bold">
                          현재 재고
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stock.map((s) => (
                        <TableRow key={s.agencyId}>
                          <TableCell className="font-medium">
                            {s.agencyName}
                          </TableCell>
                          <TableCell className="text-right">
                            {s.totalAssigned}
                          </TableCell>
                          <TableCell className="text-right text-blue-600">
                            {s.transferIn > 0 ? `+${s.transferIn}` : "-"}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {s.transferOut > 0 ? `-${s.transferOut}` : "-"}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {s.currentStock}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* 합계 행 */}
                      <TableRow className="border-t-2 font-bold bg-muted/50">
                        <TableCell>합계</TableCell>
                        <TableCell className="text-right">
                          {totalAssigned}
                        </TableCell>
                        <TableCell className="text-right text-blue-600">
                          +{stock.reduce((s, r) => s + r.transferIn, 0)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          -{stock.reduce((s, r) => s + r.transferOut, 0)}
                        </TableCell>
                        <TableCell className="text-right">{totalStock}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── 이력 탭 ─── */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">유심 작업 이력</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  이력이 없습니다.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">일시</TableHead>
                        <TableHead className="w-[80px]">구분</TableHead>
                        <TableHead>내용</TableHead>
                        <TableHead className="w-[100px]">처리자</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {log.createdAt
                              ? new Date(log.createdAt).toLocaleString("ko-KR", {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                log.action === "assign"
                                  ? "bg-green-100 text-green-700"
                                  : log.action === "transfer"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {log.action === "assign"
                                ? "배정"
                                : log.action === "transfer"
                                ? "이송"
                                : log.action === "adjust"
                                ? "조정"
                                : log.action}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.details}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.userName}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
