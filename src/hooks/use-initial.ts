"use client";

import useSWR from "swr";
import type { SessionUser } from "@/types";
import type { Agency, CategoryNode } from "@/hooks/use-agency-filter";

export interface InitialData {
  user: SessionUser | null;
  categories: CategoryNode[];
  agencies: Agency[];
}

const fetcher = async (url: string): Promise<InitialData> => {
  const res = await fetch(url);
  if (res.status === 401) {
    return { user: null, categories: [], agencies: [] };
  }
  return res.json();
};

/**
 * 페이지 진입 시 user + categories + agencies를 한 번에 가져옴.
 * useSWR로 같은 key("/api/initial")를 쓰는 모든 컴포넌트가 자동 dedup.
 * → 다른 페이지로 이동해도 30초 동안 재요청 없이 캐시 사용.
 */
export function useInitial() {
  const { data, isLoading, mutate } = useSWR<InitialData>(
    "/api/initial",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30초
    }
  );

  return {
    user: data?.user ?? null,
    categories: data?.categories ?? [],
    agencies: data?.agencies ?? [],
    loading: isLoading,
    refresh: mutate,
  };
}
