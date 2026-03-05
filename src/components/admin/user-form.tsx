"use client";

import { useState, useMemo } from "react";
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
import type { CategoryNode } from "@/hooks/use-agency-filter";

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  agencies: { id: string; name: string; majorCategory?: string | null; mediumCategory?: string | null }[];
  categories?: CategoryNode[];
  initialData?: {
    id: string;
    email: string;
    name: string;
    role: string;
    allowedAgencies: string[];
    allowedMajorCategory?: string | null;
    allowedMediumCategories?: string[];
  };
}

type AccessMode = "all" | "category" | "direct";

export function UserForm({
  open,
  onClose,
  onSuccess,
  agencies,
  categories = [],
  initialData,
}: UserFormProps) {
  const isEdit = !!initialData;

  // 초기 접근 모드 결정
  const initialAccessMode = (): AccessMode => {
    if (!initialData) return "all";
    if (initialData.allowedAgencies.includes("ALL")) return "all";
    if (initialData.allowedMajorCategory) return "category";
    if (initialData.allowedAgencies.length > 0) return "direct";
    return "all";
  };

  const [loading, setLoading] = useState(false);
  const [accessMode, setAccessMode] = useState<AccessMode>(initialAccessMode);
  const [formData, setFormData] = useState({
    email: initialData?.email || "",
    password: "",
    name: initialData?.name || "",
    role: initialData?.role || "PARTNER",
    allowedAgencies: initialData?.allowedAgencies || [],
    allowedMajorCategory: initialData?.allowedMajorCategory || "",
    allowedMediumCategories: initialData?.allowedMediumCategories || [],
  });

  // 선택된 대분류의 중분류 목록
  const selectedMajorChildren = useMemo(() => {
    if (!formData.allowedMajorCategory) return [];
    const major = categories.find((c) => c.id === formData.allowedMajorCategory);
    return major?.children || [];
  }, [formData.allowedMajorCategory, categories]);

  const handleAgencyToggle = (agencyId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      allowedAgencies: checked
        ? [...prev.allowedAgencies, agencyId]
        : prev.allowedAgencies.filter((id) => id !== agencyId),
    }));
  };

  const handleMediumToggle = (mediumId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      allowedMediumCategories: checked
        ? [...prev.allowedMediumCategories, mediumId]
        : prev.allowedMediumCategories.filter((id) => id !== mediumId),
    }));
  };

  const handleMediumSelectAll = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      allowedMediumCategories: checked
        ? selectedMajorChildren.map((c) => c.id)
        : [],
    }));
  };

  const handleAccessModeChange = (mode: AccessMode) => {
    setAccessMode(mode);
    // 모드 변경 시 관련 필드 초기화
    if (mode === "all") {
      setFormData((p) => ({
        ...p,
        allowedAgencies: ["ALL"],
        allowedMajorCategory: "",
        allowedMediumCategories: [],
      }));
    } else if (mode === "category") {
      setFormData((p) => ({
        ...p,
        allowedAgencies: [],
        allowedMajorCategory: categories.length === 1 ? categories[0].id : "",
        allowedMediumCategories: [],
      }));
    } else {
      setFormData((p) => ({
        ...p,
        allowedAgencies: [],
        allowedMajorCategory: "",
        allowedMediumCategories: [],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 전송 데이터 구성
      const payload: Record<string, unknown> = {
        name: formData.name,
        role: formData.role,
      };

      if (accessMode === "all") {
        payload.allowedAgencies = ["ALL"];
        payload.allowedMajorCategory = null;
        payload.allowedMediumCategories = [];
      } else if (accessMode === "category") {
        payload.allowedAgencies = [];
        payload.allowedMajorCategory = formData.allowedMajorCategory || null;
        payload.allowedMediumCategories = formData.allowedMediumCategories;
      } else {
        payload.allowedAgencies = formData.allowedAgencies;
        payload.allowedMajorCategory = null;
        payload.allowedMediumCategories = [];
      }

      if (isEdit) {
        const res = await fetch("/api/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: initialData.id, ...payload }),
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
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            ...payload,
          }),
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

  const isAllMediumSelected =
    selectedMajorChildren.length > 0 &&
    selectedMajorChildren.every((c) =>
      formData.allowedMediumCategories.includes(c.id)
    );

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
              placeholder="4글자 이상 (예: dreamhigh01)"
              minLength={4}
            />
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

          {/* 접근 가능 거래처 설정 */}
          <div className="space-y-2">
            <Label>접근 설정</Label>
            <Select
              value={accessMode}
              onValueChange={(v) => handleAccessModeChange(v as AccessMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 거래처</SelectItem>
                {categories.length > 0 && (
                  <SelectItem value="category">카테고리 기반</SelectItem>
                )}
                <SelectItem value="direct">직접 지정</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 카테고리 기반 접근 설정 */}
          {accessMode === "category" && (
            <div className="space-y-3 rounded border p-3">
              <div className="space-y-2">
                <Label className="text-sm">대분류</Label>
                <Select
                  value={formData.allowedMajorCategory}
                  onValueChange={(v) =>
                    setFormData((p) => ({
                      ...p,
                      allowedMajorCategory: v,
                      allowedMediumCategories: [],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="대분류 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.allowedMajorCategory && selectedMajorChildren.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">중분류</Label>
                  <div className="space-y-2 rounded border p-2">
                    {selectedMajorChildren.length > 1 && (
                      <div className="flex items-center space-x-2 border-b pb-2">
                        <Checkbox
                          id="medium-all"
                          checked={isAllMediumSelected}
                          onCheckedChange={(v) => handleMediumSelectAll(!!v)}
                        />
                        <Label htmlFor="medium-all" className="font-semibold text-sm">
                          전체 선택
                        </Label>
                      </div>
                    )}
                    {selectedMajorChildren.map((medium) => (
                      <div key={medium.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`medium-${medium.id}`}
                          checked={formData.allowedMediumCategories.includes(medium.id)}
                          onCheckedChange={(v) =>
                            handleMediumToggle(medium.id, !!v)
                          }
                        />
                        <Label htmlFor={`medium-${medium.id}`} className="text-sm">
                          {medium.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 직접 지정 접근 설정 */}
          {accessMode === "direct" && (
            <div className="max-h-48 overflow-y-auto rounded border p-3 space-y-2">
              {agencies.map((agency) => (
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
                  <Label htmlFor={`agency-${agency.id}`} className="text-sm">
                    {agency.name}
                  </Label>
                </div>
              ))}
            </div>
          )}

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
