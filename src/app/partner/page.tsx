"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAgencyFilter } from "@/hooks/use-agency-filter";
import { DataTable } from "@/components/activations/data-table";
import {
  getPartnerColumns,
  type PartnerActivationRow,
} from "@/components/partner/partner-columns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function PartnerPage() {
  const { user } = useAuth();
  const { agencies } = useAgencyFilter();
  const [data, setData] = useState<PartnerActivationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState("all");

  // 허용된 거래처 목록 (PARTNER용)
  const allowedAgencies = useMemo(() => {
    if (!user) return [];
    if (user.allowedAgencies.includes("ALL")) return agencies;
    return agencies.filter((a) => user.allowedAgencies.includes(a.id));
  }, [user, agencies]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedAgency !== "all") {
        params.set("agencyId", selectedAgency);
      }
      params.set("page", page.toString());
      params.set("pageSize", "200");

      const res = await fetch(`/api/activations?${params}`);
      const result = await res.json();

      // 거래처명 매핑
      const agencyMap: Record<string, string> = {};
      agencies.forEach((a) => (agencyMap[a.id] = a.name));
      const rows = (result.data || []).map((row: PartnerActivationRow) => ({
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
  }, [page, selectedAgency, agencies]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // handleUpdate를 ref로 감싸서 stale closure 방지
  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;

  const handleUpdate = useCallback(
    async (id: string, field: string, value: string) => {
      // 낙관적 업데이트
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
          const err = await res.json();
          toast.error(err.error || "수정에 실패했습니다.");
          fetchDataRef.current();
        }
      } catch {
        toast.error("수정 중 오류가 발생했습니다.");
        fetchDataRef.current();
      }
    },
    []
  );

  const handleAddRow = async () => {
    if (!user?.allowedAgencies?.length) {
      toast.error("거래처가 배정되지 않았습니다.");
      return;
    }

    // 거래처 결정: 선택된 거래처 > 첫 번째 허용 거래처
    let agencyId: string;
    if (selectedAgency !== "all") {
      agencyId = selectedAgency;
    } else if (user.allowedAgencies.includes("ALL")) {
      toast.error("거래처를 먼저 선택해주세요.");
      return;
    } else if (user.allowedAgencies.length === 1) {
      agencyId = user.allowedAgencies[0];
    } else {
      toast.error("거래처를 먼저 선택해주세요.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/activations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencyId,
          customerName: "(신규)",
        }),
      });

      if (res.ok) {
        toast.success("새 행이 추가되었습니다. 고객명을 입력해주세요.");
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "추가에 실패했습니다.");
      }
    } catch {
      toast.error("추가 중 오류가 발생했습니다.");
    } finally {
      setCreating(false);
    }
  };

  const columns = useMemo(
    () => getPartnerColumns({ onUpdate: handleUpdate }),
    [handleUpdate]
  );

  // 요약 통계
  const stats = useMemo(() => {
    const pending = data.filter(
      (r) => !r.activationStatus || r.activationStatus === "대기"
    ).length;
    const completed = data.filter(
      (r) => r.activationStatus === "개통완료"
    ).length;
    const needsFix = data.filter(
      (r) =>
        r.applicationDocsReview === "보완필요" ||
        r.nameChangeDocsReview === "보완필요" ||
        r.arcAutopayReview === "보완필요"
    ).length;
    return { pending, completed, needsFix };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-yellow-100 p-2">
              <Clock className="h-5 w-5 text-yellow-700" />
            </div>
            <div>
              <p className="text-sm text-gray-500">대기</p>
              <p className="text-2xl font-bold">{stats.pending}건</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-green-100 p-2">
              <CheckCircle2 className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="text-sm text-gray-500">개통완료</p>
              <p className="text-2xl font-bold">{stats.completed}건</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-red-100 p-2">
              <AlertTriangle className="h-5 w-5 text-red-700" />
            </div>
            <div>
              <p className="text-sm text-gray-500">보완필요</p>
              <p className="text-2xl font-bold">{stats.needsFix}건</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 헤더 + 거래처 필터 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">고객 개통 관리</h1>
          {allowedAgencies.length > 1 && (
            <Select
              value={selectedAgency}
              onValueChange={(v) => {
                setSelectedAgency(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="전체 거래처" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 거래처</SelectItem>
                {allowedAgencies.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button onClick={handleAddRow} disabled={creating}>
          <Plus className="mr-2 h-4 w-4" />
          {creating ? "추가 중..." : "새 고객 추가"}
        </Button>
      </div>

      {/* 스프레드시트 테이블 */}
      {loading ? (
        <div className="flex h-64 items-center justify-center text-gray-500">
          로딩 중...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data}
          total={total}
          page={page}
          pageSize={200}
          onPageChange={setPage}
          searchPlaceholder="고객명으로 검색..."
        />
      )}
    </div>
  );
}
