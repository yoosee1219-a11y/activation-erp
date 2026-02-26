"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/hooks/use-auth";
import { useAgencyFilter, type CategoryNode, type Agency } from "@/hooks/use-agency-filter";
import { createContext, useContext, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/types";

interface DashboardContextType {
  user: SessionUser | null;
  selectedMajors: string[];
  setSelectedMajors: (ids: string[]) => void;
  selectedMediums: string[];
  setSelectedMediums: (ids: string[]) => void;
  selectedAgencies: string[];
  setSelectedAgencies: (ids: string[]) => void;
  agencies: Agency[];
  categories: CategoryNode[];
  /** 선택된 값을 API 쿼리 파라미터로 변환 */
  getFilterParams: () => Record<string, string>;
  refreshCategories: () => void;
}

const DashboardContext = createContext<DashboardContextType>({
  user: null,
  selectedMajors: [],
  setSelectedMajors: () => {},
  selectedMediums: [],
  setSelectedMediums: () => {},
  selectedAgencies: [],
  setSelectedAgencies: () => {},
  agencies: [],
  categories: [],
  getFilterParams: () => ({}),
  refreshCategories: () => {},
});

export const useDashboard = () => useContext(DashboardContext);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const {
    agencies,
    categories,
    selectedMajors,
    setSelectedMajors,
    selectedMediums,
    setSelectedMediums,
    selectedAgencies,
    setSelectedAgencies,
    refreshCategories,
  } = useAgencyFilter();

  // 멀티셀렉트 → API 파라미터 변환
  // 우선순위: 소분류(거래처) > 중분류 > 대분류
  const getFilterParams = useMemo(() => {
    return (): Record<string, string> => {
      if (selectedAgencies.length > 0) {
        return { agencyIds: selectedAgencies.join(",") };
      }
      if (selectedMediums.length > 0) {
        return { mediumCategories: selectedMediums.join(",") };
      }
      if (selectedMajors.length > 0) {
        return { majorCategories: selectedMajors.join(",") };
      }
      return {};
    };
  }, [selectedMajors, selectedMediums, selectedAgencies]);

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === "PARTNER" || user.role === "GUEST") {
        router.replace("/partner");
      }
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (user?.role === "PARTNER" || user?.role === "GUEST") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">리다이렉트 중...</div>
      </div>
    );
  }

  return (
    <DashboardContext.Provider
      value={{
        user,
        selectedMajors,
        setSelectedMajors,
        selectedMediums,
        setSelectedMediums,
        selectedAgencies,
        setSelectedAgencies,
        agencies,
        categories,
        getFilterParams,
        refreshCategories,
      }}
    >
      <div className="flex h-screen">
        <Sidebar user={user} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header
            user={user}
            agencies={agencies}
            categories={categories}
            selectedMajors={selectedMajors}
            selectedMediums={selectedMediums}
            selectedAgencies={selectedAgencies}
            onMajorsChange={setSelectedMajors}
            onMediumsChange={setSelectedMediums}
            onAgenciesChange={setSelectedAgencies}
          />
          <main className="flex-1 overflow-auto bg-gray-50 p-6">
            {children}
          </main>
        </div>
      </div>
    </DashboardContext.Provider>
  );
}
