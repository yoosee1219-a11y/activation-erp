"use client";

import { useEffect, useState, useMemo } from "react";
import { useDashboard } from "../../dashboard-context";
import { AgencyForm } from "@/components/admin/agency-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, FolderTree, Pencil, Phone, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { CategoryManager } from "@/components/admin/category-manager";
import { BookmarkTab, BookmarkTabsBar } from "@/components/ui/bookmark-tabs";

interface Agency {
  id: string;
  name: string;
  contactName: string | null;
  contactPhone: string | null;
  isActive: boolean | null;
  majorCategory?: string | null;
  mediumCategory?: string | null;
  commissionRate?: number | null;
}

export default function AgenciesPage() {
  const { user, categories, refreshCategories } = useDashboard();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editAgency, setEditAgency] = useState<Agency | undefined>();

  // 책갈피 탭 상태
  const [activeMajor, setActiveMajor] = useState<string | null>(null);

  const fetchAgencies = async () => {
    try {
      const res = await fetch("/api/agencies");
      const data = await res.json();
      setAgencies(data.agencies || []);
    } catch {
      toast.error("거래처 목록을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgencies();
  }, []);

  // 대분류별 거래처 카운트
  const majorCounts = useMemo(() => {
    const m: Record<string, number> = {};
    agencies.forEach((a) => {
      const k = a.majorCategory || "__unc__";
      m[k] = (m[k] || 0) + 1;
    });
    return m;
  }, [agencies]);

  // 활성 탭 기준 표시할 거래처
  const visibleAgencies = useMemo(() => {
    if (!activeMajor) return agencies;
    if (activeMajor === "__unc__")
      return agencies.filter((a) => !a.majorCategory);
    return agencies.filter((a) => a.majorCategory === activeMajor);
  }, [agencies, activeMajor]);

  const uncCount = majorCounts["__unc__"] || 0;

  if (user?.role !== "ADMIN" && user?.role !== "SUB_ADMIN") {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        접근 권한이 없습니다.
      </div>
    );
  }

  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">거래처 관리</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCategoryOpen(true)}>
              <FolderTree className="mr-2 h-4 w-4" />
              분류 관리
            </Button>
            <Button
              onClick={() => {
                setEditAgency(undefined);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              새 거래처
            </Button>
          </div>
        )}
      </div>

      {/* 책갈피 탭 — 대분류 */}
      <BookmarkTabsBar>
        <BookmarkTab
          active={!activeMajor}
          onClick={() => setActiveMajor(null)}
          label="전체"
          count={agencies.length}
        />
        {categories.map((major) => (
          <BookmarkTab
            key={major.id}
            active={activeMajor === major.id}
            onClick={() => setActiveMajor(major.id)}
            label={major.name}
            count={majorCounts[major.id] || 0}
          />
        ))}
        {uncCount > 0 && (
          <BookmarkTab
            active={activeMajor === "__unc__"}
            onClick={() => setActiveMajor("__unc__")}
            label="미분류"
            count={uncCount}
          />
        )}
      </BookmarkTabsBar>

      {/* 거래처 목록 (활성 탭) */}
      {loading ? (
        <div className="flex h-64 items-center justify-center text-gray-500">
          로딩 중...
        </div>
      ) : visibleAgencies.length === 0 ? (
        <Card className="flex h-32 items-center justify-center text-sm text-gray-400">
          해당 탭에 등록된 거래처가 없습니다.
        </Card>
      ) : (
        <Card className="overflow-hidden py-0">
          <div className="divide-y">
            {visibleAgencies.map((agency) => (
              <button
                key={agency.id}
                type="button"
                onClick={() => {
                  if (!isAdmin) return;
                  setEditAgency(agency);
                  setFormOpen(true);
                }}
                className="group flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-gray-50 disabled:opacity-50"
                disabled={!isAdmin}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {agency.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({agency.id})
                    </span>
                    {agency.majorCategory && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                        {agency.majorCategory}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                    {agency.contactName && (
                      <span className="flex items-center gap-1">
                        <UserIcon className="h-3 w-3" />
                        {agency.contactName}
                      </span>
                    )}
                    {agency.contactPhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {agency.contactPhone}
                      </span>
                    )}
                    {agency.commissionRate !== null &&
                      agency.commissionRate !== undefined && (
                        <span className="text-emerald-700">
                          수수료 {agency.commissionRate.toLocaleString()}원
                        </span>
                      )}
                  </div>
                </div>
                {isAdmin && (
                  <Pencil className="h-4 w-4 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
                )}
              </button>
            ))}
          </div>
        </Card>
      )}

      <AgencyForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditAgency(undefined);
        }}
        onSuccess={fetchAgencies}
        categories={categories}
        initialData={editAgency}
      />

      <CategoryManager
        open={categoryOpen}
        onClose={() => setCategoryOpen(false)}
        categories={categories}
        onCategoryCreated={refreshCategories}
      />
    </div>
  );
}
