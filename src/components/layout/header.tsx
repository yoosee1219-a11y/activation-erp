"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { SessionUser } from "@/types";

interface HeaderProps {
  user: SessionUser | null;
  agencies: { id: string; name: string }[];
  selectedAgency: string;
  onAgencyChange: (agencyId: string) => void;
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
  agencies,
  selectedAgency,
  onAgencyChange,
}: HeaderProps) {
  const showAgencyFilter =
    user?.role === "ADMIN" || user?.role === "SUB_ADMIN";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-4">
        {showAgencyFilter && (
          <Select value={selectedAgency} onValueChange={onAgencyChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="전체 거래처" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 거래처</SelectItem>
              {agencies.map((agency) => (
                <SelectItem key={agency.id} value={agency.id}>
                  {agency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
