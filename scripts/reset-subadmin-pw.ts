import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { hashPassword } from "better-auth/crypto";

async function resetSubAdminPasswords() {
  const sql = neon(process.env.DATABASE_URL!);

  // 1. SUB_ADMIN 사용자 목록 조회
  const subAdmins = await sql`
    SELECT up.id, up.email, up.name
    FROM user_profiles up
    WHERE up.role = 'SUB_ADMIN'
  `;

  if (subAdmins.length === 0) {
    console.log("부관리자(SUB_ADMIN) 계정이 없습니다.");
    return;
  }

  console.log(`부관리자 ${subAdmins.length}명 발견:`);
  subAdmins.forEach((u) => console.log(`  - ${u.name} (${u.email})`));

  // 2. 비밀번호 해시 생성
  const newPassword = "admin123";
  const hashedPw = await hashPassword(newPassword);

  // 3. 각 SUB_ADMIN의 비밀번호 업데이트
  for (const u of subAdmins) {
    await sql`
      UPDATE account
      SET password = ${hashedPw}, updated_at = NOW()
      WHERE user_id = ${u.id} AND provider_id = 'credential'
    `;
    await sql`
      UPDATE user_profiles
      SET plain_password_hint = ${newPassword}, updated_at = NOW()
      WHERE id = ${u.id}
    `;
    console.log(`✓ ${u.name} (${u.email}) 비밀번호 리셋 완료`);
  }

  console.log("");
  console.log("=== 부관리자 비밀번호 리셋 완료 ===");
  console.log(`PW: ${newPassword}`);
}

resetSubAdminPasswords().catch(console.error);
