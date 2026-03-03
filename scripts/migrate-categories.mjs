import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("=== 거래처 카테고리 마이그레이션 시작 ===\n");

  // 1. 모든 거래처를 DOD / DOD_키르기스스탄 으로 배정 (dod_on 제외)
  console.log("1. 모든 거래처 → DOD / DOD_키르기스스탄 배정");
  const updateAll = await sql`
    UPDATE agencies
    SET major_category = 'DOD', medium_category = 'DOD_키르기스스탄'
    WHERE id != 'dod_on' AND id != 'unassigned'
    AND (major_category IS NULL OR medium_category IS NULL)
    RETURNING id, name
  `;
  console.log(`  → ${updateAll.length}개 거래처 업데이트됨:`);
  updateAll.forEach((a) => console.log(`    ${a.id} (${a.name})`));

  // 2. dod_on → DOD / DOD_ON
  console.log("\n2. dod_on → DOD / DOD_ON 배정");
  const updateDodOn = await sql`
    UPDATE agencies
    SET major_category = 'DOD', medium_category = 'DOD_ON'
    WHERE id = 'dod_on'
    RETURNING id, name
  `;
  console.log(`  → ${updateDodOn.length}개 업데이트: ${updateDodOn.map((a) => a.name).join(", ")}`);

  // 3. DOD키르기스스탄 직접 고객용 거래처 생성 (3월 시트 직접고객)
  console.log("\n3. DOD키르기스스탄 직접 거래처 확인/생성");
  const existing = await sql`SELECT id FROM agencies WHERE id = 'dod_kyrgyzstan_direct'`;
  if (existing.length === 0) {
    await sql`
      INSERT INTO agencies (id, name, major_category, medium_category, is_active)
      VALUES ('dod_kyrgyzstan_direct', 'DOD 키르기스스탄 (직접)', 'DOD', 'DOD_키르기스스탄', true)
    `;
    console.log("  → dod_kyrgyzstan_direct 거래처 생성 완료");
  } else {
    console.log("  → dod_kyrgyzstan_direct 이미 존재");
  }

  // 4. dod_on의 기존 15건 개통데이터 → DOD_키르기스스탄 직접 거래처로 이동
  // (MILIUTINA ELIZAVETA, MIRLANBEKOVA SABINA는 아직 DB에 없으므로 전부 이동)
  console.log("\n4. dod_on 개통 데이터 → DOD키르기스스탄 직접 거래처로 이동");
  const moveDodOn = await sql`
    UPDATE activations
    SET agency_id = 'dod_kyrgyzstan_direct'
    WHERE agency_id = 'dod_on'
    RETURNING id, customer_name
  `;
  console.log(`  → ${moveDodOn.length}건 이동:`);
  moveDodOn.forEach((a) => console.log(`    ${a.customer_name}`));

  // 5. unassigned → dod_kyrgyzstan_direct (미배정도 DOD키르기스스탄으로)
  console.log("\n5. unassigned 개통 데이터 → DOD키르기스스탄 직접 거래처로 이동");
  const moveUnassigned = await sql`
    UPDATE activations
    SET agency_id = 'dod_kyrgyzstan_direct'
    WHERE agency_id = 'unassigned'
    RETURNING id, customer_name
  `;
  console.log(`  → ${moveUnassigned.length}건 이동:`);
  moveUnassigned.forEach((a) => console.log(`    ${a.customer_name}`));

  // 6. 최종 확인
  console.log("\n=== 최종 확인 ===");
  const finalAgencies = await sql`
    SELECT id, name, major_category, medium_category FROM agencies
    WHERE is_active = true
    ORDER BY major_category, medium_category, name
  `;
  console.log("\n거래처 목록:");
  finalAgencies.forEach((a) =>
    console.log(`  ${a.id} → ${a.name} | ${a.major_category || "null"} / ${a.medium_category || "null"}`)
  );

  const finalCounts = await sql`
    SELECT a.agency_id, ag.name, ag.medium_category, COUNT(*) as cnt
    FROM activations a
    LEFT JOIN agencies ag ON a.agency_id = ag.id
    GROUP BY a.agency_id, ag.name, ag.medium_category
    ORDER BY cnt DESC
  `;
  console.log("\n개통 데이터 거래처별 건수:");
  finalCounts.forEach((c) =>
    console.log(`  ${c.agency_id} (${c.name}) [${c.medium_category}]: ${c.cnt}건`)
  );

  console.log("\n=== 마이그레이션 완료 ===");
}

main().catch(console.error);
