"use client";

import { useState, useEffect, useRef } from "react";
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
import { Upload, Video, X, FileText, Loader2 } from "lucide-react";

interface NoticeFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: {
    id: string;
    title: string;
    content: string;
    isImportant: boolean | null;
    videoUrl?: string | null;
    attachmentName?: string | null;
    attachmentUrl?: string | null;
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
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setTitle(initialData.title);
        setContent(initialData.content);
        setIsImportant(!!initialData.isImportant);
        setVideoUrl(initialData.videoUrl || "");
        setAttachmentName(initialData.attachmentName || "");
        setAttachmentUrl(initialData.attachmentUrl || "");
      } else {
        setTitle("");
        setContent("");
        setIsImportant(false);
        setVideoUrl("");
        setAttachmentName("");
        setAttachmentUrl("");
      }
    }
  }, [open, initialData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast.error("파일 크기는 100MB 이하만 가능합니다.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "업로드 실패");
      }

      const data = await res.json();
      setAttachmentName(data.filename);
      setAttachmentUrl(data.url);
      toast.success(`${data.filename} 파일이 업로드되었습니다.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "파일 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveAttachment = () => {
    setAttachmentName("");
    setAttachmentUrl("");
  };

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

      const payload: Record<string, unknown> = {
        title,
        content,
        isImportant,
        videoUrl: videoUrl.trim() || undefined,
      };

      // 첨부파일 처리
      if (attachmentUrl) {
        payload.attachmentName = attachmentName;
        payload.attachmentUrl = attachmentUrl;
        payload.attachmentData = null; // 이전 DB 저장 데이터 정리
      } else if (!attachmentName && isEdit && initialData.attachmentName) {
        // 첨부파일 제거
        payload.attachmentName = null;
        payload.attachmentUrl = null;
        payload.attachmentData = null;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              placeholder="공지사항 내용을 입력하세요."
              rows={6}
              disabled={loading}
            />
          </div>

          {/* 첨부파일 */}
          <div>
            <Label className="flex items-center gap-1 mb-1">
              <FileText className="h-3.5 w-3.5" />
              첨부파일 (선택)
            </Label>
            {attachmentName ? (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="text-sm flex-1 truncate">{attachmentName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveAttachment}
                  disabled={loading || uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    업로드 중...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    파일 첨부 (HTML, PDF 등 모든 파일)
                  </>
                )}
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {/* 링크 URL */}
          <div>
            <Label htmlFor="notice-video" className="flex items-center gap-1">
              <Video className="h-3.5 w-3.5" />
              링크 URL (선택)
            </Label>
            <Input
              id="notice-video"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="YouTube, 구글드라이브 등 링크를 입력하세요"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              YouTube는 임베드 재생, 그 외 링크는 새 탭에서 열립니다.
            </p>
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
              disabled={loading || uploading}
            >
              취소
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {loading ? "저장 중..." : isEdit ? "수정" : "등록"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
