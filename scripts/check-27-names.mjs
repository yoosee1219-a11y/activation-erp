import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

const NAMES = [
  "MAMANOV KADYRALI",
  "ALMAZBEKOVA MIRAIDA ALMAZBEKOVNA",
  "SIMPSON EMIRAIAN",
  "SAIPILLAEVA SUMAIA ABIMUSLIMOVNA",
  "KUBATBEK KYZY FATIMA",
  "BOLOTOVA GULZADA",
  "PAZYLBEKOVA AIYMKAN",
  "ABDIMITALIP UULU SYIMYK",
  "KOZUBEKOVA NADIRA",
  "TURATOVA KANYKEI",
  "SOORONBAEV AKIMBAI ZHAMGYRCHIEVICH",
  "SAGYNBEKOVA FATIMA",
  "TOIGONBAEV ERNUR",
  "MANAPOV ABDULAZIZ",
  "MEDERBEK UULU BEKTURSUN",
  "KENZHETAEV KUBANBEK KAVLANBEKOVICH",
  "KADYROV ULUK",
  "ABDYBAKIROVA AIDAI KYIASBEKOVNA",
  "AIDARALEV ISA",
  "AMALOV SANZHAR",
  "SATARAALIEV NURKADYR MIRLANOVICH",
  "MIRZABAEV ZHASURBEK",
  "RAKHMANOV MUKHAMMADAZIZ",
  "BALTABAEV FIRDAVS",
  "ADAMBEKOV NURBOL NURLANOVICH",
  "ASLANOVA GULDANA",
  "AZAMAT KYZY NURILA",
];

console.log(`총 ${NAMES.length}명 매칭 시도 (정규화: 공백/대소문자 무시)\n`);

// 정규화: 모든 공백 제거 + 대문자
const normalize = (s) => (s || "").toUpperCase().replace(/\s+/g, "");
const targetSet = new Set(NAMES.map(normalize));

// DOD 12월 개통건 모두 가져와서 매칭
const all = await sql`
  SELECT id, agency_id, customer_name, work_status, activation_date, entry_date,
         name_change_docs_review, arc_review, autopay_review,
         deduction_settled_at, termination_date
  FROM activations
  WHERE agency_id IN (SELECT id FROM agency_categories WHERE parent_id = 'DOD')
    AND (
      activation_date >= '2025-12-01' AND activation_date < '2026-01-01'
      OR entry_date >= '2025-12-01' AND entry_date < '2026-01-01'
    )
`;

console.log(`DOD 12월 개통건 후보: ${all.length} 건`);

const matched = [];
const unmatchedNames = new Set(NAMES);
for (const row of all) {
  const norm = normalize(row.customer_name);
  if (targetSet.has(norm)) {
    matched.push(row);
    // 어떤 이름이 매칭됐는지 추적
    for (const orig of NAMES) {
      if (normalize(orig) === norm) unmatchedNames.delete(orig);
    }
  }
}

console.log(`\n=== 매칭 성공: ${matched.length} / ${NAMES.length} ===`);
console.table(
  matched.map((r) => ({
    customer: r.customer_name,
    work_status: r.work_status,
    name_change: r.name_change_docs_review,
    arc: r.arc_review,
    autopay: r.autopay_review,
    환수일: r.deduction_settled_at ? "✓" : "",
    해지일: r.termination_date ? "✓" : "",
  }))
);

if (unmatchedNames.size > 0) {
  console.log(`\n=== 매칭 실패 (${unmatchedNames.size}명) ===`);
  for (const n of unmatchedNames) console.log(`  - ${n}`);

  // 비슷한 이름 후보 찾기 (12월 + DOD 한정)
  console.log(`\n참고: DOD 12월 개통건 customer_name 전체:`);
  for (const r of all) {
    console.log(`  - ${r.customer_name}`);
  }
}
