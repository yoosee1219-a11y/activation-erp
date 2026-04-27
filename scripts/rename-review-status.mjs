// 검수 상태 라벨 변경: 진행요청 → 보완완료
// 의미: 파트너가 보완 완료 후 관리자 확인 대기 상태
import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

console.log("▶ 진행요청 → 보완완료 일괄 변환 시작");

let total = 0;

const r1 = await sql`
  UPDATE activations SET application_docs_review = '보완완료'
  WHERE application_docs_review = '진행요청'
  RETURNING id
`;
console.log(`  · application_docs_review: ${r1.length}건 변환`);
total += r1.length;

const r2 = await sql`
  UPDATE activations SET name_change_docs_review = '보완완료'
  WHERE name_change_docs_review = '진행요청'
  RETURNING id
`;
console.log(`  · name_change_docs_review: ${r2.length}건 변환`);
total += r2.length;

const r3 = await sql`
  UPDATE activations SET arc_review = '보완완료'
  WHERE arc_review = '진행요청'
  RETURNING id
`;
console.log(`  · arc_review: ${r3.length}건 변환`);
total += r3.length;

const r4 = await sql`
  UPDATE activations SET autopay_review = '보완완료'
  WHERE autopay_review = '진행요청'
  RETURNING id
`;
console.log(`  · autopay_review: ${r4.length}건 변환`);
total += r4.length;

// 하위호환 컬럼 (없을 수 있음)
try {
  const r5 = await sql`
    UPDATE activations SET arc_autopay_review = '보완완료'
    WHERE arc_autopay_review = '진행요청'
    RETURNING id
  `;
  console.log(`  · arc_autopay_review: ${r5.length}건 변환`);
  total += r5.length;
} catch (err) {
  if (String(err.message).includes("does not exist")) {
    console.log(`  · arc_autopay_review: 컬럼 없음 (skip)`);
  } else {
    throw err;
  }
}

console.log(`✓ 완료. 총 ${total}건 변환됨.`);
