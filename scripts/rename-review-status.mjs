// 검수 상태 라벨 변경: 진행요청 → 보완완료
// 의미: 파트너가 보완 완료 후 관리자 확인 대기 상태
import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const REVIEW_COLUMNS = [
  "application_docs_review",
  "name_change_docs_review",
  "arc_review",
  "autopay_review",
  "arc_autopay_review", // 하위호환 (구 컬럼)
];

console.log("▶ 진행요청 → 보완완료 일괄 변환 시작");

let totalUpdated = 0;
for (const col of REVIEW_COLUMNS) {
  try {
    // 컬럼 존재 확인 후 UPDATE
    const result = await sql(
      `UPDATE activations
         SET ${col} = '보완완료'
       WHERE ${col} = '진행요청'
       RETURNING id`
    );
    const count = result.length;
    totalUpdated += count;
    console.log(`  · ${col}: ${count}건 변환`);
  } catch (err) {
    if (String(err.message).includes("does not exist")) {
      console.log(`  · ${col}: 컬럼 없음 (skip)`);
    } else {
      throw err;
    }
  }
}

console.log(`✓ 완료. 총 ${totalUpdated}건 변환됨.`);
