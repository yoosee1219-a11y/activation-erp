import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/lib/db/schema";

async function fixAdmin() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

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

  const adminId = "zOnaPzallee2mmMlNWSao903TSeuyLSk";

  // 1. temp 계정 생성 → 해시 비밀번호 획득
  const ctx = await auth.api.signUpEmail({
    body: { email: "temp_fix@temp.local", password: "admin123", name: "temp" },
  });

  if (!ctx?.user?.id) {
    console.log("temp 계정 생성 실패");
    return;
  }

  // 2. temp의 account 레코드에서 해시 비밀번호 + id 패턴 가져오기
  const tempAcc = await sql`SELECT id, password FROM account WHERE user_id = ${ctx.user.id} AND provider_id = 'credential'`;
  if (!tempAcc.length) {
    console.log("temp account 없음");
    return;
  }

  const hashedPw = tempAcc[0].password;

  // 3. admin용 account credential 레코드 직접 삽입
  await sql`
    INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
    VALUES (gen_random_uuid(), ${adminId}, 'credential', ${adminId}, ${hashedPw}, now(), now())
  `;
  console.log("✓ admin credential 생성 완료");

  // 4. temp 정리
  await sql`DELETE FROM account WHERE user_id = ${ctx.user.id}`;
  await sql`DELETE FROM session WHERE user_id = ${ctx.user.id}`;
  await sql`DELETE FROM "user" WHERE id = ${ctx.user.id}`;
  console.log("✓ temp 정리");

  // 5. 검증
  const verify = await sql`SELECT provider_id, password FROM account WHERE user_id = ${adminId}`;
  console.log("검증 - provider:", verify[0]?.provider_id, "has pw:", !!verify[0]?.password);

  console.log("");
  console.log("=== 관리자 계정 ===");
  console.log("ID: admin");
  console.log("PW: admin123");
}

fixAdmin().catch(console.error);
