"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { NotesDialog } from "./notes-dialog";

interface NoteIndicatorProps {
  activationId: string;
  customerName: string;
  noteCount: number;
}

export function NoteIndicator({ activationId, customerName, noteCount }: NoteIndicatorProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center justify-center h-7 w-7 rounded hover:bg-gray-100 transition-colors"
        title="특이사항"
      >
        <MessageCircle className={`h-4 w-4 ${noteCount > 0 ? "text-red-500" : "text-gray-300"}`} />
        {noteCount > 0 && (
          <>
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 text-[7px] text-white flex items-center justify-center font-bold">
              {noteCount > 9 ? "9+" : noteCount}
            </span>
          </>
        )}
      </button>
      <NotesDialog
        open={open}
        onClose={() => setOpen(false)}
        activationId={activationId}
        customerName={customerName}
      />
    </>
  );
}
