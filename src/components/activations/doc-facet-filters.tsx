"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, X } from "lucide-react";
import {
  FACET_LABELS,
  type DocFacet,
  type ReviewBucket,
} from "@/lib/supplement";

export type DocFacetFilters = Partial<Record<DocFacet, ReviewBucket>>;

interface Props {
  value: DocFacetFilters;
  onChange: (next: DocFacetFilters) => void;
  facets?: DocFacet[]; // 노출할 차원 (기본: 4개 모두)
  // 카운트(옵션): 각 차원별 미완료 건수
  counts?: Partial<Record<DocFacet, number>>;
}

const FACETS_DEFAULT: DocFacet[] = [
  "applicationDocs",
  "nameChangeDocs",
  "arc",
  "autopay",
];

const BUCKETS: ReviewBucket[] = ["완료", "미완료"];

export function DocFacetFilters({
  value,
  onChange,
  facets = FACETS_DEFAULT,
  counts,
}: Props) {
  const setFacet = (facet: DocFacet, bucket: ReviewBucket | null) => {
    const next = { ...value };
    if (bucket === null) {
      delete next[facet];
    } else {
      next[facet] = bucket;
    }
    onChange(next);
  };

  const hasAny = Object.keys(value).length > 0;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {facets.map((facet) => {
        const active = value[facet];
        const label = FACET_LABELS[facet];
        const count = counts?.[facet];
        const isActive = active !== undefined;

        return (
          <DropdownMenu key={facet}>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant={isActive ? "default" : "outline"}
                className={`h-8 px-2.5 text-xs gap-1 ${
                  isActive
                    ? active === "완료"
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-rose-600 hover:bg-rose-700 text-white"
                    : "border-dashed"
                }`}
              >
                <span>{label}</span>
                {isActive && (
                  <>
                    <span className="text-[10px] opacity-90">: {active}</span>
                    <X
                      className="h-3 w-3 ml-0.5 hover:opacity-70"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFacet(facet, null);
                      }}
                    />
                  </>
                )}
                {!isActive && (
                  <>
                    {typeof count === "number" && count > 0 && (
                      <span className="text-[10px] text-rose-500 font-semibold">
                        {count}
                      </span>
                    )}
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[120px]">
              <DropdownMenuItem onClick={() => setFacet(facet, null)}>
                <span className="flex-1">모두 보기</span>
                {!isActive && <Check className="h-3.5 w-3.5" />}
              </DropdownMenuItem>
              {BUCKETS.map((b) => (
                <DropdownMenuItem key={b} onClick={() => setFacet(facet, b)}>
                  <span className="flex-1">{b}</span>
                  {active === b && <Check className="h-3.5 w-3.5" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}

      {hasAny && (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs text-gray-500"
          onClick={() => onChange({})}
        >
          초기화
        </Button>
      )}
    </div>
  );
}

// 데이터 행에 facet 필터 적용
export function applyDocFacetFilters<
  T extends {
    activationMethod: string | null;
    applicationDocsReview: string | null;
    nameChangeDocsReview: string | null;
    arcReview: string | null;
    autopayReview: string | null;
  }
>(rows: T[], filters: DocFacetFilters): T[] {
  const entries = Object.entries(filters) as [DocFacet, ReviewBucket][];
  if (entries.length === 0) return rows;

  return rows.filter((row) => {
    for (const [facet, bucket] of entries) {
      // 외등 개통은 명변/외등 차원 N/A → 미완료 필터에서 제외
      const isArc = row.activationMethod === "외국인등록증";
      const isNotApplicable =
        isArc && (facet === "nameChangeDocs" || facet === "arc");
      if (isNotApplicable) {
        // 미완료 필터에서는 N/A 제외, 완료 필터에서는 N/A를 완료로 간주(=노이즈 회피)
        if (bucket === "미완료") return false;
        continue;
      }

      const reviewField = (
        {
          applicationDocs: "applicationDocsReview",
          nameChangeDocs: "nameChangeDocsReview",
          arc: "arcReview",
          autopay: "autopayReview",
        } as const
      )[facet];
      const value = row[reviewField];
      const rowBucket: ReviewBucket = value === "완료" ? "완료" : "미완료";
      if (rowBucket !== bucket) return false;
    }
    return true;
  });
}

// 미완료 건수 카운트 (버튼에 표시용)
export function countDocFacetIncomplete<
  T extends {
    activationMethod: string | null;
    applicationDocsReview: string | null;
    nameChangeDocsReview: string | null;
    arcReview: string | null;
    autopayReview: string | null;
  }
>(rows: T[]): Record<DocFacet, number> {
  const result: Record<DocFacet, number> = {
    applicationDocs: 0,
    nameChangeDocs: 0,
    arc: 0,
    autopay: 0,
  };
  for (const row of rows) {
    const isArc = row.activationMethod === "외국인등록증";
    if (row.applicationDocsReview !== "완료") result.applicationDocs++;
    if (!isArc && row.nameChangeDocsReview !== "완료") result.nameChangeDocs++;
    if (!isArc && row.arcReview !== "완료") result.arc++;
    if (row.autopayReview !== "완료") result.autopay++;
  }
  return result;
}
