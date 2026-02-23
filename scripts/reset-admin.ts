import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/lib/db/schema";

async function resetAdmin() {
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

  // 1. 잔여 temp 계정 정리
  await sql`DELETE FROM account WHERE user_id = 'ZtLJxje2NOK2AFAGkJJbQ9jOsowEWzp6'`;
  await sql`DELETE FROM session WHERE user_id = 'ZtLJxje2NOK2AFAGkJJbQ9jOsowEWzp6'`;
  await sql`DELETE FROM "user" WHERE id = 'ZtLJxje2NOK2AFAGkJJbQ9jOsowEWzp6'`;
  console.log("✓ temp 계정 정리");

  // 2. 새 temp 계정으로 비밀번호 해시 생성
  const ctx = await auth.api.signUpEmail({
    body: { email: "temp_hash@temp.local", password: "admin123", name: "temp" },
  });

  if (!ctx?.user?.id) {
    console.log("임시 계정 생성 실패");
    return;
  }

  const tempAccount = await sql`SELECT password FROM account WHERE user_id = ${ctx.user.id} AND provider_id = 'credential'`;
  const hashedPw = tempAccount[0].password;

  // 3. admin 비밀번호 업데이트
  await sql`UPDATE account SET password = ${hashedPw} WHERE user_id = ${adminId} AND provider_id = 'credential'`;
  console.log("✓ admin 비밀번호 리셋 완료");

  // 4. temp 정리
  await sql`DELETE FROM account WHERE user_id = ${ctx.user.id}`;
  await sql`DELETE FROM session WHERE user_id = ${ctx.user.id}`;
  await sql`DELETE FROM "user" WHERE id = ${ctx.user.id}`;
  console.log("✓ temp 정리 완료");

  console.log("");
  console.log("=== 관리자 계정 ===");
  console.log("ID: admin");
  console.log("PW: admin123");
}

resetAdmin().catch(console.error);
