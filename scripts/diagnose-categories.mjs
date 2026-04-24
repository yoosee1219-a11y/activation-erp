import { config } from "dotenv";
config({ path: ".env.local" });

const { neon } = await import("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

console.log("=== agencies 테이블 (거래처) ===");
const agencies = await sql`SELECT id, name, major_category, medium_category, is_active FROM agencies ORDER BY major_category, medium_category, name`;
console.table(agencies);

console.log("\n=== agency_categories (활성만) ===");
const cats = await sql`SELECT id, name, level, parent_id FROM agency_categories WHERE is_active = true ORDER BY level, parent_id, sort_order`;
console.table(cats);

console.log("\n=== agencies ↔ categories 정합성 체크 ===");
const orphan1 = await sql`
  SELECT a.id, a.name, a.major_category
  FROM agencies a
  WHERE a.major_category IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM agency_categories c WHERE c.id = a.major_category)
`;
console.log("고아 major_category (존재 안 함):", orphan1.length, "건");
if (orphan1.length) console.table(orphan1);

const orphan2 = await sql`
  SELECT a.id, a.name, a.medium_category
  FROM agencies a
  WHERE a.medium_category IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM agency_categories c WHERE c.id = a.medium_category)
`;
console.log("고아 medium_category (존재 안 함):", orphan2.length, "건");
if (orphan2.length) console.table(orphan2);

console.log("\n=== 1:N 관계 실제 분포 (중분류당 거래처 수) ===");
const distribution = await sql`
  SELECT medium_category, COUNT(*) as agency_count, STRING_AGG(name, ', ') as agencies
  FROM agencies
  WHERE is_active = true AND medium_category IS NOT NULL
  GROUP BY medium_category
  ORDER BY agency_count DESC
`;
console.table(distribution);

console.log("\n=== activations가 참조하는 agency_id 수 ===");
const activCount = await sql`
  SELECT a.id as agency_id, a.name, COUNT(act.id) as activation_count
  FROM agencies a
  LEFT JOIN activations act ON act.agency_id = a.id
  GROUP BY a.id, a.name
  ORDER BY activation_count DESC
`;
console.table(activCount);

console.log("\n=== agencies 참조 테이블 ===");
const refs = await sql`
  SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'agencies'
`;
console.table(refs);
