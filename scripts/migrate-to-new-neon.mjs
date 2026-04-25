/**
 * Neon DB 마이그레이션 (개선판)
 *
 * 사용법:
 *   $env:NEW_DB = "postgresql://..."
 *   node scripts/migrate-to-new-neon.mjs --apply
 *
 * 동작:
 *   1. 새 DB에 drizzle-kit push (스키마 자동 생성, 멱등)
 *   2. 인덱스 8개 추가
 *   3. 모든 테이블 데이터 복사 (FK 순서)
 *   4. 검증 — 신규 DB 에러 시 명시적 fail
 */

import { config } from "dotenv";
import { execSync } from "node:child_process";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const OLD = process.env.OLD_DB || process.env.DATABASE_URL;
const NEW = process.env.NEW_DB;

if (!OLD || !NEW) {
  console.error("✗ OLD_DB(또는 DATABASE_URL) + NEW_DB 환경변수 필요");
  process.exit(1);
}

const redact = (url) => url.replace(/:\/\/[^@]+@/, "://[redacted]@").split("?")[0];
console.log("=== Neon DB 마이그레이션 ===");
console.log("FROM:", redact(OLD));
console.log("TO:  ", redact(NEW));

if (!process.argv.includes("--apply")) {
  console.log("\n--apply 없음. 실행하려면 --apply 추가");
  process.exit(0);
}

// ── Step 1: 스키마 push ──
console.log("\n[1/4] 새 DB에 스키마 생성 (drizzle-kit push)...");
try {
  execSync(`npx drizzle-kit push`, {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: NEW },
  });
  console.log("  ✓ 스키마 적용");
} catch (e) {
  console.error("  ✗ drizzle-kit push 실패:", e.message);
  process.exit(1);
}

// ── Step 2: 인덱스 ──
console.log("\n[2/4] 인덱스 추가...");
const sqlNew = neon(NEW);
const indexes = [
  ["activations_agency_id_idx", "activations(agency_id)"],
  ["activations_work_status_idx", "activations(work_status)"],
  ["activations_entry_date_idx", "activations(entry_date DESC)"],
  ["activations_activation_date_idx", "activations(activation_date DESC)"],
  ["activations_excluded_idx", "activations(excluded_from_supplement)"],
  ["activations_termination_date_idx", "activations(termination_date)"],
  ["activations_deduction_settled_idx", "activations(deduction_settled_at)"],
  ["activations_workstatus_excluded_idx", "activations(work_status, excluded_from_supplement)"],
];
for (const [name, def] of indexes) {
  try {
    await sqlNew.query(`CREATE INDEX IF NOT EXISTS ${name} ON ${def}`);
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}

// ── Step 3: 데이터 복사 ──
const sqlOld = neon(OLD);

const tables = [
  "user",
  "session",
  "account",
  "verification",
  "user_profiles",
  "agency_categories",
  "agencies",
  "notices",
  "activation_status_config",
  "activations",
  "activation_logs",
  "activation_notes",
  "usim_logs",
  "document_files",
];

console.log("\n[3/4] 데이터 복사...");
const copyResults = [];
for (const t of tables) {
  try {
    const rows = await sqlOld.query(`SELECT * FROM "${t}"`);
    if (rows.length === 0) {
      console.log(`  - ${t}: 0행 (skip)`);
      copyResults.push({ table: t, source: 0, copied: 0 });
      continue;
    }
    const cols = Object.keys(rows[0]);
    const colList = cols.map((c) => `"${c}"`).join(", ");

    const batchSize = 50;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const placeholders = batch
        .map(
          (_, ri) =>
            "(" + cols.map((_, ci) => `$${ri * cols.length + ci + 1}`).join(", ") + ")"
        )
        .join(", ");
      const flat = batch.flatMap((row) => cols.map((c) => row[c]));
      await sqlNew.query(
        `INSERT INTO "${t}" (${colList}) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
        flat
      );
      inserted += batch.length;
    }
    console.log(`  ✓ ${t}: ${rows.length}행`);
    copyResults.push({ table: t, source: rows.length, copied: inserted });
  } catch (e) {
    console.log(`  ✗ ${t}: ${e.message}`);
    copyResults.push({ table: t, error: e.message });
  }
}

// ── Step 4: 검증 (개선) ──
console.log("\n[4/4] 검증 — row count 비교 (양쪽 실제 카운트)");
let allMatch = true;
for (const t of tables) {
  let oldCnt = "?";
  let newCnt = "?";
  let oldErr = null;
  let newErr = null;
  try {
    const o = await sqlOld.query(`SELECT COUNT(*)::int as c FROM "${t}"`);
    oldCnt = Number(o[0].c);
  } catch (e) {
    oldErr = e.message;
  }
  try {
    const n = await sqlNew.query(`SELECT COUNT(*)::int as c FROM "${t}"`);
    newCnt = Number(n[0].c);
  } catch (e) {
    newErr = e.message;
  }
  if (oldErr && newErr) {
    console.log(`  - ${t}: 양쪽 모두 없음 (테이블 미정의)`);
    continue;
  }
  if (oldErr || newErr) {
    allMatch = false;
    console.log(`  ✗ ${t}: ${oldErr ? `OLD ERR(${oldErr})` : ""} ${newErr ? `NEW ERR(${newErr})` : ""}`);
    continue;
  }
  const ok = oldCnt === newCnt;
  if (!ok) allMatch = false;
  console.log(`  ${ok ? "✓" : "✗"} ${t}: 기존 ${oldCnt} / 신규 ${newCnt}`);
}

console.log("\n=== 결과 ===");
if (allMatch) {
  console.log("✓ 모든 테이블 검증 통과. 마이그레이션 성공.");
  console.log("\n다음 단계:");
  console.log("  1. Vercel Settings → Environment Variables → DATABASE_URL 새 값으로 변경");
  console.log("  2. Deployments → Redeploy (build cache 비우고)");
  console.log("  3. 사이트 접속 검증 후 .env.local의 DATABASE_URL도 변경");
} else {
  console.log("✗ 일부 테이블 검증 실패. 위 ✗ 항목 점검 필요.");
  process.exit(1);
}
