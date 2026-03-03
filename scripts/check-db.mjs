import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const sql = neon(process.env.DATABASE_URL);

async function main() {
  // 1. 카테고리 목록
  console.log("=== CATEGORIES ===");
  const cats = await sql`SELECT id, name, level, parent_id FROM agency_categories WHERE is_active = true ORDER BY level, parent_id, sort_order`;
  cats.forEach((c) => console.log(`  [${c.level}] ${c.id} → ${c.name} (parent: ${c.parent_id || "none"})`));

  // 2. 거래처 목록
  console.log("\n=== AGENCIES ===");
  const agencies = await sql`SELECT id, name, major_category, medium_category FROM agencies WHERE is_active = true ORDER BY major_category, medium_category, name`;
  agencies.forEach((a) => console.log(`  ${a.id} → ${a.name} | major: ${a.major_category} | medium: ${a.medium_category}`));

  // 3. 개통 데이터 - 거래처별 건수
  console.log("\n=== ACTIVATIONS BY AGENCY ===");
  const actCounts = await sql`SELECT agency_id, COUNT(*) as cnt FROM activations GROUP BY agency_id ORDER BY cnt DESC`;
  actCounts.forEach((a) => console.log(`  ${a.agency_id}: ${a.cnt}건`));

  // 4. 개통 데이터 - 전체 건수
  console.log("\n=== TOTAL ACTIVATIONS ===");
  const total = await sql`SELECT COUNT(*) as cnt FROM activations`;
  console.log(`  Total: ${total[0].cnt}건`);

  // 5. 개통 고객명 확인 (최근 50건)
  console.log("\n=== RECENT ACTIVATIONS (customer_name, agency_id) ===");
  const recent = await sql`SELECT id, customer_name, agency_id, created_at FROM activations ORDER BY created_at DESC LIMIT 60`;
  recent.forEach((r, i) => console.log(`  ${i + 1}. ${r.customer_name} → agency: ${r.agency_id}`));
}

main().catch(console.error);
