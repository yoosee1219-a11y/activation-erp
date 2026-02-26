"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronRight, FolderTree, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import type { CategoryNode } from "@/hooks/use-agency-filter";

interface CategoryManagerProps {
  open: boolean;
  onClose: () => void;
  categories: CategoryNode[];
  onCategoryCreated: () => void;
}

export function CategoryManager({
  open,
  onClose,
  categories,
  onCategoryCreated,
}: CategoryManagerProps) {
  const [addMode, setAddMode] = useState<"major" | "medium" | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    parentId: "",
  });

  // 편집 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // 삭제 확인 상태
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
    linkedCount: number;
    childCount: number;
  } | null>(null);

  const resetForm = () => {
    setFormData({ id: "", name: "", parentId: "" });
    setAddMode(null);
  };

  const handleCreate = async () => {
    if (!formData.id || !formData.name) {
      toast.error("ID와 이름을 입력해주세요.");
      return;
    }
    if (addMode === "medium" && !formData.parentId) {
      toast.error("소속 대분류를 선택해주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: formData.id,
          name: formData.name,
          level: addMode,
          parentId: addMode === "medium" ? formData.parentId : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "생성 실패");
      }

      toast.success(
        addMode === "major"
          ? `대분류 "${formData.name}" 생성 완료`
          : `중분류 "${formData.name}" 생성 완료`
      );
      resetForm();
      onCategoryCreated();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "카테고리 생성에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  // ── 이름 수정 ──
  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleUpdate = async () => {
    if (!editingId || !editName.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, name: editName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "수정 실패");
      }

      toast.success("이름이 수정되었습니다.");
      cancelEdit();
      onCategoryCreated();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "수정에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  // ── 삭제 ──
  const handleDeleteRequest = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/categories?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.needConfirm) {
        setDeleteConfirm({
          id,
          name,
          linkedCount: data.linkedCount,
          childCount: data.childCount,
        });
        return;
      }

      if (data.deleted) {
        toast.success(`"${name}" 삭제 완료`);
        onCategoryCreated();
      }
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    try {
      const res = await fetch(
        `/api/categories?id=${deleteConfirm.id}&force=true`,
        { method: "DELETE" }
      );
      const data = await res.json();

      if (data.deleted) {
        toast.success(`"${deleteConfirm.name}" 삭제 완료`);
        setDeleteConfirm(null);
        onCategoryCreated();
      }
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  // ── 카테고리 행 렌더링 ──
  const renderCategoryRow = (
    cat: CategoryNode,
    level: "major" | "medium"
  ) => {
    const isEditing = editingId === cat.id;

    return (
      <div key={cat.id} className="flex items-center gap-2 group">
        {level === "medium" && (
          <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
        )}
        <Badge
          variant="outline"
          className={
            level === "major"
              ? "bg-blue-50 text-blue-700 flex-shrink-0"
              : "bg-green-50 text-green-700 flex-shrink-0"
          }
        >
          {level === "major" ? "대분류" : "중분류"}
        </Badge>

        {isEditing ? (
          <>
            <Input
              className="h-7 w-32 text-sm"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleUpdate();
                if (e.key === "Escape") cancelEdit();
              }}
              autoFocus
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-green-600"
              onClick={handleUpdate}
              disabled={loading}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-400"
              onClick={cancelEdit}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <>
            <span className="text-sm font-medium">{cat.name}</span>
            <span className="text-xs text-gray-400">({cat.id})</span>
            <div className="ml-auto flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600"
                onClick={() => startEdit(cat.id, cat.name)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                onClick={() => handleDeleteRequest(cat.id, cat.name)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              분류 관리
            </DialogTitle>
          </DialogHeader>

          {/* 현재 분류 트리 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700">
                현재 분류 구조
              </div>
              <span className="text-xs text-gray-400">
                마우스를 올리면 편집/삭제
              </span>
            </div>
            <div className="rounded-md border bg-gray-50 p-3">
              {categories.length === 0 ? (
                <p className="text-sm text-gray-500">등록된 분류가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {categories.map((major) => (
                    <div key={major.id} className="space-y-1">
                      {renderCategoryRow(major, "major")}
                      {major.children && major.children.length > 0 && (
                        <div className="ml-6 space-y-1">
                          {major.children.map((medium) =>
                            renderCategoryRow(medium, "medium")
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 추가 버튼 */}
          {!addMode && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddMode("major")}
              >
                <Plus className="mr-1 h-4 w-4" />
                대분류 추가
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddMode("medium")}
                disabled={categories.length === 0}
              >
                <Plus className="mr-1 h-4 w-4" />
                중분류 추가
              </Button>
            </div>
          )}

          {/* 추가 폼 */}
          {addMode && (
            <div className="space-y-3 rounded-md border bg-blue-50/50 p-3">
              <div className="text-sm font-medium">
                {addMode === "major" ? "대분류 추가" : "중분류 추가"}
              </div>

              {addMode === "medium" && (
                <div className="space-y-1">
                  <Label className="text-xs">소속 대분류</Label>
                  <Select
                    value={formData.parentId}
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, parentId: v }))
                    }
                  >
                    <SelectTrigger className="bg-white">
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
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">ID (영문)</Label>
                  <Input
                    className="bg-white"
                    value={formData.id}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        id: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                      }))
                    }
                    placeholder={
                      addMode === "major" ? "예: DOD" : "예: DOD_키르기스스탄"
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">표시명</Label>
                  <Input
                    className="bg-white"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder={
                      addMode === "major" ? "예: DOD" : "예: DOD 키르기스스탄"
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  취소
                </Button>
                <Button size="sm" onClick={handleCreate} disabled={loading}>
                  {loading ? "생성 중..." : "생성"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(v) => !v && setDeleteConfirm(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">삭제 확인</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">
              <strong>&quot;{deleteConfirm?.name}&quot;</strong> 분류를
              삭제하시겠습니까?
            </p>
            {(deleteConfirm?.linkedCount ?? 0) > 0 && (
              <div className="rounded-md bg-yellow-50 border border-yellow-200 p-2 text-sm text-yellow-800">
                {deleteConfirm?.linkedCount}개 거래처가 이 분류에 연결되어
                있습니다. 삭제해도 거래처 데이터는 유지됩니다.
              </div>
            )}
            {(deleteConfirm?.childCount ?? 0) > 0 && (
              <div className="rounded-md bg-yellow-50 border border-yellow-200 p-2 text-sm text-yellow-800">
                {deleteConfirm?.childCount}개 중분류가 포함되어 있습니다.
                대분류만 비활성화됩니다.
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirm(null)}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteConfirm}
              >
                삭제
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
