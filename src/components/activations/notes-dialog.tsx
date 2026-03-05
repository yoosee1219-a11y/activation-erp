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

interface NotesDialogProps {
  open: boolean;
  onClose: () => void;
  activationId: string;
  customerName: string;
}

export function NotesDialog({ open, onClose, activationId, customerName }: NotesDialogProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (open) {
      fetchNotes();
    }
  }, [open, activationId]);

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
      </DialogContent>
    </Dialog>
  );
}
