"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "../../layout";
import { UserForm } from "@/components/admin/user-form";
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
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  allowedAgencies: string[];
  allowedMajorCategory?: string | null;
  allowedMediumCategories?: string[];
  plainPasswordHint?: string | null;
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

export default function UsersPage() {
  const { user, agencies, categories } = useDashboard();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserProfile | undefined>();
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(
    new Set()
  );

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      toast.error("사용자 목록을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/users?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("삭제되었습니다.");
        fetchUsers();
      }
    } catch {
      toast.error("삭제 중 오류가 발생했습니다.");
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handlePasswordChange = async (userId: string) => {
    const newPw = prompt("새 비밀번호를 입력하세요 (4자 이상):");
    if (!newPw || newPw.length < 4) {
      if (newPw !== null) toast.error("비밀번호는 4자 이상이어야 합니다.");
      return;
    }
    try {
      const res = await fetch("/api/users/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newPassword: newPw }),
      });
      if (res.ok) {
        toast.success("비밀번호가 변경되었습니다.");
        fetchUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || "변경 실패");
      }
    } catch {
      toast.error("비밀번호 변경 중 오류");
    }
  };

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
        <h1 className="text-2xl font-bold">사용자 관리</h1>
        {user?.role === "ADMIN" && (
          <Button
            onClick={() => {
              setEditUser(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            새 사용자
          </Button>
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
                <TableHead>이름</TableHead>
                <TableHead>로그인 ID</TableHead>
                <TableHead>역할</TableHead>
                {user?.role === "ADMIN" && (
                  <TableHead>비밀번호</TableHead>
                )}
                <TableHead>접근 거래처</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email?.replace(/@activation-erp\.local$/, "")}</TableCell>
                  <TableCell>
                    <Badge className={roleColors[u.role] || ""}>
                      {roleLabels[u.role] || u.role}
                    </Badge>
                  </TableCell>
                  {user?.role === "ADMIN" && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-mono">
                          {visiblePasswords.has(u.id)
                            ? u.plainPasswordHint || "미설정"
                            : "●●●●●●"}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePasswordVisibility(u.id)}
                        >
                          {visiblePasswords.has(u.id) ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePasswordChange(u.id)}
                          className="text-blue-600"
                        >
                          변경
                        </Button>
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="text-sm">
                    {u.allowedAgencies?.includes("ALL")
                      ? "전체"
                      : u.allowedMajorCategory
                      ? `${u.allowedMajorCategory}${u.allowedMediumCategories?.length ? ` (${u.allowedMediumCategories.join(", ")})` : ""}`
                      : u.allowedAgencies?.join(", ") || "-"}
                  </TableCell>
                  <TableCell>
                    {user?.role === "ADMIN" && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditUser(u);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(u.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={user?.role === "ADMIN" ? 6 : 5}
                    className="h-24 text-center text-gray-500"
                  >
                    등록된 사용자가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <UserForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditUser(undefined);
        }}
        onSuccess={fetchUsers}
        agencies={agencies}
        categories={categories}
        initialData={editUser}
      />
    </div>
  );
}
