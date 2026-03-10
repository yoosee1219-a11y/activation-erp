"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface NoticeFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: {
    id: string;
    title: string;
    content: string;
    isImportant: boolean | null;
  };
}

export function NoticeForm({
  open,
  onClose,
  onSuccess,
  initialData,
}: NoticeFormProps) {
  const isEdit = !!initialData;
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isImportant, setIsImportant] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setTitle(initialData.title);
        setContent(initialData.content);
        setIsImportant(!!initialData.isImportant);
      } else {
        setTitle("");
        setContent("");
        setIsImportant(false);
      }
    }
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("제목과 내용을 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const url = isEdit ? `/api/notices/${initialData.id}` : "/api/notices";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, isImportant }),
      });

      if (!res.ok) throw new Error("Failed");

      toast.success(isEdit ? "공지사항이 수정되었습니다." : "공지사항이 등록되었습니다.");
      onSuccess();
      onClose();
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "공지사항 수정" : "새 공지사항"}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? "공지사항 내용을 수정합니다." : "새로운 공지사항을 작성합니다."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="notice-title">제목</Label>
            <Input
              id="notice-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="공지사항 제목"
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="notice-content">내용</Label>
            <Textarea
              id="notice-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="공지사항 내용을 입력하세요. HTML 태그 사용 가능합니다."
              rows={10}
              disabled={loading}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="notice-important"
              checked={isImportant}
              onCheckedChange={(v) => setIsImportant(!!v)}
              disabled={loading}
            />
            <Label htmlFor="notice-important" className="cursor-pointer">
              중요 공지로 설정 (상단 고정)
            </Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
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
