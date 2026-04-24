import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

console.log("=== Phase 2.2: agencies → agency_categories 데이터 이전 ===\n");

// 매핑 미리보기
console.log("[1] 매핑 미리보기 (agencies → target agency_categories)");
const mapping = await sql`
  SELECT a.id as agency_id, a.name as agency_name, a.medium_category as target_category_id,
         a.contact_name, a.contact_phone, a.commission_rate, a.deduction_rate
  FROM agencies a
  ORDER BY a.medium_category
`;
console.table(mapping);

// Null medium_category는 마이그레이션 불가 → 에러
const unmapped = mapping.filter((m) => !m.target_category_id);
if (unmapped.length > 0) {
  console.error("✗ medium_category 없는 agency 존재, 중단:");
  console.table(unmapped);
  process.exit(1);
}

// 모든 target이 agency_categories에 존재하는지 확인
console.log("\n[2] target agency_categories 존재 확인");
for (const m of mapping) {
  const check = await sql`SELECT id FROM agency_categories WHERE id = ${m.target_category_id} AND level='medium'`;
  console.log(`  ${m.agency_id} → ${m.target_category_id}: ${check.length > 0 ? "✓" : "✗ 없음"}`);
}

console.log("\n=== 실행은 --apply ===");

if (!process.argv.includes("--apply")) {
  process.exit(0);
}

console.log("\n=== 실제 마이그레이션 시작 ===");

// [1] FK 제약 드롭 (FK 이름 먼저 찾기)
console.log("\n[step 1] FK 제약 조건 삭제");
const fks = await sql`
  SELECT tc.constraint_name, tc.table_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type='FOREIGN KEY' AND ccu.table_name='agencies'
`;
for (const fk of fks) {
  console.log(`  DROP ${fk.table_name}.${fk.constraint_name}`);
  await sql.query(`ALTER TABLE ${fk.table_name} DROP CONSTRAINT "${fk.constraint_name}"`);
}

// [2] contact/commission 데이터를 medium category로 복사
console.log("\n[step 2] 거래처 속성 복사 (agencies → agency_categories medium)");
for (const m of mapping) {
  await sql`
    UPDATE agency_categories
    SET contact_name = ${m.contact_name},
        contact_phone = ${m.contact_phone},
        commission_rate = ${m.commission_rate},
        deduction_rate = ${m.deduction_rate}
    WHERE id = ${m.target_category_id}
  `;
  console.log(`  ✓ ${m.target_category_id} ← ${m.agency_id}`);
}

// [3] activations.agency_id 치환 (lowercase/한글 id → medium category id)
console.log("\n[step 3] activations.agency_id 치환");
for (const m of mapping) {
  const r = await sql`
    UPDATE activations SET agency_id = ${m.target_category_id}
    WHERE agency_id = ${m.agency_id} RETURNING id
  `;
  console.log(`  ${m.agency_id} → ${m.target_category_id}: ${r.length} 건`);
}

// [4] document_files.agency_id 치환
console.log("\n[step 4] document_files.agency_id 치환");
for (const m of mapping) {
  const r = await sql`
    UPDATE document_files SET agency_id = ${m.target_category_id}
    WHERE agency_id = ${m.agency_id} RETURNING id
  `;
  console.log(`  ${m.agency_id} → ${m.target_category_id}: ${r.length} 건`);
}

// [5] usim_logs.agency_id / target_agency_id 치환 (있으면)
console.log("\n[step 5] usim_logs 치환");
for (const m of mapping) {
  const r1 = await sql`
    UPDATE usim_logs SET agency_id = ${m.target_category_id}
    WHERE agency_id = ${m.agency_id} RETURNING id
  `;
  const r2 = await sql`
    UPDATE usim_logs SET target_agency_id = ${m.target_category_id}
    WHERE target_agency_id = ${m.agency_id} RETURNING id
  `;
  if (r1.length || r2.length) {
    console.log(`  ${m.agency_id} → ${m.target_category_id}: agency_id=${r1.length}, target_agency_id=${r2.length}`);
  }
}

// [6] user_profiles.allowed_agencies 배열 치환
console.log("\n[step 6] user_profiles.allowed_agencies 배열 치환");
for (const m of mapping) {
  await sql`
    UPDATE user_profiles
    SET allowed_agencies = array_replace(allowed_agencies, ${m.agency_id}, ${m.target_category_id})
    WHERE ${m.agency_id} = ANY(allowed_agencies)
  `;
}
console.log("  ✓ 완료");

// [7] FK 재생성 — 이번엔 agency_categories로
console.log("\n[step 7] FK 재생성 (agency_categories 대상)");
await sql`
  ALTER TABLE activations
  ADD CONSTRAINT activations_agency_id_fkey
  FOREIGN KEY (agency_id) REFERENCES agency_categories(id) ON DELETE SET NULL
`;
await sql`
  ALTER TABLE document_files
  ADD CONSTRAINT document_files_agency_id_fkey
  FOREIGN KEY (agency_id) REFERENCES agency_categories(id) ON DELETE SET NULL
`;
console.log("  ✓ activations + document_files FK → agency_categories");

// [8] 무결성 검증
console.log("\n[step 8] 무결성 검증");
const orphan1 = await sql`
  SELECT 'activations' as src, agency_id, COUNT(*) as cnt FROM activations
  WHERE agency_id IS NOT NULL AND agency_id NOT IN (SELECT id FROM agency_categories)
  GROUP BY agency_id
`;
const orphan2 = await sql`
  SELECT 'document_files' as src, agency_id, COUNT(*) as cnt FROM document_files
  WHERE agency_id IS NOT NULL AND agency_id NOT IN (SELECT id FROM agency_categories)
  GROUP BY agency_id
`;
if (orphan1.length === 0 && orphan2.length === 0) {
  console.log("  ✓ 고아 참조 없음");
} else {
  console.log("  ✗ 고아:");
  console.table([...orphan1, ...orphan2]);
}

// [9] 최종 상태
console.log("\n[step 9] 최종 agency_categories (medium만)");
const final = await sql`
  SELECT id, name, parent_id, contact_name, contact_phone, commission_rate, deduction_rate, is_active
  FROM agency_categories WHERE level='medium' ORDER BY parent_id, sort_order
`;
console.table(final);

console.log("\n=== 완료. agencies 테이블은 아직 존재 (Phase 2.4에서 DROP) ===");
