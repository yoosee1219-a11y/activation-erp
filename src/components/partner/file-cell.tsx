"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FileUp, Link as LinkIcon, ExternalLink, Lock, X } from "lucide-react";
import { toast } from "sonner";

interface FileCellProps {
  value: string | null;
  rowId: string;
  field: string;
  agencyId: string;
  isEditable?: boolean;
  isLocked?: boolean;
  onUpdate: (id: string, field: string, value: string) => void;
}

// value는 단일 링크 또는 JSON 배열 문자열
function parseLinks(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // JSON이 아니면 단일 링크
  }
  return [value];
}

export function FileCell({
  value,
  rowId,
  field,
  agencyId,
  isEditable = true,
  isLocked = false,
  onUpdate,
}: FileCellProps) {
  const [linkInput, setLinkInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const links = parseLinks(value);

  // 잠긴 행 또는 편집 불가
  if (isLocked || !isEditable) {
    if (links.length === 0) {
      return (
        <span className="text-xs text-gray-400 flex items-center gap-1">
          {isLocked && <Lock className="h-3 w-3" />}
          -
        </span>
      );
    }
    return (
      <div className="flex flex-col gap-0.5">
        {links.map((link, i) => (
          <a
            key={i}
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            {links.length > 1 ? `파일${i + 1}` : "보기"}
          </a>
        ))}
      </div>
    );
  }

  // 값이 있는 경우
  if (links.length > 0) {
    return (
      <div className="flex items-center gap-1">
        <div className="flex flex-col gap-0.5">
          {links.map((link, i) => (
            <a
              key={i}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              {links.length > 1 ? `파일${i + 1}` : "보기"}
            </a>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1 text-[10px]"
          onClick={() => setOpen(true)}
        >
          추가
        </Button>
      </div>
    );
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const oversized = Array.from(files).filter((f) => f.size > MAX_SIZE);
    if (oversized.length > 0) {
      const names = oversized.map((f) => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join(", ");
      toast.error(
        `10MB 초과 파일은 업로드 불가: ${names}. 사진은 해상도를 낮추거나 PDF로 변환해 주세요.`,
        { duration: 6000 }
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    const newLinks: string[] = [...links];

    try {
      if (!agencyId) {
        toast.error("거래처를 먼저 선택하세요");
        setUploading(false);
        return;
      }

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        if (rowId) formData.append("activationId", rowId);
        formData.append("agencyId", agencyId);
        formData.append("fileType", field);

        const res = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          const link = data.document?.googleDriveLink || data.link || data.url || file.name;
          newLinks.push(link);
        } else if (res.status === 413) {
          toast.error(`${file.name}: 파일이 너무 커서 서버에서 거부되었습니다. (4.5MB 이하 권장)`);
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(`${file.name} 업로드 실패: ${err.error || res.statusText}`);
        }
      }

      if (newLinks.length > 0) {
        const saveValue = newLinks.length === 1 ? newLinks[0] : JSON.stringify(newLinks);
        onUpdate(rowId, field, saveValue);
        setOpen(false);
        toast.success(`${files.length}개 파일 업로드 완료`);
      }
    } catch {
      toast.error("파일 업로드 중 오류");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLinkSave = () => {
    if (linkInput.trim()) {
      const newLinks = [...links, linkInput.trim()];
      const saveValue = newLinks.length === 1 ? newLinks[0] : JSON.stringify(newLinks);
      onUpdate(rowId, field, saveValue);
      setLinkInput("");
      setOpen(false);
    }
  };

  const handleRemoveLink = (index: number) => {
    const newLinks = links.filter((_, i) => i !== index);
    if (newLinks.length === 0) {
      onUpdate(rowId, field, "");
    } else {
      const saveValue = newLinks.length === 1 ? newLinks[0] : JSON.stringify(newLinks);
      onUpdate(rowId, field, saveValue);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-dashed border-gray-300 hover:border-blue-400 transition-colors"
        >
          <FileUp className="mr-1 h-3 w-3" />
          첨부
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          {/* 기존 파일 목록 */}
          {links.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium">첨부된 파일</p>
              {links.map((link, i) => (
                <div key={i} className="flex items-center gap-1 text-xs">
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline truncate flex-1"
                  >
                    파일{i + 1}
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-red-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                    onClick={() => handleRemoveLink(i)}
                    title="삭제"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div>
            <p className="text-xs font-medium mb-1">파일 업로드 (여러 개 선택 가능)</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex flex-col items-center justify-center gap-1 py-3 px-2 border-2 border-dashed border-gray-300 rounded-md text-xs text-gray-600 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <FileUp className="h-4 w-4" />
              <span>{uploading ? "업로드 중..." : "클릭하여 파일 선택"}</span>
              <span className="text-[10px] text-gray-400">이미지 · PDF · 여러 개 가능 (최대 10MB)</span>
            </button>
          </div>
          <div className="border-t pt-2">
            <p className="text-xs font-medium mb-1">또는 링크 입력</p>
            <div className="flex gap-1">
              <Input
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="https://..."
                className="h-7 text-xs"
                onKeyDown={(e) => e.key === "Enter" && handleLinkSave()}
              />
              <Button
                size="sm"
                className="h-7 px-2"
                onClick={handleLinkSave}
                disabled={!linkInput.trim()}
              >
                <LinkIcon className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
