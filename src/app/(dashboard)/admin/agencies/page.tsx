"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useDashboard } from "../../layout";
import { AgencyForm } from "@/components/admin/agency-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Plus,
  Pencil,
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
  const [expandedMediums, setExpandedMediums] = useState<Set<string>>(new Set());

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

  const toggleMedium = useCallback((mediumId: string) => {
    setExpandedMediums((prev) => {
      const next = new Set(prev);
      if (next.has(mediumId)) {
        next.delete(mediumId);
      } else {
        next.add(mediumId);
      }
      return next;
    });
  }, []);

  // Build a lookup: mediumCategoryId -> Agency[]
  const agenciesByMedium = useMemo(() => {
    const map: Record<string, Agency[]> = {};
    for (const agency of agencies) {
      const key = agency.mediumCategory || "__uncategorized__";
      if (!map[key]) map[key] = [];
      map[key].push(agency);
    }
    // Sort each group alphabetically
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.name.localeCompare(b.name, "ko"));
    }
    return map;
  }, [agencies]);

  // Count agencies per major category (sum of all medium children)
  const agencyCountByMajor = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const major of categories) {
      let count = 0;
      for (const medium of major.children || []) {
        count += (agenciesByMedium[medium.id] || []).length;
      }
      counts[major.id] = count;
    }
    return counts;
  }, [categories, agenciesByMedium]);

  // Agencies without a matching category
  const uncategorizedAgencies = useMemo(() => {
    const allMediumIds = new Set<string>();
    for (const major of categories) {
      for (const medium of major.children || []) {
        allMediumIds.add(medium.id);
      }
    }
    return agencies.filter(
      (a) => !a.mediumCategory || !allMediumIds.has(a.mediumCategory)
    );
  }, [agencies, categories]);

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
              const majorCount = agencyCountByMajor[major.id] || 0;
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
                      {majorCount}
                    </span>
                  </button>

                  {/* Medium category rows */}
                  {isMajorExpanded && mediums.length > 0 && (
                    <div className="border-t border-gray-100 bg-gray-50/40">
                      {mediums.map((medium) => {
                        const isMediumExpanded = expandedMediums.has(medium.id);
                        const mediumAgencies =
                          agenciesByMedium[medium.id] || [];

                        return (
                          <div key={medium.id}>
                            {/* Medium row */}
                            <button
                              type="button"
                              onClick={() => toggleMedium(medium.id)}
                              className="flex w-full items-center gap-3 py-2.5 pl-10 pr-4 text-left transition-colors hover:bg-gray-100/60"
                            >
                              <span className="text-gray-400">
                                {isMediumExpanded ? (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5" />
                                )}
                              </span>
                              <span className="font-semibold text-gray-700">
                                {medium.name}
                              </span>
                              <span className="rounded-full bg-gray-200/70 px-2 py-0.5 text-xs font-medium text-gray-500">
                                {mediumAgencies.length}
                              </span>
                            </button>

                            {/* Agency rows */}
                            {isMediumExpanded && mediumAgencies.length > 0 && (
                              <div className="border-t border-gray-100/80 bg-white">
                                {mediumAgencies.map((agency) => (
                                  <div
                                    key={agency.id}
                                    className="flex items-center justify-between py-2 pl-20 pr-4 transition-colors hover:bg-blue-50/40"
                                  >
                                    <span className="text-sm text-gray-800">
                                      {agency.name}
                                    </span>
                                    <div className="flex items-center gap-3">
                                      {isAdmin &&
                                        agency.commissionRate != null &&
                                        agency.commissionRate > 0 && (
                                          <span className="text-xs text-gray-500">
                                            {agency.commissionRate.toLocaleString()}
                                            원/건
                                          </span>
                                        )}
                                      {isAdmin && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700"
                                          onClick={() => {
                                            setEditAgency(agency);
                                            setFormOpen(true);
                                          }}
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {isMediumExpanded &&
                              mediumAgencies.length === 0 && (
                                <div className="py-2 pl-20 pr-4 text-xs text-gray-400">
                                  등록된 거래처 없음
                                </div>
                              )}
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

            {/* Uncategorized agencies */}
            {uncategorizedAgencies.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => toggleMajor("__uncategorized__")}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                >
                  <span className="text-gray-400">
                    {expandedMajors.has("__uncategorized__") ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </span>
                  <span className="text-gray-400">
                    {expandedMajors.has("__uncategorized__") ? (
                      <FolderOpen className="h-5 w-5" />
                    ) : (
                      <Folder className="h-5 w-5" />
                    )}
                  </span>
                  <span className="font-bold text-gray-500">미분류</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                    {uncategorizedAgencies.length}
                  </span>
                </button>

                {expandedMajors.has("__uncategorized__") && (
                  <div className="border-t border-gray-100 bg-white">
                    {uncategorizedAgencies.map((agency) => (
                      <div
                        key={agency.id}
                        className="flex items-center justify-between py-2 pl-14 pr-4 transition-colors hover:bg-blue-50/40"
                      >
                        <span className="text-sm text-gray-800">
                          {agency.name}
                        </span>
                        <div className="flex items-center gap-3">
                          {isAdmin &&
                            agency.commissionRate != null &&
                            agency.commissionRate > 0 && (
                              <span className="text-xs text-gray-500">
                                {agency.commissionRate.toLocaleString()}원/건
                              </span>
                            )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700"
                              onClick={() => {
                                setEditAgency(agency);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
