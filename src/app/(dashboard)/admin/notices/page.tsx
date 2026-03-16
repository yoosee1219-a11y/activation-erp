"use client";

import { useEffect, useState, useCallback } from "react";
import { useDashboard } from "../../dashboard-context";
import { NoticeForm } from "@/components/admin/notice-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, AlertTriangle, Video, FileText } from "lucide-react";
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

export default function AdminNoticesPage() {
  const { user } = useDashboard();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editNotice, setEditNotice] = useState<Notice | undefined>();

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
          {notices.map((notice) => (
            <Card key={notice.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
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
                    <h3 className="font-semibold truncate">{notice.title}</h3>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {notice.content.replace(/<[^>]*>/g, "").slice(0, 200)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {notice.createdByName} &middot;{" "}
                    {new Date(notice.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
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
            </Card>
          ))}
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
