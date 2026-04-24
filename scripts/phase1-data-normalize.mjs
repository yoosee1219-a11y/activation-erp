import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

console.log("=== Phase 1: 데이터 정상화 (dry-run) ===\n");

// 1. 각 테이블의 머지 대상 row 수 확인
console.log("[1] vijob 참조 현황:");
console.log("  activations:", (await sql`SELECT COUNT(*) FROM activations WHERE agency_id = 'vijob'`)[0].count);
console.log("  document_files:", (await sql`SELECT COUNT(*) FROM document_files WHERE agency_id = 'vijob'`)[0].count);
console.log("  usim_logs.agency_id:", (await sql`SELECT COUNT(*) FROM usim_logs WHERE agency_id = 'vijob'`)[0].count);
console.log("  usim_logs.target_agency_id:", (await sql`SELECT COUNT(*) FROM usim_logs WHERE target_agency_id = 'vijob'`)[0].count);

console.log("\n[2] 글로벌비즈 참조 현황:");
console.log("  activations:", (await sql`SELECT COUNT(*) FROM activations WHERE agency_id = '글로벌비즈'`)[0].count);
console.log("  document_files:", (await sql`SELECT COUNT(*) FROM document_files WHERE agency_id = '글로벌비즈'`)[0].count);
console.log("  usim_logs.agency_id:", (await sql`SELECT COUNT(*) FROM usim_logs WHERE agency_id = '글로벌비즈'`)[0].count);
console.log("  usim_logs.target_agency_id:", (await sql`SELECT COUNT(*) FROM usim_logs WHERE target_agency_id = '글로벌비즈'`)[0].count);

console.log("\n[3] user_profiles.allowed_agencies 배열 점검:");
const users = await sql`
  SELECT id, email, allowed_agencies
  FROM user_profiles
  WHERE allowed_agencies && ARRAY['vijob', '글로벌비즈']::text[]
`;
console.table(users);

console.log("\n[4] activation_logs.agency_name 영향 (TEXT 컬럼, FK 아님):");
console.log("  vijob name=\"vijob\" 로그:", (await sql`SELECT COUNT(*) FROM activation_logs WHERE agency_name = 'vijob'`)[0].count);
console.log("  글로벌비즈 name=\"글로벌비즈\" 로그:", (await sql`SELECT COUNT(*) FROM activation_logs WHERE agency_name = '글로벌비즈'`)[0].count);

console.log("\n준비 완료. 실행은 `node scripts/phase1-data-normalize.mjs --apply`");

if (process.argv.includes("--apply")) {
  console.log("\n=== 실제 실행 ===");

  console.log("\n[apply] activations agency_id 재맵핑...");
  const a1 = await sql`UPDATE activations SET agency_id = 'vijob_on' WHERE agency_id = 'vijob' RETURNING id`;
  const a2 = await sql`UPDATE activations SET agency_id = 'globalbiz' WHERE agency_id = '글로벌비즈' RETURNING id`;
  console.log(`  vijob → vijob_on: ${a1.length} | 글로벌비즈 → globalbiz: ${a2.length}`);

  console.log("\n[apply] document_files agency_id 재맵핑...");
  const d1 = await sql`UPDATE document_files SET agency_id = 'vijob_on' WHERE agency_id = 'vijob' RETURNING id`;
  const d2 = await sql`UPDATE document_files SET agency_id = 'globalbiz' WHERE agency_id = '글로벌비즈' RETURNING id`;
  console.log(`  vijob → vijob_on: ${d1.length} | 글로벌비즈 → globalbiz: ${d2.length}`);

  console.log("\n[apply] usim_logs agency_id / target_agency_id 재맵핑...");
  const u1 = await sql`UPDATE usim_logs SET agency_id = 'vijob_on' WHERE agency_id = 'vijob' RETURNING id`;
  const u2 = await sql`UPDATE usim_logs SET agency_id = 'globalbiz' WHERE agency_id = '글로벌비즈' RETURNING id`;
  const u3 = await sql`UPDATE usim_logs SET target_agency_id = 'vijob_on' WHERE target_agency_id = 'vijob' RETURNING id`;
  const u4 = await sql`UPDATE usim_logs SET target_agency_id = 'globalbiz' WHERE target_agency_id = '글로벌비즈' RETURNING id`;
  console.log(`  agency_id: vijob=${u1.length}, 글로벌비즈=${u2.length}`);
  console.log(`  target_agency_id: vijob=${u3.length}, 글로벌비즈=${u4.length}`);

  console.log("\n[apply] activation_logs.agency_name 표기 통일...");
  const al1 = await sql`UPDATE activation_logs SET agency_name = 'VIJOB_ON' WHERE agency_name = 'vijob' RETURNING id`;
  console.log(`  'vijob' → 'VIJOB_ON': ${al1.length}`);

  console.log("\n[apply] usim_logs.agency_name / target_agency_name 표기 통일...");
  const ul1 = await sql`UPDATE usim_logs SET agency_name = 'VIJOB_ON' WHERE agency_name = 'vijob' RETURNING id`;
  const ul2 = await sql`UPDATE usim_logs SET target_agency_name = 'VIJOB_ON' WHERE target_agency_name = 'vijob' RETURNING id`;
  console.log(`  agency_name: ${ul1.length} | target_agency_name: ${ul2.length}`);

  console.log("\n[apply] user_profiles.allowed_agencies 배열 치환...");
  await sql`
    UPDATE user_profiles
    SET allowed_agencies = array_replace(array_replace(allowed_agencies, 'vijob', 'vijob_on'), '글로벌비즈', 'globalbiz')
    WHERE allowed_agencies && ARRAY['vijob', '글로벌비즈']::text[]
  `;
  console.log("  완료");

  console.log("\n[apply] agencies 테이블에서 꼬인 row 삭제...");
  const del1 = await sql`DELETE FROM agencies WHERE id = 'vijob' RETURNING id`;
  const del2 = await sql`DELETE FROM agencies WHERE id = '글로벌비즈' RETURNING id`;
  console.log(`  vijob 삭제: ${del1.length} | 글로벌비즈 삭제: ${del2.length}`);

  console.log("\n=== 최종 상태 ===");
  const final = await sql`SELECT id, name, major_category, medium_category FROM agencies ORDER BY major_category, medium_category`;
  console.table(final);

  console.log("\n=== 무결성 검증 ===");
  const orphans = await sql`
    SELECT 'activations' as src, agency_id, COUNT(*) as cnt
    FROM activations
    WHERE agency_id IS NOT NULL AND agency_id NOT IN (SELECT id FROM agencies)
    GROUP BY agency_id
    UNION ALL
    SELECT 'document_files', agency_id, COUNT(*)
    FROM document_files
    WHERE agency_id IS NOT NULL AND agency_id NOT IN (SELECT id FROM agencies)
    GROUP BY agency_id
  `;
  if (orphans.length === 0) {
    console.log("✓ 고아 참조 없음");
  } else {
    console.log("✗ 고아 참조 발견:");
    console.table(orphans);
  }
}
