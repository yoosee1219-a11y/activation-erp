"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/hooks/use-auth";
import { useAgencyFilter } from "@/hooks/use-agency-filter";
import { createContext, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/types";

interface DashboardContextType {
  user: SessionUser | null;
  selectedAgency: string;
  setSelectedAgency: (id: string) => void;
  agencyParam: string | undefined;
  agencies: { id: string; name: string }[];
}

const DashboardContext = createContext<DashboardContextType>({
  user: null,
  selectedAgency: "all",
  setSelectedAgency: () => {},
  agencyParam: undefined,
  agencies: [],
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
    selectedAgency,
    setSelectedAgency,
    agencyParam,
  } = useAgencyFilter();

  // 클라이언트 사이드 fallback: PARTNER/GUEST가 관리자 대시보드에 진입한 경우 리다이렉트
  // (미들웨어의 user-role 쿠키가 아직 설정되기 전 첫 방문 시 발생 가능)
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

  // PARTNER/GUEST는 리다이렉트 될 것이므로 로딩 표시
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
        selectedAgency,
        setSelectedAgency,
        agencyParam,
        agencies,
      }}
    >
      <div className="flex h-screen">
        <Sidebar user={user} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header
            user={user}
            agencies={agencies}
            selectedAgency={selectedAgency}
            onAgencyChange={setSelectedAgency}
          />
          <main className="flex-1 overflow-auto bg-gray-50 p-6">
            {children}
          </main>
        </div>
      </div>
    </DashboardContext.Provider>
  );
}
