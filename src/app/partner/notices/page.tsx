"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronDown, ChevronRight, Video, Download, FileText, ExternalLink } from "lucide-react";

interface Notice {
  id: string;
  title: string;
  content: string;
  isImportant: boolean | null;
  videoUrl?: string | null;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  createdByName: string;
  createdAt: string;
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

export default function PartnerNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchNotices = useCallback(async () => {
    try {
      const res = await fetch("/api/notices");
      const data = await res.json();
      setNotices(data.notices || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  // 중요 공지 상단, 나머지 최신순
  const sorted = [...notices].sort((a, b) => {
    if (a.isImportant && !b.isImportant) return -1;
    if (!a.isImportant && b.isImportant) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">공지사항</h1>

      {loading ? (
        <p className="text-muted-foreground">로딩 중...</p>
      ) : sorted.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          등록된 공지사항이 없습니다.
        </Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((notice) => {
            const isExpanded = expandedId === notice.id;
            const youtubeEmbed = notice.videoUrl
              ? getYouTubeEmbedUrl(notice.videoUrl)
              : null;

            return (
              <Card
                key={notice.id}
                className={`overflow-hidden ${notice.isImportant ? "border-red-200 bg-red-50/30" : ""}`}
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
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
                    <span className="font-medium truncate">
                      {notice.title}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(notice.createdAt).toLocaleDateString("ko-KR")}
                  </span>
                </button>
                {isExpanded && (
                  <div className="border-t px-4 py-3">
                    {/* 동영상 */}
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
                    <div
                      className="prose prose-sm max-w-none text-sm"
                      dangerouslySetInnerHTML={{ __html: notice.content }}
                    />

                    {/* 첨부파일 미리보기 / 다운로드 */}
                    {notice.attachmentName && (
                      <div className="mt-4 flex items-center gap-2 flex-wrap">
                        <Button variant="default" size="sm" asChild>
                          <a
                            href={notice.attachmentUrl || `/api/notices/${notice.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            미리보기
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={notice.attachmentUrl || `/api/notices/${notice.id}/download?download=true`}
                            download={notice.attachmentName}
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
                      작성자: {notice.createdByName}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
