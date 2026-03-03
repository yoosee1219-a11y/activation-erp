"use client";

import { Badge } from "@/components/ui/badge";
import { CascadingFilter } from "@/components/layout/cascading-filter";
import type { SessionUser } from "@/types";
import type { CategoryNode } from "@/hooks/use-agency-filter";

interface HeaderProps {
  user: SessionUser | null;
  categories: CategoryNode[];
  selectedMajors: string[];
  selectedMediums: string[];
  onMajorsChange: (ids: string[]) => void;
  onMediumsChange: (ids: string[]) => void;
}

const roleLabels: Record<string, string> = {
  ADMIN: "관리자",
  SUB_ADMIN: "부관리자",
  PARTNER: "파트너",
  GUEST: "게스트",
};

const roleColors: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-800",
  SUB_ADMIN: "bg-orange-100 text-orange-800",
  PARTNER: "bg-blue-100 text-blue-800",
  GUEST: "bg-gray-100 text-gray-800",
};

export function Header({
  user,
  categories,
  selectedMajors,
  selectedMediums,
  onMajorsChange,
  onMediumsChange,
}: HeaderProps) {
  const showAgencyFilter =
    user?.role === "ADMIN" || user?.role === "SUB_ADMIN";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-4">
        {showAgencyFilter && (
          <CascadingFilter
            categories={categories}
            selectedMajors={selectedMajors}
            selectedMediums={selectedMediums}
            onMajorsChange={onMajorsChange}
            onMediumsChange={onMediumsChange}
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <Badge
            variant="secondary"
            className={roleColors[user.role] || ""}
          >
            {roleLabels[user.role] || user.role}
          </Badge>
        )}
      </div>
    </header>
  );
}
