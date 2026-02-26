"use client";

import { useState, useCallback } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download } from "lucide-react";

// CSV 헤더 → 내부 필드명 매핑
const HEADER_MAP: Record<string, string> = {
  "업체명(유학원)": "agencyId",
  "업체명": "agencyId",
  "고객명": "customerName",
  "유심번호": "usimNumber",
  "입국예정일": "entryDate",
  "가입번호": "subscriptionNumber",
  "신규개통번호": "newPhoneNumber",
  "가상계좌번호": "virtualAccount",
  "가입유형": "subscriptionType",
  "요금제": "ratePlan",
  "확정기변": "deviceChangeConfirmed",
  "선택약정": "selectedCommitment",
  "개통일자": "activationDate",
  "개통여부": "activationStatus",
  "담당자": "personInCharge",
  "비고": "notes",
  "명의변경서류": "nameChangeDocs",
  "개통날짜": "activationDate2",
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

interface ImportResult {
  inserted: number;
  skipped: number;
  errors: string[];
  newAgencies: string[];
}

export default function ImportPage() {
  const [fileName, setFileName] = useState<string>("");
  const [mappedRows, setMappedRows] = useState<MappedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string>("");

  const handleFile = useCallback((file: File) => {
    setError("");
    setResult(null);
    setFileName(file.name);
    reviewCount = 0;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;

      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string, index: number) => {
          const h = header.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

          // "서류 검수" 패턴 감지
          if (h === "서류 검수" || h === "서류검수") {
            return resolveReviewField();
          }

          return normalizeHeader(header);
        },
        complete: (results) => {
          const rows = (results.data as MappedRow[]).filter((row) => {
            // 빈 행 스킵
            const customerName = row.customerName || "";
            return customerName.trim().length > 0;
          });

          // _skip 필드 제거
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
    };
    reader.readAsText(file, "utf-8");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".csv")) {
        handleFile(file);
      } else {
        setError("CSV 파일만 지원합니다.");
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
    } catch {
      setError("서버 연결 오류");
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    window.location.href = "/api/export";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">데이터 가져오기 / 내보내기</h1>
          <p className="text-sm text-gray-500 mt-1">
            구글 시트에서 다운로드한 CSV 파일을 가져오거나, 현재 데이터를 CSV로 내보낼 수 있습니다.
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          CSV 내보내기
        </Button>
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
          accept=".csv"
          className="hidden"
          onChange={handleInputChange}
        />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-700">
          CSV 파일을 여기에 끌어다 놓거나 클릭하여 선택
        </p>
        <p className="text-sm text-gray-500 mt-2">
          구글 시트에서 &quot;파일 &gt; 다운로드 &gt; CSV&quot;로 다운로드한 파일
        </p>
      </div>

      {/* 에러 표시 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* 결과 표시 */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
            <p className="text-sm font-medium text-green-700">
              가져오기 완료: {result.inserted}건 추가, {result.skipped}건 스킵
            </p>
          </div>
          {result.newAgencies.length > 0 && (
            <p className="text-xs text-green-600 ml-8">
              새로 생성된 거래처: {result.newAgencies.join(", ")}
            </p>
          )}
          {result.errors.length > 0 && (
            <div className="ml-8 mt-2">
              <p className="text-xs font-medium text-orange-600">오류:</p>
              <ul className="text-xs text-orange-600 list-disc list-inside max-h-32 overflow-y-auto">
                {result.errors.slice(0, 20).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {result.errors.length > 20 && (
                  <li>... 외 {result.errors.length - 20}건</li>
                )}
              </ul>
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

          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">No.</th>
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
                {mappedRows.slice(0, 50).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-1.5 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-1.5">{row.agencyId || "-"}</td>
                    <td className="px-3 py-1.5 font-medium">{row.customerName || "-"}</td>
                    <td className="px-3 py-1.5">{row.usimNumber || "-"}</td>
                    <td className="px-3 py-1.5">{row.entryDate || "-"}</td>
                    <td className="px-3 py-1.5">{row.activationStatus || "-"}</td>
                    <td className="px-3 py-1.5">{row.personInCharge || "-"}</td>
                    <td className="px-3 py-1.5">{row.ratePlan || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {mappedRows.length > 50 && (
              <p className="text-xs text-gray-400 text-center py-2">
                ... 처음 50건만 표시 (전체 {mappedRows.length}건)
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
