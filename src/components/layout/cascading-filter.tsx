"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, X } from "lucide-react";
import type { CategoryNode } from "@/hooks/use-agency-filter";

interface Agency {
  id: string;
  name: string;
  majorCategory?: string | null;
  mediumCategory?: string | null;
}

interface CascadingFilterProps {
  categories: CategoryNode[];
  agencies: Agency[];
  selectedMajors: string[];
  selectedMediums: string[];
  selectedAgencies: string[];
  onMajorsChange: (ids: string[]) => void;
  onMediumsChange: (ids: string[]) => void;
  onAgenciesChange: (ids: string[]) => void;
}

function FilterDropdown({
  label,
  items,
  selectedIds,
  onChange,
  disabled,
  emptyText,
}: {
  label: string;
  items: { id: string; name: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);

  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < items.length;

  const handleToggleAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(items.map((i) => i.id));
    }
  };

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const displayText = () => {
    if (selectedIds.length === 0) return `${label} 전체`;
    if (allSelected) return `${label} 전체`;
    if (selectedIds.length === 1) {
      const item = items.find((i) => i.id === selectedIds[0]);
      return item?.name || selectedIds[0];
    }
    return `${selectedIds.length}개 선택`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-9 min-w-[120px] justify-between gap-1 text-left font-normal"
        >
          <span className="truncate text-sm">{displayText()}</span>
          {selectedIds.length > 0 && !allSelected && (
            <Badge
              variant="secondary"
              className="ml-1 h-5 rounded-sm px-1 text-xs font-normal"
            >
              {selectedIds.length}
            </Badge>
          )}
          <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        {items.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-gray-500">
            {emptyText || "항목 없음"}
          </div>
        ) : (
          <div className="max-h-60 overflow-auto">
            {/* 전체선택 */}
            <label className="flex cursor-pointer items-center gap-2 border-b px-3 py-2 hover:bg-gray-50">
              <Checkbox
                checked={allSelected}
                // indeterminate not directly supported, use data attr
                data-indeterminate={someSelected ? "true" : undefined}
                onCheckedChange={handleToggleAll}
              />
              <span className="text-sm font-medium">전체선택</span>
              <span className="ml-auto text-xs text-gray-400">
                {items.length}
              </span>
            </label>
            {/* 개별 항목 */}
            {items.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-gray-50"
              >
                <Checkbox
                  checked={selectedIds.includes(item.id)}
                  onCheckedChange={() => handleToggle(item.id)}
                />
                <span className="text-sm">{item.name}</span>
              </label>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function CascadingFilter({
  categories,
  agencies,
  selectedMajors,
  selectedMediums,
  selectedAgencies,
  onMajorsChange,
  onMediumsChange,
  onAgenciesChange,
}: CascadingFilterProps) {
  // 대분류 목록
  const majorItems = useMemo(
    () => categories.map((c) => ({ id: c.id, name: c.name })),
    [categories]
  );

  // 중분류: 선택된 대분류에 해당하는 것만
  const mediumItems = useMemo(() => {
    if (selectedMajors.length === 0) {
      // 대분류 미선택 → 모든 중분류
      return categories.flatMap(
        (c) => (c.children || []).map((m) => ({ id: m.id, name: m.name }))
      );
    }
    return categories
      .filter((c) => selectedMajors.includes(c.id))
      .flatMap(
        (c) => (c.children || []).map((m) => ({ id: m.id, name: m.name }))
      );
  }, [categories, selectedMajors]);

  // 소분류(거래처): 선택된 대분류+중분류에 해당하는 것만
  const agencyItems = useMemo(() => {
    let filtered = agencies;

    // 대분류 필터
    if (selectedMajors.length > 0) {
      filtered = filtered.filter(
        (a) => a.majorCategory && selectedMajors.includes(a.majorCategory)
      );
    }

    // 중분류 필터
    if (selectedMediums.length > 0) {
      filtered = filtered.filter(
        (a) => a.mediumCategory && selectedMediums.includes(a.mediumCategory)
      );
    }

    // 미분류 거래처도 대분류가 선택 안된 경우 포함
    if (selectedMajors.length === 0 && selectedMediums.length === 0) {
      filtered = agencies;
    }

    return filtered.map((a) => ({ id: a.id, name: a.name }));
  }, [agencies, selectedMajors, selectedMediums]);

  // 대분류 변경 시 → 하위 선택 정리
  const handleMajorsChange = (ids: string[]) => {
    onMajorsChange(ids);

    // 선택된 대분류에 속하지 않는 중분류 제거
    if (ids.length > 0) {
      const validMediumIds = categories
        .filter((c) => ids.includes(c.id))
        .flatMap((c) => (c.children || []).map((m) => m.id));
      const newMediums = selectedMediums.filter((m) =>
        validMediumIds.includes(m)
      );
      if (newMediums.length !== selectedMediums.length) {
        onMediumsChange(newMediums);
      }

      // 선택된 대분류에 속하지 않는 소분류 제거
      const validAgencyIds = agencies
        .filter((a) => a.majorCategory && ids.includes(a.majorCategory))
        .map((a) => a.id);
      const newAgencies = selectedAgencies.filter((a) =>
        validAgencyIds.includes(a)
      );
      if (newAgencies.length !== selectedAgencies.length) {
        onAgenciesChange(newAgencies);
      }
    }
  };

  // 중분류 변경 시 → 소분류 정리
  const handleMediumsChange = (ids: string[]) => {
    onMediumsChange(ids);

    // 선택된 중분류에 속하지 않는 소분류 제거
    if (ids.length > 0) {
      const validAgencyIds = agencies
        .filter((a) => a.mediumCategory && ids.includes(a.mediumCategory))
        .map((a) => a.id);
      const newAgencies = selectedAgencies.filter((a) =>
        validAgencyIds.includes(a)
      );
      if (newAgencies.length !== selectedAgencies.length) {
        onAgenciesChange(newAgencies);
      }
    }
  };

  // 필터 초기화
  const hasAnyFilter =
    selectedMajors.length > 0 ||
    selectedMediums.length > 0 ||
    selectedAgencies.length > 0;

  const handleClearAll = () => {
    onMajorsChange([]);
    onMediumsChange([]);
    onAgenciesChange([]);
  };

  return (
    <div className="flex items-center gap-2">
      <FilterDropdown
        label="대분류"
        items={majorItems}
        selectedIds={selectedMajors}
        onChange={handleMajorsChange}
        emptyText="등록된 대분류가 없습니다"
      />
      <FilterDropdown
        label="중분류"
        items={mediumItems}
        selectedIds={selectedMediums}
        onChange={handleMediumsChange}
        emptyText={
          selectedMajors.length > 0
            ? "해당 대분류에 중분류가 없습니다"
            : "중분류 없음"
        }
      />
      <FilterDropdown
        label="거래처"
        items={agencyItems}
        selectedIds={selectedAgencies}
        onChange={onAgenciesChange}
        emptyText={
          selectedMediums.length > 0 || selectedMajors.length > 0
            ? "해당 분류에 거래처가 없습니다"
            : "거래처 없음"
        }
      />
      {hasAnyFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearAll}
          className="h-9 px-2 text-gray-500 hover:text-gray-700"
        >
          <X className="mr-1 h-3.5 w-3.5" />
          초기화
        </Button>
      )}
    </div>
  );
}
