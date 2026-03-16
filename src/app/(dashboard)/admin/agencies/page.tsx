"use client";

import { useEffect, useState, useCallback } from "react";
import { useDashboard } from "../../dashboard-context";
import { AgencyForm } from "@/components/admin/agency-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Plus,
  FolderTree,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { CategoryManager } from "@/components/admin/category-manager";

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

  // Tree expand/collapse state
  const [expandedMajors, setExpandedMajors] = useState<Set<string>>(new Set());

  const toggleMajor = useCallback((majorId: string) => {
    setExpandedMajors((prev) => {
      const next = new Set(prev);
      if (next.has(majorId)) {
        next.delete(majorId);
      } else {
        next.add(majorId);
      }
      return next;
    });
  }, []);


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

  if (user?.role !== "ADMIN" && user?.role !== "SUB_ADMIN") {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        접근 권한이 없습니다.
      </div>
    );
  }

  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">거래처 관리</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setCategoryOpen(true)}
            >
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

      {/* Tree View */}
      {loading ? (
        <div className="flex h-64 items-center justify-center text-gray-500">
          로딩 중...
        </div>
      ) : categories.length === 0 && agencies.length === 0 ? (
        <Card className="flex h-48 items-center justify-center text-gray-500">
          등록된 거래처가 없습니다.
        </Card>
      ) : (
        <Card className="overflow-hidden py-0">
          <div className="divide-y">
            {categories.map((major) => {
              const isMajorExpanded = expandedMajors.has(major.id);
              const mediums = major.children || [];

              return (
                <div key={major.id}>
                  {/* Major category row */}
                  <button
                    type="button"
                    onClick={() => toggleMajor(major.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                  >
                    <span className="text-gray-400">
                      {isMajorExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </span>
                    <span className="text-gray-500">
                      {isMajorExpanded ? (
                        <FolderOpen className="h-5 w-5" />
                      ) : (
                        <Folder className="h-5 w-5" />
                      )}
                    </span>
                    <span className="font-bold text-gray-900">
                      {major.name}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                      {mediums.length}
                    </span>
                  </button>

                  {/* Medium category rows */}
                  {isMajorExpanded && mediums.length > 0 && (
                    <div className="border-t border-gray-100 bg-gray-50/40">
                      {mediums.map((medium) => {
                        return (
                          <div
                            key={medium.id}
                            className="flex items-center gap-3 py-2.5 pl-10 pr-4"
                          >
                            <span className="font-semibold text-gray-700">
                              {medium.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {isMajorExpanded && mediums.length === 0 && (
                    <div className="border-t border-gray-100 bg-gray-50/40 py-2 pl-10 pr-4 text-xs text-gray-400">
                      하위 분류 없음
                    </div>
                  )}
                </div>
              );
            })}

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
