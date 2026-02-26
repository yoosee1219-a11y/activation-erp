/**
 * Google Sheets HTML Export → DB Import 스크립트
 * 2025-12, 2026-02, 2026-03 시트 데이터를 직접 DB에 삽입
 */
import fs from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

// .env.local 로드
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

// HTML 테이블 파싱
function parseHtml(filePath) {
  const html = fs.readFileSync(filePath, "utf-8");
  const tableMatch = html.match(
    /<table[^>]*class=.waffle[^>]*>([\s\S]*?)<\/table>/
  );
  if (!tableMatch) return [];

  const rows = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(tableMatch[1])) !== null) {
    const cells = [];
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      let content = cellMatch[1];
      // href 추출 (서류 링크)
      const linkMatch = content.match(/href="([^"]*)"/);
      const href = linkMatch
        ? linkMatch[1].replace(/&#39;/g, "").replace(/&amp;/g, "&")
        : null;
      // HTML 태그 제거
      content = content
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .trim();
      // Zero-width space 제거
      content = content.replace(/\u200B/g, "");
      cells.push({ text: content, href });
    }
    if (cells.some((c) => c.text)) rows.push(cells);
  }
  return rows;
}

// 날짜 변환
function parseDate(value) {
  if (!value || !value.trim()) return null;
  const v = value.trim();

  // 26/02/04 → 2026-02-04
  const shortMatch = v.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (shortMatch) {
    return `20${shortMatch[1]}-${shortMatch[2]}-${shortMatch[3]}`;
  }

  // 2026. 2. 4 → 2026-02-04
  const dotMatch = v.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})$/);
  if (dotMatch) {
    return `${dotMatch[1]}-${dotMatch[2].padStart(2, "0")}-${dotMatch[3].padStart(2, "0")}`;
  }

  // 2025-12-18 (이미 정상)
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  // "온라인" 같은 텍스트는 null
  return null;
}

// 불리언 변환
function parseBool(value) {
  if (!value) return false;
  const v = value.trim().toUpperCase();
  return v === "TRUE" || v === "O" || v === "완료" || v === "지로" || v === "계좌등록";
}

// 입국예정일 특수 처리: "온라인" 같은 텍스트값은 notes로
function parseEntryDate(value) {
  const dateVal = parseDate(value);
  if (dateVal) return { date: dateVal, text: null };
  if (value && value.trim() && value.trim() !== "온라인") {
    return { date: null, text: value.trim() };
  }
  return { date: null, text: value?.trim() === "온라인" ? "온라인" : null };
}

// HTML 행 → DB 레코드 변환
function rowToRecord(row, lastAgency, sheetMonth) {
  const customerName = row[2]?.text || "";
  if (!customerName) return null;

  let agency = row[1]?.text || "";
  if (!agency && lastAgency) agency = lastAgency;

  const entryInfo = parseEntryDate(row[5]?.text || "");

  // 서류 필드: 텍스트가 있으면 텍스트, href가 있으면 링크
  const getDocValue = (cell) => {
    if (!cell) return null;
    if (cell.href) return cell.href;
    if (cell.text) return cell.text;
    return null;
  };

  const activationStatus = row[14]?.text || "대기";
  const activationDate =
    parseDate(row[13]?.text || "") || parseDate(row[30]?.text || "");

  // autopayRegistered: "계좌등록" → true, "지로" → true (등록 방식), else false
  const autopayText = row[24]?.text || "";
  const autopayRegistered = autopayText === "계좌등록" || autopayText === "지로";

  // notes에 입국예정일 텍스트 추가 (온라인 등)
  let notes = row[25]?.text || "";
  if (entryInfo.text && entryInfo.text !== "온라인") {
    notes = notes ? `${entryInfo.text}; ${notes}` : entryInfo.text;
  }

  return {
    agency,
    data: {
      customerName,
      usimNumber: row[4]?.text || null,
      entryDate: entryInfo.date,
      subscriptionNumber: row[6]?.text || null,
      newPhoneNumber: row[7]?.text || null,
      virtualAccount: row[8]?.text || null,
      subscriptionType: row[9]?.text || "신규",
      ratePlan: row[10]?.text || null,
      deviceChangeConfirmed: parseBool(row[11]?.text || ""),
      selectedCommitment: parseBool(row[12]?.text || ""),
      activationDate,
      activationStatus,
      personInCharge: row[15]?.text || null,
      applicationDocs: getDocValue(row[16]),
      applicationDocsReview: row[17]?.text || null,
      nameChangeDocs: getDocValue(row[18]),
      nameChangeDocsReview: row[19]?.text || null,
      arcAutopayInfo: getDocValue(row[20]),
      arcAutopayReview: row[21]?.text || null,
      arcSupplement: row[22]?.text || null,
      arcSupplementDeadline: parseDate(row[23]?.text || ""),
      autopayRegistered,
      notes: notes || null,
      commitmentDate: parseDate(row[29]?.text || ""),
      workStatus:
        activationStatus === "개통완료"
          ? "완료"
          : activationStatus === "개통취소"
            ? "개통취소"
            : "개통요청",
      isLocked: activationStatus === "개통완료",
    },
  };
}

async function main() {
  console.log("=== Google Sheets HTML → DB Import ===\n");

  const basePath = path.join(
    process.env.USERPROFILE || "C:\\Users\\woosol",
    "Downloads",
    "키르기스스탄 D2,D4"
  );

  const files = [
    { name: "2025-12.html", month: "2025-12" },
    { name: "2026-02.html", month: "2026-02" },
    { name: "2026-03.html", month: "2026-03" },
  ];

  // 1. 기존 데이터 삭제 (테스트 데이터 정리)
  console.log("1. 기존 데이터 정리...");
  await sql`DELETE FROM activations`;
  console.log("   기존 activations 데이터 삭제 완료\n");

  // 2. 모든 시트 파싱
  const allRecords = [];
  const agencyNames = new Set();

  for (const file of files) {
    const filePath = path.join(basePath, file.name);
    if (!fs.existsSync(filePath)) {
      console.log(`   ${file.name}: 파일 없음, 건너뜀`);
      continue;
    }

    const rows = parseHtml(filePath);
    console.log(`2. ${file.name} 파싱: ${rows.length} 행`);

    let lastAgency = "";
    let count = 0;

    for (let i = 2; i < rows.length; i++) {
      const record = rowToRecord(rows[i], lastAgency, file.month);
      if (!record) continue;
      if (record.agency) lastAgency = record.agency;
      agencyNames.add(record.agency);
      allRecords.push({ ...record, month: file.month });
      count++;
    }
    console.log(`   → ${count}건 추출\n`);
  }

  // 3. 거래처 생성/매핑
  console.log("3. 거래처 매핑...");
  const existingAgencies = await sql`SELECT id, name FROM agencies`;
  const agencyMap = new Map();
  for (const a of existingAgencies) {
    agencyMap.set(a.name.toLowerCase(), a.id);
    agencyMap.set(a.id.toLowerCase(), a.id);
  }

  for (const name of agencyNames) {
    if (!name) continue;
    if (agencyMap.has(name.toLowerCase())) continue;

    // 새 거래처 생성
    const id = name
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_가-힣]/g, "");
    try {
      await sql`INSERT INTO agencies (id, name, is_active) VALUES (${id || `agency_${Date.now()}`}, ${name}, true) ON CONFLICT (id) DO NOTHING`;
      agencyMap.set(name.toLowerCase(), id);
      console.log(`   새 거래처 생성: ${name} → ${id}`);
    } catch (err) {
      console.log(`   거래처 생성 실패: ${name} - ${err.message}`);
    }
  }
  console.log(`   총 ${agencyNames.size}개 거래처 처리\n`);

  // 4. 데이터 삽입
  console.log("4. 데이터 삽입...");
  let inserted = 0;
  let skipped = 0;
  let errors = [];

  for (const record of allRecords) {
    const agencyId =
      agencyMap.get(record.agency.toLowerCase()) || record.agency.toLowerCase().replace(/\s+/g, "_");
    const d = record.data;

    try {
      await sql`
        INSERT INTO activations (
          agency_id, customer_name, usim_number, entry_date,
          subscription_number, new_phone_number, virtual_account,
          subscription_type, rate_plan, device_change_confirmed,
          selected_commitment, activation_date, activation_status,
          person_in_charge, application_docs, application_docs_review,
          name_change_docs, name_change_docs_review, arc_autopay_info,
          arc_autopay_review, arc_supplement, arc_supplement_deadline,
          autopay_registered, notes, commitment_date, work_status, is_locked
        ) VALUES (
          ${agencyId}, ${d.customerName}, ${d.usimNumber}, ${d.entryDate},
          ${d.subscriptionNumber}, ${d.newPhoneNumber}, ${d.virtualAccount},
          ${d.subscriptionType}, ${d.ratePlan}, ${d.deviceChangeConfirmed},
          ${d.selectedCommitment}, ${d.activationDate}, ${d.activationStatus},
          ${d.personInCharge}, ${d.applicationDocs}, ${d.applicationDocsReview},
          ${d.nameChangeDocs}, ${d.nameChangeDocsReview}, ${d.arcAutopayInfo},
          ${d.arcAutopayReview}, ${d.arcSupplement}, ${d.arcSupplementDeadline},
          ${d.autopayRegistered}, ${d.notes}, ${d.commitmentDate},
          ${d.workStatus}, ${d.isLocked}
        )
      `;
      inserted++;
    } catch (err) {
      errors.push(`${d.customerName} (${record.agency}): ${err.message}`);
      skipped++;
    }
  }

  console.log(`\n=== 결과 ===`);
  console.log(`삽입: ${inserted}건`);
  console.log(`스킵: ${skipped}건`);
  if (errors.length > 0) {
    console.log(`에러:`);
    for (const e of errors) console.log(`  - ${e}`);
  }

  // 5. 검증
  const countResult = await sql`SELECT COUNT(*) as total FROM activations`;
  const agencyResult =
    await sql`SELECT a.agency_id, ag.name, COUNT(*) as cnt FROM activations a LEFT JOIN agencies ag ON a.agency_id = ag.id GROUP BY a.agency_id, ag.name ORDER BY cnt DESC`;

  console.log(`\nDB 총 레코드: ${countResult[0].total}건`);
  console.log("거래처별:");
  for (const r of agencyResult) {
    console.log(`  ${r.name || r.agency_id}: ${r.cnt}건`);
  }
}

main().catch(console.error);
