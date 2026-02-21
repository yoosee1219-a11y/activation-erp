"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lock } from "lucide-react";

interface EditableCellProps {
  value: string | null;
  rowId: string;
  field: string;
  type?: "text" | "date" | "select";
  options?: string[];
  isEditable?: boolean;
  isLocked?: boolean;
  onUpdate: (id: string, field: string, value: string) => void;
  placeholder?: string;
}

export function EditableCell({
  value,
  rowId,
  field,
  type = "text",
  options = [],
  isEditable = true,
  isLocked = false,
  onUpdate,
  placeholder = "",
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // 잠긴 행 또는 편집 불가
  if (isLocked || !isEditable) {
    return (
      <div className={`flex items-center gap-1 text-sm ${isLocked ? "text-gray-400" : "text-gray-700"}`}>
        {isLocked && <Lock className="h-3 w-3 text-gray-400 shrink-0" />}
        <span className="truncate">{value || "-"}</span>
      </div>
    );
  }

  // Select 타입
  if (type === "select") {
    return (
      <Select
        value={value || ""}
        onValueChange={(v) => onUpdate(rowId, field, v)}
      >
        <SelectTrigger className="h-7 w-full text-xs border-dashed">
          <SelectValue placeholder={placeholder || "선택"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Text / Date 편집 모드
  if (editing) {
    const handleSave = () => {
      setEditing(false);
      if (tempValue !== (value || "")) {
        onUpdate(rowId, field, tempValue);
      }
    };

    return (
      <Input
        ref={inputRef}
        type={type === "date" ? "date" : "text"}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") {
            setTempValue(value || "");
            setEditing(false);
          }
        }}
        className="h-7 text-xs"
      />
    );
  }

  // 디스플레이 모드 (클릭하면 편집)
  return (
    <div
      onClick={() => {
        setTempValue(value || "");
        setEditing(true);
      }}
      className="cursor-pointer rounded px-1 py-0.5 text-sm hover:bg-blue-50 min-h-[28px] flex items-center"
    >
      {value || <span className="text-gray-400">{placeholder || "클릭하여 입력"}</span>}
    </div>
  );
}
