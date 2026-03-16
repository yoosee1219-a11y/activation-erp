"use client";

import { useEffect, useState, useCallback } from "react";
import { useDashboard } from "../../dashboard-context";
import { NoticeForm } from "@/components/admin/notice-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Video,
  FileText,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Download,
} from "lucide-react";
import { toast } from "sonner";

interface Notice {
  id: string;
  title: string;
  content: string;
  isImportant: boolean | null;
  videoUrl?: string | null;
  attachmentName?: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

/** YouTube URL → embed URL 변환 */
function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.pathname.includes("/embed/")) {
      return url;
    }
  } catch {
    // invalid URL
  }
  return null;
}

export default function AdminNoticesPage() {
  const { user } = useDashboard();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editNotice, setEditNotice] = useState<Notice | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchNotices = useCallback(async () => {
    try {
      const res = await fetch("/api/notices");
      const data = await res.json();
      setNotices(data.notices || []);
    } catch {
      toast.error("공지사항을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const handleDelete = async (id: string) => {
    if (!confirm("이 공지사항을 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/notices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("공지사항이 삭제되었습니다.");
      fetchNotices();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  if (!user || !["ADMIN", "SUB_ADMIN"].includes(user.role)) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">접근 권한이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">공지사항 관리</h1>
        <Button
          onClick={() => {
            setEditNotice(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" />새 공지
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">로딩 중...</p>
      ) : notices.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          등록된 공지사항이 없습니다.
        </Card>
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => {
            const isExpanded = expandedId === notice.id;
            const youtubeEmbed = notice.videoUrl
              ? getYouTubeEmbedUrl(notice.videoUrl)
              : null;

            return (
              <Card key={notice.id} className="overflow-hidden">
                <div className="flex items-start gap-2">
                  {/* 클릭하여 상세 보기 */}
                  <button
                    type="button"
                    className="flex flex-1 items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors min-w-0"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : notice.id)
                    }
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="flex flex-1 items-center gap-2 min-w-0">
                      {notice.isImportant && (
                        <Badge variant="destructive" className="shrink-0">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          중요
                        </Badge>
                      )}
                      {notice.videoUrl && (
                        <Video className="h-4 w-4 shrink-0 text-blue-500" />
                      )}
                      {notice.attachmentName && (
                        <FileText className="h-4 w-4 shrink-0 text-green-600" />
                      )}
                      <span className="font-semibold truncate">
                        {notice.title}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(notice.createdAt).toLocaleDateString("ko-KR")}
                    </span>
                  </button>

                  {/* 수정/삭제 버튼 */}
                  <div className="flex shrink-0 gap-1 p-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditNotice(notice);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(notice.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* 상세 내용 */}
                {isExpanded && (
                  <div className="border-t px-4 py-3">
                    {/* 동영상 / 외부 링크 */}
                    {notice.videoUrl && (
                      <div className="mb-4">
                        {youtubeEmbed ? (
                          <div className="aspect-video rounded overflow-hidden">
                            <iframe
                              src={youtubeEmbed}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title={notice.title}
                            />
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={notice.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              링크 열기
                            </a>
                          </Button>
                        )}
                      </div>
                    )}

                    {/* 내용 */}
                    <div className="whitespace-pre-wrap text-sm">
                      {notice.content}
                    </div>

                    {/* 첨부파일 미리보기 / 다운로드 */}
                    {notice.attachmentName && (
                      <div className="mt-4 flex items-center gap-2 flex-wrap">
                        <Button variant="default" size="sm" asChild>
                          <a
                            href={`/api/notices/${notice.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            미리보기
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={`/api/notices/${notice.id}/download?download=true`}
                            download
                          >
                            <Download className="mr-2 h-4 w-4" />
                            다운로드
                          </a>
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {notice.attachmentName}
                        </span>
                      </div>
                    )}

                    <p className="mt-3 text-xs text-muted-foreground">
                      작성자: {notice.createdByName} &middot;{" "}
                      {new Date(notice.createdAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <NoticeForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditNotice(undefined);
        }}
        onSuccess={fetchNotices}
        initialData={editNotice}
      />
    </div>
  );
}
