"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  agencies: { id: string; name: string }[];
  initialData?: {
    id: string;
    email: string;
    name: string;
    role: string;
    allowedAgencies: string[];
  };
}

export function UserForm({
  open,
  onClose,
  onSuccess,
  agencies,
  initialData,
}: UserFormProps) {
  const isEdit = !!initialData;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: initialData?.email || "",
    password: "",
    name: initialData?.name || "",
    role: initialData?.role || "PARTNER",
    allowedAgencies: initialData?.allowedAgencies || [],
  });

  const handleAgencyToggle = (agencyId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      allowedAgencies: checked
        ? [...prev.allowedAgencies, agencyId]
        : prev.allowedAgencies.filter((id) => id !== agencyId),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEdit) {
        const res = await fetch("/api/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: initialData.id,
            name: formData.name,
            role: formData.role,
            allowedAgencies: formData.allowedAgencies,
          }),
        });
        if (!res.ok) throw new Error("Failed to update");
        toast.success("사용자가 수정되었습니다.");
      } else {
        if (!formData.password) {
          toast.error("비밀번호를 입력해주세요.");
          setLoading(false);
          return;
        }
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error("Failed to create");
        toast.success("사용자가 생성되었습니다.");
      }

      onSuccess();
      onClose();
    } catch {
      toast.error("저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "사용자 수정" : "새 사용자 생성"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>로그인 ID</Label>
            <Input
              type="text"
              value={formData.email}
              onChange={(e) =>
                setFormData((p) => ({ ...p, email: e.target.value }))
              }
              disabled={isEdit}
              required
              placeholder="이메일 또는 자유 ID (예: dreamhigh01)"
            />
            <p className="text-xs text-gray-500">
              이메일 형식이 아니면 자동으로 @activation-erp.local이 붙습니다
            </p>
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label>비밀번호</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, password: e.target.value }))
                }
                required
                minLength={4}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>이름</Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData((p) => ({ ...p, name: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label>역할</Label>
            <Select
              value={formData.role}
              onValueChange={(v) =>
                setFormData((p) => ({ ...p, role: v }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">관리자</SelectItem>
                <SelectItem value="SUB_ADMIN">부관리자</SelectItem>
                <SelectItem value="PARTNER">파트너</SelectItem>
                <SelectItem value="GUEST">게스트</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>접근 가능 거래처</Label>
            <div className="max-h-48 overflow-y-auto rounded border p-3 space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="agency-all"
                  checked={formData.allowedAgencies.includes("ALL")}
                  onCheckedChange={(v) => {
                    if (v) {
                      setFormData((p) => ({
                        ...p,
                        allowedAgencies: ["ALL"],
                      }));
                    } else {
                      setFormData((p) => ({
                        ...p,
                        allowedAgencies: [],
                      }));
                    }
                  }}
                />
                <Label htmlFor="agency-all" className="font-semibold">
                  전체 거래처
                </Label>
              </div>
              {!formData.allowedAgencies.includes("ALL") &&
                agencies.map((agency) => (
                  <div
                    key={agency.id}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`agency-${agency.id}`}
                      checked={formData.allowedAgencies.includes(agency.id)}
                      onCheckedChange={(v) =>
                        handleAgencyToggle(agency.id, !!v)
                      }
                    />
                    <Label htmlFor={`agency-${agency.id}`}>
                      {agency.name}
                    </Label>
                  </div>
                ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "저장 중..." : isEdit ? "수정" : "생성"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
