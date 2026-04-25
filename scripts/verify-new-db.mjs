/**
 * 새 Neon DB의 데이터 직접 확인 (read-only)
 *
 * 사용법:
 *   $env:CHECK_DB = "postgresql://..."
 *   node scripts/verify-new-db.mjs
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const url = process.env.CHECK_DB || process.env.NEW_DB;
if (!url) {
  console.error("✗ CHECK_DB 환경변수에 새 connection string을 넣으세요");
  process.exit(1);
}

console.log("DB:", url.replace(/:\/\/[^@]+@/, "://[redacted]@").split("?")[0]);
console.log("");

const sql = neon(url);

const tables = [
  "activations",
  "agency_categories",
  "agencies",
  "user_profiles",
  "user",
  "session",
  "account",
  "notices",
  "activation_logs",
  "activation_status_config",
];

for (const t of tables) {
  try {
    const r = await sql.query(`SELECT COUNT(*)::int as c FROM "${t}"`);
    console.log(`  ${t.padEnd(28)}: ${r[0].c} 행`);
  } catch (e) {
    console.log(`  ${t.padEnd(28)}: ✗ ${e.message}`);
  }
}

console.log("\n=== activations 샘플 (3건) ===");
try {
  const sample = await sql`SELECT id, customer_name, agency_id, work_status FROM activations LIMIT 3`;
  console.table(sample);
} catch (e) {
  console.log(`✗ ${e.message}`);
}
