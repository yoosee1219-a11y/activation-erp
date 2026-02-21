"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useDashboard } from "../layout";
import { DataTable } from "@/components/activations/data-table";
import { Filters } from "@/components/activations/filters";
import {
  getColumns,
  type ActivationRow,
} from "@/components/activations/columns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, List, LayoutGrid, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const STAFF_LIST = ["Admin", "김대리", "박과장", "이사원", "최주임"];

export default function ActivationsPage() {
  const { agencyParam, agencies, user } = useDashboard();
  const [data, setData] = useState<ActivationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grouped">("grouped");
  const [selectedAgency, setSelectedAgency] = useState<string | null>(null);

  const agencyMap = useMemo(() => {
    const map: Record<string, string> = {};
    agencies.forEach((a) => (map[a.id] = a.name));
    return map;
  }, [agencies]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (agencyParam) params.set("agencyId", agencyParam);
    if (status !== "all") params.set("status", status);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("page", page.toString());
    params.set("pageSize", "200");

    try {
      const res = await fetch(`/api/activations?${params}`);
      const result = await res.json();
      const rows = (result.data || []).map((row: ActivationRow) => ({
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
  }, [agencyParam, agencyMap, status, dateFrom, dateTo, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/activations/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("삭제되었습니다.");
        fetchData();
      } else toast.error("삭제에 실패했습니다.");
    } catch {
      toast.error("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleInlineUpdate = async (
    id: string,
    field: string,
    value: string
  ) => {
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
        toast.error("수정에 실패했습니다.");
        fetchData();
      }
    } catch {
      toast.error("수정 중 오류가 발생했습니다.");
      fetchData();
    }
  };

  const handleToggleLock = async (id: string, lock: boolean) => {
    setData((prev) =>
      prev.map((row) => (row.id === id ? { ...row, isLocked: lock } : row))
    );
    try {
      const res = await fetch("/api/activations/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activationIds: [id], lock }),
      });
      if (res.ok) {
        toast.success(lock ? "잠금 처리되었습니다." : "잠금 해제되었습니다.");
      } else {
        toast.error("잠금 처리에 실패했습니다.");
        fetchData();
      }
    } catch {
      toast.error("잠금 처리 중 오류가 발생했습니다.");
      fetchData();
    }
  };

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUB_ADMIN";

  const columns = getColumns({
    onDelete: handleDelete,
    canDelete: user?.role === "ADMIN",
    onInlineUpdate: user?.role !== "GUEST" ? handleInlineUpdate : undefined,
    onToggleLock: isAdmin ? handleToggleLock : undefined,
    canLock: isAdmin,
    staffList: STAFF_LIST,
  });

  // 거래처별 그룹핑
  const groupedData = useMemo(() => {
    const groups: Record<
      string,
      { name: string; rows: ActivationRow[]; counts: Record<string, number> }
    > = {};
    data.forEach((row) => {
      if (!groups[row.agencyId]) {
        groups[row.agencyId] = {
          name: row.agencyName || row.agencyId,
          rows: [],
          counts: { 대기: 0, 작업중: 0, 완료: 0 },
        };
      }
      groups[row.agencyId].rows.push(row);
      const ws = row.workStatus || "대기";
      if (ws in groups[row.agencyId].counts) {
        groups[row.agencyId].counts[ws]++;
      }
    });
    return Object.entries(groups).sort((a, b) =>
      a[1].name.localeCompare(b[1].name)
    );
  }, [data]);

  // 선택된 거래처 필터링된 데이터
  const filteredGrouped = selectedAgency
    ? groupedData.filter(([id]) => id === selectedAgency)
    : groupedData;

  const handleCardClick = (agencyId: string) => {
    setSelectedAgency((prev) => (prev === agencyId ? null : agencyId));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">개통 관리</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            <Button
              variant={viewMode === "grouped" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grouped")}
              className="rounded-r-none"
            >
              <LayoutGrid className="mr-1 h-4 w-4" />
              거래처별
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List className="mr-1 h-4 w-4" />
              전체목록
            </Button>
          </div>
          {user?.role !== "GUEST" && (
            <Button asChild>
              <Link href="/activations/new">
                <Plus className="mr-2 h-4 w-4" />
                새 개통 등록
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Filters
        status={status}
        onStatusChange={(v) => { setStatus(v); setPage(1); }}
        dateFrom={dateFrom}
        onDateFromChange={(v) => { setDateFrom(v); setPage(1); }}
        dateTo={dateTo}
        onDateToChange={(v) => { setDateTo(v); setPage(1); }}
        onClear={() => { setStatus("all"); setDateFrom(""); setDateTo(""); setPage(1); }}
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center text-gray-500">
          로딩 중...
        </div>
      ) : viewMode === "list" ? (
        <DataTable
          columns={columns}
          data={data}
          total={total}
          page={page}
          pageSize={200}
          onPageChange={setPage}
          searchPlaceholder="고객명으로 검색..."
        />
      ) : (
        <div className="space-y-4">
          {/* 선택 해제 버튼 */}
          {selectedAgency && (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-sm px-3 py-1">
                {agencyMap[selectedAgency] || selectedAgency}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAgency(null)}
              >
                <X className="mr-1 h-4 w-4" />
                전체 보기
              </Button>
            </div>
          )}

          {/* 거래처별 요약 카드 */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {groupedData.map(([agencyId, group]) => (
              <Card
                key={agencyId}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedAgency === agencyId
                    ? "ring-2 ring-blue-500 shadow-md"
                    : selectedAgency
                    ? "opacity-40"
                    : ""
                }`}
                onClick={() => handleCardClick(agencyId)}
              >
                <CardContent className="p-3">
                  <p className="font-semibold text-sm truncate">
                    {group.name}
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {group.rows.length}건
                  </p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {group.counts["대기"] > 0 && (
                      <Badge className="bg-gray-100 text-gray-600 text-[10px]">
                        대기 {group.counts["대기"]}
                      </Badge>
                    )}
                    {group.counts["작업중"] > 0 && (
                      <Badge className="bg-blue-100 text-blue-700 text-[10px]">
                        작업중 {group.counts["작업중"]}
                      </Badge>
                    )}
                    {group.counts["완료"] > 0 && (
                      <Badge className="bg-green-100 text-green-700 text-[10px]">
                        완료 {group.counts["완료"]}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 거래처별 테이블 (선택된 거래처만 or 전체) */}
          {filteredGrouped.map(([agencyId, group]) => (
            <div key={agencyId}>
              <div className="flex items-center gap-3 mb-2 mt-4">
                <h2 className="text-lg font-semibold">{group.name}</h2>
                <Badge variant="secondary">{group.rows.length}건</Badge>
                {group.counts["작업중"] > 0 && (
                  <Badge className="bg-blue-100 text-blue-700">
                    작업중 {group.counts["작업중"]}
                  </Badge>
                )}
                {group.counts["완료"] > 0 && (
                  <Badge className="bg-green-100 text-green-700">
                    완료 {group.counts["완료"]}
                  </Badge>
                )}
              </div>
              <DataTable
                columns={columns}
                data={group.rows}
                total={group.rows.length}
                page={1}
                pageSize={999}
                searchPlaceholder="고객명으로 검색..."
              />
            </div>
          ))}

          {filteredGrouped.length === 0 && (
            <div className="flex h-32 items-center justify-center text-gray-500">
              데이터가 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
