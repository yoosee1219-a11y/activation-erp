import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

console.log("=== Phase 2.2b: agencies.id를 agency_categories.id와 정렬 ===\n");

const mapping = [
  { from: "dod_on", to: "DOD_ON" },
  { from: "dod_키르기스스탄", to: "DOD_키르기스스탄" },
  { from: "vijob_on", to: "VIJOB_ON" },
  { from: "globalbiz", to: "GLOBALBIZ" },
  { from: "globalbiz_on", to: "GLOBALBIZ_ON" },
];

console.log("[before]");
console.table(await sql`SELECT id, name FROM agencies ORDER BY id`);

for (const m of mapping) {
  const r = await sql`UPDATE agencies SET id = ${m.to} WHERE id = ${m.from} RETURNING id`;
  console.log(`  ${m.from} → ${m.to}: ${r.length ? "✓" : "(없음)"}`);
}

console.log("\n[after]");
console.table(await sql`SELECT id, name FROM agencies ORDER BY id`);

console.log("\n=== 무결성 재검증 ===");
const orphans = await sql`
  SELECT 'activations' as src, act.agency_id, COUNT(*) as cnt
  FROM activations act
  WHERE act.agency_id IS NOT NULL
    AND act.agency_id NOT IN (SELECT id FROM agencies)
  GROUP BY act.agency_id
`;
if (orphans.length === 0) {
  console.log("✓ activations ↔ agencies id 매칭 정상");
} else {
  console.log("✗ 매칭 실패:", orphans);
}
