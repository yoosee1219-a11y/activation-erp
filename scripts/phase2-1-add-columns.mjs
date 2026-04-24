import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

console.log("=== Phase 2.1: agency_categories 컬럼 추가 ===\n");

// IF NOT EXISTS로 idempotent하게
await sql`ALTER TABLE agency_categories ADD COLUMN IF NOT EXISTS contact_name text`;
await sql`ALTER TABLE agency_categories ADD COLUMN IF NOT EXISTS contact_phone text`;
await sql`ALTER TABLE agency_categories ADD COLUMN IF NOT EXISTS commission_rate integer`;
await sql`ALTER TABLE agency_categories ADD COLUMN IF NOT EXISTS deduction_rate integer`;

console.log("✓ ALTER TABLE 완료");

console.log("\n=== 최종 컬럼 상태 ===");
const cols = await sql`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='agency_categories'
  ORDER BY ordinal_position
`;
console.table(cols);
