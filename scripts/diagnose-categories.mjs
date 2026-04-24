import { config } from "dotenv";
config({ path: ".env.local" });

const { createCategory } = await import("../src/lib/db/queries/categories.ts");

// 사용자가 입력했을 법한 샘플로 실제 INSERT 시도 (diagnostics 이후 롤백)
const testId = `DIAGTEST_${Date.now()}`;
console.log(`=== createCategory 재현 시도: id=${testId} ===`);
try {
  const result = await createCategory({
    id: testId,
    name: "진단테스트",
    level: "major",
    parentId: undefined,
    sortOrder: undefined,
  });
  console.log("✓ INSERT 성공:", result);

  // 즉시 하드 DELETE로 롤백
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);
  await sql`DELETE FROM agency_categories WHERE id = ${testId}`;
  console.log("✓ 롤백 완료");
} catch (e) {
  console.log("✗ 실패 — 이게 500의 원인:");
  console.log("  message:", e.message);
  console.log("  code:", e.code);
  console.log("  stack:");
  console.log(e.stack);
}
