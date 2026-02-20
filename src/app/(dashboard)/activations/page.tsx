"use client";

import { useEffect, useState, useCallback } from "react";
import { useDashboard } from "../layout";
import { DataTable } from "@/components/activations/data-table";
import { Filters } from "@/components/activations/filters";
import { getColumns, type ActivationRow } from "@/components/activations/columns";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function ActivationsPage() {
  const { agencyParam, user } = useDashboard();
  const [data, setData] = useState<ActivationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (agencyParam) params.set("agencyId", agencyParam);
    if (status !== "all") params.set("status", status);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("page", page.toString());

    try {
      const res = await fetch(`/api/activations?${params}`);
      const result = await res.json();
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch {
      toast.error("데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [agencyParam, status, dateFrom, dateTo, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/activations/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("삭제되었습니다.");
        fetchData();
      } else {
        toast.error("삭제에 실패했습니다.");
      }
    } catch {
      toast.error("삭제 중 오류가 발생했습니다.");
    }
  };

  const columns = getColumns(handleDelete, user?.role === "ADMIN");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">개통 관리</h1>
        {user?.role !== "GUEST" && (
          <Button asChild>
            <Link href="/activations/new">
              <Plus className="mr-2 h-4 w-4" />
              새 개통 등록
            </Link>
          </Button>
        )}
      </div>

      <Filters
        status={status}
        onStatusChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        dateFrom={dateFrom}
        onDateFromChange={(v) => {
          setDateFrom(v);
          setPage(1);
        }}
        dateTo={dateTo}
        onDateToChange={(v) => {
          setDateTo(v);
          setPage(1);
        }}
        onClear={() => {
          setStatus("all");
          setDateFrom("");
          setDateTo("");
          setPage(1);
        }}
      />

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
          pageSize={50}
          onPageChange={setPage}
          searchPlaceholder="고객명으로 검색..."
        />
      )}
    </div>
  );
}
