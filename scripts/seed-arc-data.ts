import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function run() {
  const sql = neon(process.env.DATABASE_URL!);

  // 일부 건에 외국인등록증 보완 기한 설정 (30일 이내 + 초과)
  // 기한 초과 (이미 지난 날짜)
  await sql`
    UPDATE activations SET
      arc_supplement_deadline = CURRENT_DATE - INTERVAL '5 days',
      arc_supplement = NULL
    WHERE id IN (SELECT id FROM activations ORDER BY random() LIMIT 3)
  `;

  // 7일 이내 (긴급)
  await sql`
    UPDATE activations SET
      arc_supplement_deadline = CURRENT_DATE + INTERVAL '5 days',
      arc_supplement = NULL
    WHERE id IN (SELECT id FROM activations WHERE arc_supplement_deadline IS NULL ORDER BY random() LIMIT 4)
  `;

  // 14일 이내
  await sql`
    UPDATE activations SET
      arc_supplement_deadline = CURRENT_DATE + INTERVAL '12 days',
      arc_supplement = NULL
    WHERE id IN (SELECT id FROM activations WHERE arc_supplement_deadline IS NULL ORDER BY random() LIMIT 3)
  `;

  // 30일 이내
  await sql`
    UPDATE activations SET
      arc_supplement_deadline = CURRENT_DATE + INTERVAL '25 days',
      arc_supplement = NULL
    WHERE id IN (SELECT id FROM activations WHERE arc_supplement_deadline IS NULL ORDER BY random() LIMIT 4)
  `;

  const result = await sql`
    SELECT
      CASE
        WHEN arc_supplement_deadline < CURRENT_DATE THEN '기한초과'
        WHEN arc_supplement_deadline < CURRENT_DATE + INTERVAL '7 days' THEN '7일이내'
        WHEN arc_supplement_deadline < CURRENT_DATE + INTERVAL '14 days' THEN '14일이내'
        WHEN arc_supplement_deadline < CURRENT_DATE + INTERVAL '30 days' THEN '30일이내'
        ELSE '여유'
      END as urgency,
      count(*)
    FROM activations
    WHERE arc_supplement_deadline IS NOT NULL AND (arc_supplement IS NULL OR arc_supplement = '')
    GROUP BY urgency
    ORDER BY urgency
  `;
  console.log("보완 기한 분포:", result);
}

run().catch(console.error);
