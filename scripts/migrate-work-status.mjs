/**
 * Phase 9-0: workStatus 통합 마이그레이션
 *
 * 기존 값 → 새 값:
 *   작업중 → 진행중
 *   완료   → 개통완료
 *
 * 실행: node scripts/migrate-work-status.mjs
 */

import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

async function migrate() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    console.log("=== workStatus 마이그레이션 시작 ===\n");

    // 현재 상태 확인
    const before = await client.query(`
      SELECT work_status, COUNT(*) as cnt
      FROM activations
      GROUP BY work_status
      ORDER BY work_status
    `);
    console.log("변경 전 상태 분포:");
    for (const row of before.rows) {
      console.log(`  ${row.work_status || "(NULL)"}: ${row.cnt}건`);
    }

    // 1. 작업중 → 진행중
    const r1 = await client.query(`
      UPDATE activations SET work_status = '진행중' WHERE work_status = '작업중'
    `);
    console.log(`\n[1] 작업중 → 진행중: ${r1.rowCount}건 변환`);

    // 2. 완료 → 개통완료
    const r2 = await client.query(`
      UPDATE activations SET work_status = '개통완료' WHERE work_status = '완료'
    `);
    console.log(`[2] 완료 → 개통완료: ${r2.rowCount}건 변환`);

    // 변경 후 상태 확인
    const after = await client.query(`
      SELECT work_status, COUNT(*) as cnt
      FROM activations
      GROUP BY work_status
      ORDER BY work_status
    `);
    console.log("\n변경 후 상태 분포:");
    for (const row of after.rows) {
      console.log(`  ${row.work_status || "(NULL)"}: ${row.cnt}건`);
    }

    console.log("\n=== 마이그레이션 완료 ===");
  } catch (err) {
    console.error("마이그레이션 실패:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
