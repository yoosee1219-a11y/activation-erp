"use client";

import { useState } from "react";
import { useInitial } from "@/hooks/use-initial";

export interface Agency {
  id: string;
  name: string;
  majorCategory?: string | null;
  mediumCategory?: string | null;
}

export interface CategoryNode {
  id: string;
  name: string;
  level: "major" | "medium";
  parentId: string | null;
  children?: CategoryNode[];
}

export function useAgencyFilter() {
  // /api/initial 묶음 endpoint + SWR 캐싱 사용
  const { agencies, categories, loading, refresh } = useInitial();

  // 멀티셀렉트 상태 (필터)
  const [selectedMajors, setSelectedMajors] = useState<string[]>([]);
  const [selectedMediums, setSelectedMediums] = useState<string[]>([]);

  return {
    agencies,
    categories,
    selectedMajors,
    setSelectedMajors,
    selectedMediums,
    setSelectedMediums,
    loading,
    refreshCategories: refresh,
  };
}
