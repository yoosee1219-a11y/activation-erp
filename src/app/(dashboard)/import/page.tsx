"use client";

import { useState, useCallback, useMemo } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download } from "lucide-react";

// CSV 헤더 → 내부 필드명 매핑
const HEADER_MAP: Record<string, string> = {
  // 기본 정보
  "업체명(유학원)": "agencyId",
  "업체명": "agencyId",
  "거래처명": "agencyId",
  "고객명": "customerName",
  "유심번호": "usimNumber",
  "입국예정일": "entryDate",
  // 가입 정보
  "가입번호": "subscriptionNumber",
  "신규개통번호": "newPhoneNumber",
  "가상계좌번호": "virtualAccount",
  "가입유형": "subscriptionType",
  "요금제": "ratePlan",
  // 개통 상태
  "확정기변": "deviceChangeConfirmed",
  "선택약정": "selectedCommitment",
  "개통일자": "activationDate",
  "개통날짜": "activationDate2",
  "개통여부": "activationStatus",
  "담당자": "personInCharge",
  // 서류 (고유 헤더명 지원)
  "가입신청서류": "applicationDocs",
  "가입신청서류 검수": "applicationDocsReview",
  "명의변경서류": "nameChangeDocs",
  "명의변경서류 검수": "nameChangeDocsReview",
  // 외국인등록증 / 자동이체
  "외국인등록증 정보": "arcInfo",
  "외국인등록증": "arcInfo",
  "외국인등록증 검수": "arcReview",
  "자동이체 정보": "autopayInfo",
  "자동이체": "autopayInfo",
  "자동이체 검수": "autopayReview",
  "외국인등록증 보완": "arcSupplement",
  "외국인등록증 보완기한": "arcSupplementDeadline",
  "보완기한": "arcSupplementDeadline",
  "보완상태": "supplementStatus",
  "자동이체 등록여부": "autopayRegistered",
  // 기타
  "확정기변 선택약정 날짜": "commitmentDate",
  "비고": "notes",
  "개통방법": "activationMethod",
};

// 멀티라인 헤더 정규화
function normalizeHeader(header: string): string {
  const h = header.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

  // 직접 매핑
  if (HEADER_MAP[h]) return HEADER_MAP[h];
  if (HEADER_MAP[header.trim()]) return HEADER_MAP[header.trim()];

  // 부분 매칭
  if (h.includes("가입신청서류")) return "applicationDocs";
  if (h.includes("외국인등록증") && h.includes("자동이체")) return "arcAutopayInfo";
  if (h.includes("외국인등록증") && h.includes("보완기한")) return "arcSupplementDeadline";
  if (h.includes("외국인등록증") && h.includes("보완")) return "arcSupplement";
  if (h.includes("자동이체") && h.includes("등록")) return "autopayRegistered";
  if (h.includes("확정기변") && h.includes("날짜")) return "commitmentDate";

  // 메타 컬럼 (스킵)
  if (h.includes("노란색")) return "_skip";
  if (h.includes("파란색")) return "_skip";
  if (h.includes("비고는")) return "_skip";

  return h;
}

// 서류검수 컬럼 순서 추적
let reviewCount = 0;
function resolveReviewField(): string {
  reviewCount++;
  if (reviewCount === 1) return "applicationDocsReview";
  if (reviewCount === 2) return "nameChangeDocsReview";
  if (reviewCount === 3) return "arcAutopayReview";
  return `_review${reviewCount}`;
}

type MappedRow = Record<string, string>;
type RowStatus = "inserted" | "duplicate" | "skipped" | "error";
type FilterTab = "all" | "inserted" | "duplicate" | "error";

interface ImportResult {
  inserted: number;
  skipped: number;
  duplicates: number;
  errors: string[];
  newAgencies: string[];
  rowStatuses: Record<number, RowStatus>;
}

// 상태별 스타일
const STATUS_STYLES: Record<RowStatus, { bg: string; badge: string; badgeBg: string; label: string }> = {
  inserted: { bg: "bg-green-50", badge: "text-green-700", badgeBg: "bg-green-100", label: "추가됨" },
  duplicate: { bg: "bg-red-50", badge: "text-red-700", badgeBg: "bg-red-100", label: "중복" },
  skipped: { bg: "bg-gray-50", badge: "text-gray-500", badgeBg: "bg-gray-100", label: "스킵" },
  error: { bg: "bg-orange-50", badge: "text-orange-700", badgeBg: "bg-orange-100", label: "오류" },
};

export default function ImportPage() {
  const [fileName, setFileName] = useState<string>("");
  const [mappedRows, setMappedRows] = useState<MappedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string>("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");

  // 공통: 파싱된 raw 행 → 헤더 정규화 + 정리
  const processRawRows = useCallback((headers: string[], rawRows: string[][]) => {
    reviewCount = 0;
    // 헤더 정규화
    const mappedHeaders = headers.map((header) => {
      const h = header.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
      if (h === "서류 검수" || h === "서류검수") {
        return resolveReviewField();
      }
      return normalizeHeader(header);
    });

    // 행을 객체로 변환
    const rows: MappedRow[] = [];
    for (const rawRow of rawRows) {
      const row: MappedRow = {};
      for (let c = 0; c < mappedHeaders.length; c++) {
        const key = mappedHeaders[c];
        const val = rawRow[c] ?? "";
        if (key && !key.startsWith("_") && val !== "") {
          row[key] = val;
        }
      }
      // 고객명 있는 행만
      if ((row.customerName || "").trim().length > 0) {
        rows.push(row);
      }
    }
    return rows;
  }, []);

  // XLSX 파싱: 숫자 원본 보존 (과학표기법 문제 해결)
  const parseXlsx = useCallback((data: ArrayBuffer) => {
    try {
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        setError("시트를 찾을 수 없습니다.");
        return;
      }

      // raw: true → 숫자가 JavaScript Number 타입으로 (12자리까진 정밀도 보존)
      // header: 1 → 배열의 배열로 반환 (헤더 수동 처리)
      const jsonData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        raw: true,
        defval: "",
      });

      if (jsonData.length < 2) {
        setError("데이터가 없습니다.");
        return;
      }

      // 첫 행 = 헤더
      const headers = jsonData[0].map((h) => String(h ?? ""));

      // 나머지 행 = 데이터 (숫자 → 문자열 변환, 정밀도 보존)
      const dataRows = jsonData.slice(1).map((row) =>
        row.map((cell) => {
          if (cell === null || cell === undefined || cell === "") return "";
          if (typeof cell === "number") {
            // 숫자를 문자열로 변환 (과학표기법 방지)
            // 12자리 이하 정수는 Number.toString()으로 정확히 변환됨
            return cell.toString();
          }
          return String(cell);
        })
      );

      const rows = processRawRows(headers, dataRows);
      setMappedRows(rows);
    } catch (err) {
      setError(`엑셀 파싱 오류: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [processRawRows]);

  // CSV 파싱: 기존 PapaParse 로직
  const parseCsv = useCallback((text: string) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        const h = header.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
        if (h === "서류 검수" || h === "서류검수") {
          return resolveReviewField();
        }
        return normalizeHeader(header);
      },
      complete: (results) => {
        const rows = (results.data as MappedRow[]).filter((row) => {
          const customerName = row.customerName || "";
          return customerName.trim().length > 0;
        });
        const cleaned = rows.map((row) => {
          const clean: MappedRow = {};
          for (const [key, value] of Object.entries(row)) {
            if (!key.startsWith("_") && value !== undefined) {
              clean[key] = value;
            }
          }
          return clean;
        });
        setMappedRows(cleaned);
      },
      error: (err: Error) => {
        setError(`CSV 파싱 오류: ${err.message}`);
      },
    });
  }, []);

  const handleFile = useCallback((file: File) => {
    setError("");
    setResult(null);
    setFileName(file.name);
    setFilterTab("all");
    reviewCount = 0;

    const ext = file.name.split(".").pop()?.toLowerCase();
    const isExcel = ext === "xlsx" || ext === "xls";

    if (isExcel) {
      // XLSX/XLS → ArrayBuffer → SheetJS 파싱
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result as ArrayBuffer;
        parseXlsx(data);
      };
      reader.readAsArrayBuffer(file);
    } else {
      // CSV → 텍스트 → PapaParse
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        parseCsv(text);
      };
      reader.readAsText(file, "utf-8");
    }
  }, [parseXlsx, parseCsv]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      const ext = file?.name.split(".").pop()?.toLowerCase();
      if (file && (ext === "csv" || ext === "xlsx" || ext === "xls")) {
        handleFile(file);
      } else {
        setError("CSV 또는 엑셀(.xlsx) 파일만 지원합니다.");
      }
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleImport = async () => {
    if (mappedRows.length === 0) return;

    setImporting(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: mappedRows }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "가져오기 실패");
        return;
      }

      setResult(data);
      setFilterTab("all");
    } catch {
      setError("서버 연결 오류");
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    window.location.href = "/api/export";
  };

  // 필터링된 행 목록 (인덱스 포함)
  const filteredRows = useMemo(() => {
    const indexed = mappedRows.map((row, i) => ({ row, index: i }));
    if (!result || filterTab === "all") return indexed;

    return indexed.filter(({ index }) => {
      const status = result.rowStatuses[index];
      if (filterTab === "inserted") return status === "inserted";
      if (filterTab === "duplicate") return status === "duplicate";
      if (filterTab === "error") return status === "error" || status === "skipped";
      return true;
    });
  }, [mappedRows, result, filterTab]);

  // 필터 탭 카운트
  const tabCounts = useMemo(() => {
    if (!result) return { all: mappedRows.length, inserted: 0, duplicate: 0, error: 0 };
    const counts = { all: mappedRows.length, inserted: 0, duplicate: 0, error: 0 };
    for (const status of Object.values(result.rowStatuses)) {
      if (status === "inserted") counts.inserted++;
      else if (status === "duplicate") counts.duplicate++;
      else counts.error++;
    }
    return counts;
  }, [result, mappedRows.length]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">데이터 가져오기 / 내보내기</h1>
          <p className="text-sm text-gray-500 mt-1">
            엑셀(.xlsx) 또는 CSV 파일을 가져오거나, 현재 데이터를 CSV로 내보낼 수 있습니다.
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/import-template.csv" download="개통관리_임포트_템플릿.csv">
            <Button variant="outline" type="button">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              템플릿 다운로드
            </Button>
          </a>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            CSV 내보내기
          </Button>
        </div>
      </div>

      {/* 드래그 앤 드롭 영역 */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors cursor-pointer"
        onClick={() => document.getElementById("csv-input")?.click()}
      >
        <input
          id="csv-input"
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleInputChange}
        />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-700">
          엑셀(.xlsx) 또는 CSV 파일을 끌어다 놓거나 클릭하여 선택
        </p>
        <p className="text-sm text-gray-500 mt-2">
          구글 시트 &gt; &quot;파일 &gt; 다운로드 &gt; xlsx&quot; 권장 (숫자 정밀도 보존)
        </p>
      </div>

      {/* 에러 표시 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* 결과 요약 (컴팩트) */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-green-700">
                가져오기 완료
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                추가 {result.inserted}건
              </span>
              {result.duplicates > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  중복 {result.duplicates}건
                </span>
              )}
              {result.skipped > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                  스킵/오류 {result.skipped}건
                </span>
              )}
            </div>
          </div>
          {result.newAgencies.length > 0 && (
            <p className="text-xs text-green-600 ml-8">
              새로 생성된 거래처: {result.newAgencies.join(", ")}
            </p>
          )}
          {result.errors.length > 0 && (
            <div className="ml-8 mt-1">
              <details className="text-xs text-orange-600">
                <summary className="cursor-pointer font-medium">
                  오류 상세 ({result.errors.length}건)
                </summary>
                <ul className="list-disc list-inside mt-1 max-h-24 overflow-y-auto">
                  {result.errors.slice(0, 20).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {result.errors.length > 20 && (
                    <li>... 외 {result.errors.length - 20}건</li>
                  )}
                </ul>
              </details>
            </div>
          )}
        </div>
      )}

      {/* 미리보기 테이블 */}
      {mappedRows.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">{fileName}</p>
                <p className="text-xs text-gray-500">{mappedRows.length}개 행</p>
              </div>
            </div>
            <Button
              onClick={handleImport}
              disabled={importing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {importing ? "가져오는 중..." : `${mappedRows.length}건 가져오기`}
            </Button>
          </div>

          {/* 필터 탭 (결과가 있을 때만 표시) */}
          {result && (
            <div className="flex items-center gap-1 px-4 py-2 border-b bg-gray-50">
              <button
                onClick={() => setFilterTab("all")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterTab === "all"
                    ? "bg-gray-800 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100 border"
                }`}
              >
                전체 {tabCounts.all}
              </button>
              {tabCounts.inserted > 0 && (
                <button
                  onClick={() => setFilterTab("inserted")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterTab === "inserted"
                      ? "bg-green-600 text-white"
                      : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                  }`}
                >
                  추가됨 {tabCounts.inserted}
                </button>
              )}
              {tabCounts.duplicate > 0 && (
                <button
                  onClick={() => setFilterTab("duplicate")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterTab === "duplicate"
                      ? "bg-red-600 text-white"
                      : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                  }`}
                >
                  중복 {tabCounts.duplicate}
                </button>
              )}
              {tabCounts.error > 0 && (
                <button
                  onClick={() => setFilterTab("error")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterTab === "error"
                      ? "bg-orange-600 text-white"
                      : "bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200"
                  }`}
                >
                  오류 {tabCounts.error}
                </button>
              )}
            </div>
          )}

          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">No.</th>
                  {result && (
                    <th className="px-3 py-2 text-left font-medium text-gray-500">상태</th>
                  )}
                  <th className="px-3 py-2 text-left font-medium text-gray-500">거래처</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">고객명</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">유심번호</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">입국예정일</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">개통여부</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">담당자</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">요금제</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRows.slice(0, 100).map(({ row, index }) => {
                  const status = result?.rowStatuses[index] as RowStatus | undefined;
                  const style = status ? STATUS_STYLES[status] : null;

                  return (
                    <tr
                      key={index}
                      className={style ? style.bg : "hover:bg-gray-50"}
                    >
                      <td className="px-3 py-1.5 text-gray-500">{index + 1}</td>
                      {result && (
                        <td className="px-3 py-1.5">
                          {style && (
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${style.badgeBg} ${style.badge}`}>
                              {style.label}
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-3 py-1.5">{row.agencyId || "-"}</td>
                      <td className="px-3 py-1.5 font-medium">{row.customerName || "-"}</td>
                      <td className="px-3 py-1.5">{row.usimNumber || "-"}</td>
                      <td className="px-3 py-1.5">{row.entryDate || "-"}</td>
                      <td className="px-3 py-1.5">{row.activationStatus || "-"}</td>
                      <td className="px-3 py-1.5">{row.personInCharge || "-"}</td>
                      <td className="px-3 py-1.5">{row.ratePlan || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredRows.length > 100 && (
              <p className="text-xs text-gray-400 text-center py-2">
                ... 처음 100건만 표시 (전체 {filteredRows.length}건)
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
