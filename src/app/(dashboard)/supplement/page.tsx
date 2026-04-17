"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "../dashboard-context";
import { SupplementPanel } from "@/components/dashboard/supplement-panel";
import type { SupplementStat, SupplementItem } from "@/components/dashboard/supplement-panel";

interface SupplementData {
  supplementStats: SupplementStat[];
  supplementList: SupplementItem[];
}

export default function SupplementPage() {
  const { getFilterParams, selectedMajors, selectedMediums } = useDashboard();
  const [data, setData] = useState<SupplementData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const filterParams = getFilterParams();
    const params = new URLSearchParams();
    Object.entries(filterParams).forEach(([k, v]) => params.set(k, v));

    fetch(`/api/dashboard?${params}`)
      .then((res) => res.json())
      .then((result) => {
        setData({
          supplementStats: result.supplementStats || [],
          supplementList: result.supplementList || [],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [getFilterParams, selectedMajors, selectedMediums]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        로딩 중...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        데이터를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">거래처 업무현황 관리</h1>
      <SupplementPanel
        supplementStats={data.supplementStats}
        supplementList={data.supplementList}
      />
      {data.supplementStats.length === 0 && data.supplementList.length === 0 && (
        <div className="flex h-48 items-center justify-center rounded-lg border bg-white text-gray-400">
          보완이 필요한 건이 없습니다.
        </div>
      )}
    </div>
  );
}
