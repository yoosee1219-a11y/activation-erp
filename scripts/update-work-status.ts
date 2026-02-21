import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function run() {
  const sql = neon(process.env.DATABASE_URL!);

  await sql`UPDATE activations SET work_status = '대기' WHERE work_status IS NULL`;
  await sql`UPDATE activations SET work_status = '작업중' WHERE id IN (SELECT id FROM activations ORDER BY random() LIMIT 8)`;
  await sql`UPDATE activations SET work_status = '완료' WHERE id IN (SELECT id FROM activations WHERE work_status != '작업중' ORDER BY random() LIMIT 10)`;

  // 담당자도 랜덤 배정
  const staff = ["Admin", "김대리", "박과장", "이사원", "최주임"];
  for (const name of staff) {
    await sql`UPDATE activations SET person_in_charge = ${name} WHERE id IN (SELECT id FROM activations ORDER BY random() LIMIT 6)`;
  }

  const counts = await sql`SELECT work_status, count(*) FROM activations GROUP BY work_status ORDER BY work_status`;
  console.log("Work status 분포:", counts);

  const pic = await sql`SELECT person_in_charge, count(*) FROM activations GROUP BY person_in_charge ORDER BY person_in_charge`;
  console.log("담당자 분포:", pic);
}

run().catch(console.error);
