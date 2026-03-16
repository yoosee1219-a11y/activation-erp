"use client";

import { createContext, useContext } from "react";
import type { SessionUser } from "@/types";
import type { CategoryNode, Agency } from "@/hooks/use-agency-filter";

export interface DashboardContextType {
  user: SessionUser | null;
  selectedMajors: string[];
  setSelectedMajors: (ids: string[]) => void;
  selectedMediums: string[];
  setSelectedMediums: (ids: string[]) => void;
  agencies: Agency[];
  categories: CategoryNode[];
  /** 선택된 값을 API 쿼리 파라미터로 변환 */
  getFilterParams: () => Record<string, string>;
  refreshCategories: () => void;
}

export const DashboardContext = createContext<DashboardContextType>({
  user: null,
  selectedMajors: [],
  setSelectedMajors: () => {},
  selectedMediums: [],
  setSelectedMediums: () => {},
  agencies: [],
  categories: [],
  getFilterParams: () => ({}),
  refreshCategories: () => {},
});

export const useDashboard = () => useContext(DashboardContext);
