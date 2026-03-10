"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";

interface Notice {
  id: string;
  title: string;
  content: string;
  isImportant: boolean | null;
  createdByName: string;
  createdAt: string;
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
                    <div
                      className="prose prose-sm max-w-none text-sm"
                      dangerouslySetInnerHTML={{ __html: notice.content }}
                    />
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
