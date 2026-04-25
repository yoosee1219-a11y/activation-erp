import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

console.log("=== Step 1: ALTER TABLE — excluded_from_supplement 컬럼 추가 ===");
await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS excluded_from_supplement boolean DEFAULT false`;
console.log("✓ 컬럼 준비 완료");

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

console.log("\n=== Step 2: 27명을 excluded_from_supplement = true 로 업데이트 ===");
// DOD 12월 개통건 한정 (이름 정규화 매칭으로 안전)
let updated = 0;
for (const name of NAMES) {
  const norm = name.toUpperCase().replace(/\s+/g, "");
  const result = await sql`
    UPDATE activations a
    SET excluded_from_supplement = true
    WHERE UPPER(REPLACE(a.customer_name, ' ', '')) = ${norm}
      AND a.agency_id IN (SELECT id FROM agency_categories WHERE parent_id = 'DOD')
      AND (
        (a.activation_date >= '2025-12-01' AND a.activation_date < '2026-01-01')
        OR (a.entry_date >= '2025-12-01' AND a.entry_date < '2026-01-01')
      )
    RETURNING id
  `;
  console.log(`  ${name}: ${result.length} 건 업데이트`);
  updated += result.length;
}
console.log(`\n총 ${updated} 건 처리`);

console.log("\n=== Step 3: 검증 — 미보완 제외된 27명 ===");
const check = await sql`
  SELECT customer_name, work_status, excluded_from_supplement
  FROM activations
  WHERE excluded_from_supplement = true
  ORDER BY customer_name
`;
console.table(check);
