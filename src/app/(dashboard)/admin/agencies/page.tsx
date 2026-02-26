"use client";

import { useEffect, useState, useMemo } from "react";
import { useDashboard } from "../../layout";
import { AgencyForm } from "@/components/admin/agency-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, FolderTree } from "lucide-react";
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
}

export default function AgenciesPage() {
  const { user, categories, refreshCategories } = useDashboard();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editAgency, setEditAgency] = useState<Agency | undefined>();

  const categoryNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const major of categories) {
      map[major.id] = major.name;
      for (const medium of major.children || []) {
        map[medium.id] = medium.name;
      }
    }
    return map;
  }, [categories]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">거래처 관리</h1>
        {user?.role === "ADMIN" && (
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

      {loading ? (
        <div className="flex h-64 items-center justify-center text-gray-500">
          로딩 중...
        </div>
      ) : (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>거래처명</TableHead>
                <TableHead>대분류</TableHead>
                <TableHead>중분류</TableHead>
                <TableHead>담당자</TableHead>
                <TableHead>연락처</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agencies.map((agency) => (
                <TableRow key={agency.id}>
                  <TableCell className="font-mono text-sm">
                    {agency.id}
                  </TableCell>
                  <TableCell className="font-medium">
                    {agency.name}
                  </TableCell>
                  <TableCell className="text-sm">
                    {agency.majorCategory
                      ? categoryNameMap[agency.majorCategory] || agency.majorCategory
                      : <span className="text-gray-400">-</span>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {agency.mediumCategory
                      ? categoryNameMap[agency.mediumCategory] || agency.mediumCategory
                      : <span className="text-gray-400">-</span>}
                  </TableCell>
                  <TableCell>{agency.contactName || "-"}</TableCell>
                  <TableCell>{agency.contactPhone || "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={agency.isActive ? "default" : "secondary"}
                      className={
                        agency.isActive
                          ? "bg-green-100 text-green-800"
                          : ""
                      }
                    >
                      {agency.isActive ? "활성" : "비활성"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user?.role === "ADMIN" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditAgency(agency);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {agencies.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-24 text-center text-gray-500"
                  >
                    등록된 거래처가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
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
