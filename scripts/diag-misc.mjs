import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

console.log("=== 1. activations 컬럼 (생년월일 있나?) ===");
const cols = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='activations'
  ORDER BY ordinal_position
`;
const names = cols.map(c => c.column_name);
console.log("birth 관련:", names.filter(n => n.includes("birth")).join(", ") || "없음");

console.log("\n=== 2. agency_id 미분류 (NULL or 카테고리에 없음) ===");
const orphan = await sql`
  SELECT id, customer_name, agency_id, activation_date, entry_date
  FROM activations
  WHERE agency_id IS NULL
     OR agency_id NOT IN (SELECT id FROM agency_categories WHERE level='medium')
  ORDER BY COALESCE(activation_date, entry_date) DESC
  LIMIT 10
`;
console.table(orphan);

console.log("\n=== 3. arc_supplement_deadline 사용 빈도 ===");
const deadlineUsage = await sql`
  SELECT COUNT(*) as total,
         COUNT(arc_supplement_deadline) as with_deadline,
         COUNT(*) FILTER (WHERE arc_supplement_deadline IS NOT NULL AND work_status='개통완료') as completed_with_deadline
  FROM activations
`;
console.table(deadlineUsage);
