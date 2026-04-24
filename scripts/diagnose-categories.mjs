import { config } from "dotenv";
config({ path: ".env.local" });

const { neon } = await import("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

console.log("=== Fix 검증: resurrect 경로 ===");
const { createCategory, CategoryAlreadyActiveError } = await import("../src/lib/db/queries/categories.ts");

// 1. 비활성 '글로벌비즈' → 부활 시도
console.log("\n[1] 비활성 글로벌비즈 → createCategory → 부활되어야 함");
const result1 = await createCategory({
  id: "글로벌비즈",
  name: "글로벌비즈",
  level: "major",
});
console.log("  결과:", result1);
console.log("  isActive:", result1.isActive, "← true 이면 OK");

// 2. 활성 상태에서 또 시도 → CategoryAlreadyActiveError
console.log("\n[2] 활성 글로벌비즈 → createCategory → 409 에러 클래스 던져야 함");
try {
  await createCategory({ id: "글로벌비즈", name: "dup", level: "major" });
  console.log("  ✗ 예외 안 던짐 (버그)");
} catch (e) {
  if (e instanceof CategoryAlreadyActiveError) {
    console.log("  ✓ CategoryAlreadyActiveError 정상 발생");
  } else {
    console.log("  ✗ 다른 에러:", e.message);
  }
}

// 3. 사용자 테스트 위해 다시 soft-delete로 되돌리기
console.log("\n[3] 사용자 재현 상태로 복원 (is_active=false)");
await sql`UPDATE agency_categories SET is_active = false WHERE id = '글로벌비즈'`;
const check = await sql`SELECT id, is_active FROM agency_categories WHERE id = '글로벌비즈'`;
console.log("  현재 상태:", check[0]);
console.log("\n이제 사용자가 prod에서 추가 시도하면 fix 덕분에 부활됨.");
