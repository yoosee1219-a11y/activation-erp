import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Seeding agencies...");
  await sql`
    INSERT INTO agencies (id, name, contact_name, contact_phone) VALUES
      ('dream_high', 'Dream High', NULL, NULL),
      ('creatoria', 'Creatoria', NULL, NULL),
      ('sj_intl', 'SJ International', NULL, NULL),
      ('edu_korea', 'Edu Korea', NULL, NULL),
      ('global_study', 'Global Study', NULL, NULL),
      ('k_academy', 'K Academy', NULL, NULL),
      ('seoul_edu', 'Seoul Education', NULL, NULL),
      ('han_bridge', 'Han Bridge', NULL, NULL),
      ('asia_connect', 'Asia Connect', NULL, NULL),
      ('smart_edu', 'Smart Education', NULL, NULL),
      ('best_korea', 'Best Korea', NULL, NULL),
      ('new_wave', 'New Wave', NULL, NULL),
      ('top_class', 'Top Class', NULL, NULL),
      ('future_edu', 'Future Education', NULL, NULL),
      ('bright_path', 'Bright Path', NULL, NULL)
    ON CONFLICT (id) DO NOTHING
  `;
  console.log("✓ 15 agencies inserted");

  console.log("Seeding activation status config...");
  await sql`
    INSERT INTO activation_status_config (status_key, status_label, color, sort_order) VALUES
      ('pending', '대기', '#f59e0b', 1),
      ('completed', '개통완료', '#10b981', 2),
      ('cancelled', '개통취소', '#ef4444', 3)
    ON CONFLICT (status_key) DO NOTHING
  `;
  console.log("✓ 3 status configs inserted");

  // 테이블 확인
  const agencyCount = await sql`SELECT count(*) FROM agencies`;
  const statusCount = await sql`SELECT count(*) FROM activation_status_config`;
  console.log(`\nVerification:`);
  console.log(`  agencies: ${agencyCount[0].count} rows`);
  console.log(`  activation_status_config: ${statusCount[0].count} rows`);

  console.log("\nSeed complete!");
}

seed().catch(console.error);
