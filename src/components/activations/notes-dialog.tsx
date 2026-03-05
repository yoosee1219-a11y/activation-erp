"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Note {
  id: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
}

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  agencyName: string | null;
  action: string;
  details: string;
  createdAt: string;
}

interface NotesDialogProps {
  open: boolean;
  onClose: () => void;
  activationId: string;
  customerName: string;
}

export function NotesDialog({ open, onClose, activationId, customerName }: NotesDialogProps) {
  const [activeTab, setActiveTab] = useState<"notes" | "logs">("notes");
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsLoaded, setLogsLoaded] = useState(false);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/activations/${activationId}/notes`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes.reverse()); // 시간순 정렬 (오래된 것 먼저)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/activations/${activationId}/logs`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs ?? data);
        setLogsLoaded(true);
      }
    } catch {
      // ignore
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchNotes();
      // Reset logs state when dialog reopens
      setLogsLoaded(false);
      setLogs([]);
      setActiveTab("notes");
    }
  }, [open, activationId]);

  useEffect(() => {
    // Lazy load logs when the tab is selected
    if (activeTab === "logs" && !logsLoaded && !logsLoading) {
      fetchLogs();
    }
  }, [activeTab]);

  useEffect(() => {
    // 새 메시지 시 스크롤 아래로
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [notes]);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/activations/${activationId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message.trim() }),
      });
      if (res.ok) {
        setMessage("");
        await fetchNotes();
      }
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            특이사항 — {customerName}
          </DialogTitle>
        </DialogHeader>

        {/* Tab header */}
        <div className="flex gap-1 border-b mb-3">
          <button
            className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "notes" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("notes")}
          >
            특이사항
          </button>
          <button
            className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "logs" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("logs")}
          >
            작업이력
          </button>
        </div>

        {/* Notes tab */}
        {activeTab === "notes" && (
          <>
            <div
              ref={scrollRef}
              className="h-[300px] overflow-y-auto space-y-3 p-3 bg-gray-50 rounded-md"
            >
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : notes.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-gray-400">
                  아직 작성된 특이사항이 없습니다.
                </div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                          note.authorRole === "관리자"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        [{note.authorRole}] {note.authorName}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {format(new Date(note.createdAt), "MM/dd HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 pl-1 whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="특이사항을 입력하세요..."
                className="flex-1"
                disabled={sending}
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim() || sending}
                size="sm"
                className="px-3"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </>
        )}

        {/* Logs tab */}
        {activeTab === "logs" && (
          <div className="h-[340px] overflow-y-auto space-y-2 p-1">
            {logsLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">
                작업이력이 없습니다.
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="bg-gray-50 rounded-md p-3 text-sm">
                  <div className="text-xs text-gray-400 mb-1">
                    {"\uD83D\uDCCB"} {new Date(log.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })}.{" "}
                    {new Date(log.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })}
                  </div>
                  <div className="text-gray-700">{log.details}</div>
                </div>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
