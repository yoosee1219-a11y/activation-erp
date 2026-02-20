"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/hooks/use-auth";
import { useAgencyFilter } from "@/hooks/use-agency-filter";
import { createContext, useContext } from "react";
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
  const {
    agencies,
    selectedAgency,
    setSelectedAgency,
    agencyParam,
  } = useAgencyFilter();

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
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
