"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface AgencyFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories?: CategoryNode[];
  initialData?: {
    id: string;
    name: string;
    contactName: string | null;
    contactPhone: string | null;
    majorCategory?: string | null;
    mediumCategory?: string | null;
  };
}

export function AgencyForm({
  open,
  onClose,
  onSuccess,
  categories = [],
  initialData,
}: AgencyFormProps) {
  const isEdit = !!initialData;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: initialData?.id || "",
    name: initialData?.name || "",
    contactName: initialData?.contactName || "",
    contactPhone: initialData?.contactPhone || "",
    majorCategory: initialData?.majorCategory || "",
    mediumCategory: initialData?.mediumCategory || "",
  });

  // 선택된 대분류의 중분류 목록
  const mediumOptions = useMemo(() => {
    if (!formData.majorCategory) return [];
    const major = categories.find((c) => c.id === formData.majorCategory);
    return major?.children || [];
  }, [formData.majorCategory, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/agencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          majorCategory: formData.majorCategory || null,
          mediumCategory: formData.mediumCategory || null,
        }),
      });

      if (!res.ok) throw new Error("Failed");

      toast.success(
        isEdit ? "거래처가 수정되었습니다." : "거래처가 등록되었습니다."
      );
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "거래처 수정" : "새 거래처 등록"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>ID (영문, 소문자)</Label>
            <Input
              value={formData.id}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  id: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                }))
              }
              disabled={isEdit}
              placeholder="예: dream_high"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>거래처명</Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="예: Dream High"
              required
            />
          </div>

          {categories.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>대분류</Label>
                <Select
                  value={formData.majorCategory}
                  onValueChange={(v) =>
                    setFormData((p) => ({
                      ...p,
                      majorCategory: v === "__none__" ? "" : v,
                      mediumCategory: "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="미분류" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">미분류</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>중분류</Label>
                <Select
                  value={formData.mediumCategory}
                  onValueChange={(v) =>
                    setFormData((p) => ({
                      ...p,
                      mediumCategory: v === "__none__" ? "" : v,
                    }))
                  }
                  disabled={!formData.majorCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.majorCategory ? "선택" : "대분류 먼저 선택"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">미분류</SelectItem>
                    {mediumOptions.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>담당자명</Label>
            <Input
              value={formData.contactName}
              onChange={(e) =>
                setFormData((p) => ({ ...p, contactName: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>연락처</Label>
            <Input
              value={formData.contactPhone}
              onChange={(e) =>
                setFormData((p) => ({ ...p, contactPhone: e.target.value }))
              }
              placeholder="010-0000-0000"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "저장 중..." : isEdit ? "수정" : "등록"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
