import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/lib/db/schema";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  // 1. 거래처 목록 확인
  const agencies = await sql`SELECT id, name FROM agencies ORDER BY name`;
  console.log("=== 등록된 거래처 ===");
  if (!agencies.length) console.log("(비어있음)");
  agencies.forEach((a) => console.log(a.id, "-", a.name));

  const profiles = await sql`SELECT name, role, allowed_agencies FROM user_profiles`;
  console.log("\n=== user_profiles ===");
  profiles.forEach((p) =>
    console.log(p.name, ":", p.role, "| agencies:", p.allowed_agencies)
  );

  // 2. dream_high 거래처 없으면 생성
  const dreamHigh = await sql`SELECT id FROM agencies WHERE id = 'dream_high'`;
  if (!dreamHigh.length) {
    await sql`INSERT INTO agencies (id, name) VALUES ('dream_high', 'Dream High 유학원')`;
    console.log("\n✓ dream_high 거래처 생성");
  }

  // 3. Better Auth로 dream1 계정 생성
  const auth = betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: { enabled: true, minPasswordLength: 4 },
  });

  const email = "dream1@activation-erp.local";

  // 기존 계정 확인
  const existing = await sql`SELECT id FROM "user" WHERE email = ${email}`;
  if (existing.length) {
    console.log("\n이미 존재:", email, "→ 스킵");
    return;
  }

  const result = await auth.api.signUpEmail({
    body: { email, password: "1234", name: "Dream High" },
  });

  if (!result?.user?.id) {
    console.log("계정 생성 실패");
    return;
  }

  console.log("\n✓ auth 계정 생성:", result.user.id);

  // 4. user_profiles에 PARTNER로 등록
  await sql`
    INSERT INTO user_profiles (id, email, name, role, allowed_agencies, created_at, updated_at)
    VALUES (${result.user.id}, ${email}, 'Dream High', 'PARTNER', ARRAY['dream_high'], now(), now())
  `;
  console.log("✓ user_profiles PARTNER 등록 (dream_high)");

  // 5. 검증
  const verify = await sql`SELECT name, role, allowed_agencies FROM user_profiles WHERE id = ${result.user.id}`;
  console.log("\n=== 검증 ===");
  console.log(verify[0]);

  console.log("\n=== 거래처 계정 ===");
  console.log("ID: dream1");
  console.log("PW: 1234");
  console.log("역할: PARTNER (Dream High 유학원)");
}

main().catch(console.error);
