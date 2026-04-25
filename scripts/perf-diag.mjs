import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

console.log("=== 1. 인덱스 현황 (자주 쓰는 컬럼) ===");
const idx = await sql`
  SELECT tablename, indexname, indexdef
  FROM pg_indexes
  WHERE schemaname='public'
    AND tablename IN ('activations', 'agency_categories', 'document_files', 'usim_logs', 'activation_logs')
  ORDER BY tablename, indexname
`;
console.table(idx);

console.log("\n=== 2. 테이블 사이즈 / row 수 ===");
const sizes = await sql`
  SELECT
    relname as table,
    n_live_tup as rows,
    pg_size_pretty(pg_total_relation_size(relid)) as size
  FROM pg_stat_user_tables
  WHERE schemaname='public'
  ORDER BY n_live_tup DESC
`;
console.table(sizes);

console.log("\n=== 3. DB 응답시간 측정 (10회 평균) ===");
const t0 = Date.now();
for (let i = 0; i < 10; i++) {
  await sql`SELECT 1`;
}
console.log(`SELECT 1 평균: ${((Date.now() - t0) / 10).toFixed(1)} ms (한국→Neon ap-southeast-1)`);

console.log("\n=== 4. 자주 쓰는 쿼리 EXPLAIN (개통관리 메인) ===");
const plan = await sql`EXPLAIN ANALYZE SELECT * FROM activations WHERE work_status='개통완료' AND excluded_from_supplement=false ORDER BY entry_date DESC LIMIT 200`;
plan.forEach(r => console.log(" ", Object.values(r)[0]));
