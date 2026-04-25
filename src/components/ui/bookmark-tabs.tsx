"use client";

import { ReactNode } from "react";

/**
 * 책갈피(폴더 탭) 패턴.
 * 활성 탭이 위로 -translate-y-1 + shadow로 떠있는 효과.
 * 어드민/파트너 모든 페이지에서 동일 디자인.
 */
export function BookmarkTab({
  active,
  onClick,
  label,
  count,
  size = "lg",
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  size?: "lg" | "sm";
  icon?: ReactNode;
}) {
  const isLg = size === "lg";
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`group relative flex min-w-0 items-center justify-center gap-2 rounded-t-lg ${
        isLg ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs"
      } font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 ${
        active
          ? "-translate-y-1 border-x border-t border-gray-200 bg-white shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.08)]"
          : "border border-transparent bg-gray-50 text-gray-600 hover:-translate-y-0.5 hover:bg-gray-100"
      }`}
    >
      {icon && (
        <span className={active ? "text-gray-700" : "text-gray-400"}>{icon}</span>
      )}
      <span className={`whitespace-nowrap ${active ? "text-gray-900" : ""}`}>
        {label}
      </span>
      {count !== undefined && (
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
            active ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-700"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/**
 * 책갈피 탭 바 (기본 컨테이너).
 */
export function BookmarkTabsBar({
  children,
  className = "",
  label,
  indented = false,
}: {
  children: ReactNode;
  className?: string;
  /** 보조 라벨 (예: "중분류", "거래처") */
  label?: string;
  /** 부모 탭 아래 들여쓰기 (중분류 탭 등) */
  indented?: boolean;
}) {
  return (
    <div
      role="tablist"
      className={`flex flex-wrap items-end gap-1 border-b border-gray-200 ${
        indented ? "pl-4" : ""
      } ${className}`}
    >
      {label && (
        <span className="flex items-center gap-1 pr-2 text-[11px] font-medium text-gray-400">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}
