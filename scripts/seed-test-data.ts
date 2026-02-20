import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function seedTestData() {
  const sql = neon(process.env.DATABASE_URL!);

  const agencies = [
    "dream_high", "creatoria", "sj_intl", "edu_korea", "global_study",
    "k_academy", "seoul_edu", "han_bridge", "asia_connect", "smart_edu"
  ];
  const statuses = ["대기", "개통완료", "개통취소"];
  const plans = ["5G 슬림", "5G 스탠다드", "LTE 베이직", "5G 프리미엄"];
  const names = [
    "이민수", "박지영", "최현우", "김소연", "정다은",
    "Wang Wei", "Li Na", "Tanaka Yuki", "Nguyen Van", "Park Min",
    "Chen Yu", "Sato Ken", "Lee Ji", "Tran Duc", "Kim Hye"
  ];

  console.log("Inserting test activations...");

  for (let i = 0; i < 30; i++) {
    const agency = agencies[i % agencies.length];
    const status = i < 20 ? (i < 12 ? "개통완료" : "대기") : "개통취소";
    const name = names[i % names.length];
    const plan = plans[i % plans.length];
    const month = i < 15 ? "01" : "02";
    const day = String((i % 28) + 1).padStart(2, "0");

    await sql`
      INSERT INTO activations (
        agency_id, customer_name, usim_number, entry_date,
        subscription_type, rate_plan, activation_status, person_in_charge,
        activation_date, autopay_registered, notes
      ) VALUES (
        ${agency}, ${name}, ${"89012345" + String(i).padStart(5, "0")},
        ${"2026-" + month + "-" + day},
        '신규', ${plan}, ${status}, 'Admin',
        ${status === "개통완료" ? "2026-" + month + "-" + day : null},
        ${i % 3 === 0}, ${`테스트 데이터 #${i + 1}`}
      )
    `;
  }

  console.log("✓ 30 test activations inserted");

  const count = await sql`SELECT count(*) FROM activations`;
  console.log(`Total activations: ${count[0].count}`);
}

seedTestData().catch(console.error);
