"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  ColumnResizeMode,
  Header,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Columns3 } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  searchPlaceholder?: string;
  getRowClassName?: (row: TData) => string;
  highlightId?: string | null;
  getRowId?: (row: TData) => string;
  pageSizeOptions?: number[];
  showPagination?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  total,
  page,
  pageSize = 50,
  onPageChange,
  onPageSizeChange,
  searchPlaceholder = "검색...",
  getRowClassName,
  highlightId,
  getRowId,
  pageSizeOptions = [20, 50, 100],
  showPagination = true,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnResizeMode] = useState<ColumnResizeMode>("onChange");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // 서버사이드 페이징 여부: onPageChange가 있으면 서버, 없으면 클라이언트
  const isServerPaging = !!onPageChange;

  const table = useReactTable({
    data,
    columns,
    columnResizeMode,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    initialState: {
      pagination: {
        pageSize: isServerPaging ? data.length || pageSize : pageSize,
        pageIndex: 0,
      },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
  });

  // 더블클릭 자동맞춤: 헤더 + 셀 내용 중 가장 넓은 값에 맞춤
  const tableRef = useRef<HTMLTableElement>(null);
  const handleAutoFit = useCallback((header: Header<TData, unknown>) => {
    if (!tableRef.current) return;
    const colIndex = header.index;
    const cells = tableRef.current.querySelectorAll(
      `td:nth-child(${colIndex + 1}), th:nth-child(${colIndex + 1})`
    );
    let maxWidth = 50; // 최소 50px
    cells.forEach((cell) => {
      // 실제 콘텐츠 너비 측정
      const el = cell as HTMLElement;
      const contentWidth = el.scrollWidth + 16; // 패딩 여유
      if (contentWidth > maxWidth) maxWidth = contentWidth;
    });
    // 최대 400px 제한
    maxWidth = Math.min(maxWidth, 400);
    table.setColumnSizing((old) => ({
      ...old,
      [header.column.id]: maxWidth,
    }));
  }, [table]);

  // 클라이언트 페이징: pageSize 변경 시 테이블 반영
  useEffect(() => {
    if (!isServerPaging) {
      table.setPageSize(pageSize);
    } else {
      // 서버 페이징일 때는 전체 데이터를 한 페이지에 표시
      table.setPageSize(data.length || pageSize);
    }
  }, [pageSize, isServerPaging, table, data.length]);

  // 서버 페이징용 계산
  const serverTotal = total ?? data.length;
  const serverTotalPages = isServerPaging ? Math.ceil(serverTotal / pageSize) : 0;

  // 클라이언트 페이징용 계산
  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const clientTotalPages = Math.ceil(filteredRowCount / pageSize);
  const clientPageIndex = table.getState().pagination.pageIndex;
  const clientPage = clientPageIndex + 1;

  // 실제 사용할 값
  const currentPage = isServerPaging ? (page ?? 1) : clientPage;
  const totalPages = isServerPaging ? serverTotalPages : clientTotalPages;
  const totalCount = isServerPaging ? serverTotal : filteredRowCount;

  const handlePageChange = (newPage: number) => {
    if (isServerPaging && onPageChange) {
      onPageChange(newPage);
    } else {
      table.setPageIndex(newPage - 1);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    if (onPageSizeChange) {
      onPageSizeChange(newSize);
    }
    if (!isServerPaging) {
      table.setPageSize(newSize);
      table.setPageIndex(0);
    }
  };

  // 페이지 번호 목록 생성 (최대 7개)
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const highlightRef = useRef<HTMLTableRowElement>(null);
  const hasScrolled = useRef(false);

  useEffect(() => {
    if (highlightId && highlightRef.current && !hasScrolled.current) {
      hasScrolled.current = true;
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [highlightId, data]);

  // 현재 표시 범위
  const rangeStart = (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Columns3 className="mr-2 h-4 w-4" />
              컬럼
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) =>
                    column.toggleVisibility(!!value)
                  }
                >
                  {typeof column.columnDef.header === "string"
                    ? column.columnDef.header
                    : column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border bg-white overflow-x-auto">
        <Table ref={tableRef} style={{ width: table.getCenterTotalSize() }}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="relative cursor-pointer select-none group"
                    style={{ width: header.getSize() }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center whitespace-nowrap overflow-hidden">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {{
                        asc: " ↑",
                        desc: " ↓",
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                    {/* 리사이즈 핸들 */}
                    <div
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleAutoFit(header);
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        header.getResizeHandler()(e);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        header.getResizeHandler()(e);
                      }}
                      className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none transition-colors ${
                        header.column.getIsResizing()
                          ? "bg-blue-500"
                          : "bg-transparent group-hover:bg-gray-300"
                      }`}
                    />
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const rowId = getRowId ? getRowId(row.original) : undefined;
                const isHighlighted = highlightId && rowId === highlightId;
                const isSelected = selectedRowId != null && rowId === selectedRowId;
                const baseClass = getRowClassName ? getRowClassName(row.original) : "";
                const highlightClass = isHighlighted
                  ? "ring-2 ring-blue-500 bg-blue-50/70 animate-pulse"
                  : isSelected
                  ? "!bg-green-50 ring-1 ring-green-400"
                  : "";
                return (
                  <TableRow
                    key={row.id}
                    ref={isHighlighted ? highlightRef : undefined}
                    className={`cursor-pointer ${baseClass} ${highlightClass}`.trim() || undefined}
                    onClick={() => {
                      if (rowId) {
                        setSelectedRowId((prev) => (prev === rowId ? null : rowId));
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-gray-500"
                >
                  데이터가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 */}
      {showPagination && totalCount > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-500">
              전체 {totalCount}건 중 {rangeStart}-{rangeEnd}건
            </p>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => handlePageSizeChange(Number(v))}
            >
              <SelectTrigger className="h-8 w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}개
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(1)}
                disabled={currentPage <= 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {getPageNumbers().map((p, i) =>
                p === "..." ? (
                  <span key={`dot-${i}`} className="px-1 text-sm text-gray-400">
                    ...
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={p === currentPage ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8 text-xs"
                    onClick={() => handlePageChange(p)}
                  >
                    {p}
                  </Button>
                )
              )}

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage >= totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
