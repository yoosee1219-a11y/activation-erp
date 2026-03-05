import { neon } from "@neondatabase/serverless";

const sql = neon(
  "postgresql://neondb_owner:npg_hDx4lB8oGFwp@ep-muddy-poetry-a169oxq7-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
);

async function migrate() {
  // 1. 현재 컬럼 확인
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'activations'
    ORDER BY ordinal_position
  `;
  console.log(
    "현재 activations 컬럼:",
    cols.map((c) => c.column_name).join(", ")
  );

  // 2. 새 컬럼 추가
  await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS arc_info text`;
  console.log("✅ arc_info 추가");

  await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS arc_review text`;
  console.log("✅ arc_review 추가");

  await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS autopay_info text`;
  console.log("✅ autopay_info 추가");

  await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS autopay_review text`;
  console.log("✅ autopay_review 추가");

  await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS supplement_status text`;
  console.log("✅ supplement_status 추가");

  // 3. 기존 데이터 마이그레이션
  await sql`
    UPDATE activations
    SET arc_info = arc_autopay_info,
        arc_review = arc_autopay_review
    WHERE arc_info IS NULL AND (arc_autopay_info IS NOT NULL OR arc_autopay_review IS NOT NULL)
  `;
  console.log("✅ 기존 데이터 마이그레이션 완료");

  // 4. activation_notes 테이블 생성
  await sql`
    CREATE TABLE IF NOT EXISTS activation_notes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      activation_id uuid NOT NULL REFERENCES activations(id) ON DELETE CASCADE,
      author_id text NOT NULL,
      author_name text NOT NULL,
      author_role text NOT NULL,
      content text NOT NULL,
      created_at timestamptz DEFAULT now()
    )
  `;
  console.log("✅ activation_notes 테이블 생성");

  // 5. 인덱스 추가
  await sql`CREATE INDEX IF NOT EXISTS idx_activation_notes_activation_id ON activation_notes(activation_id)`;
  console.log("✅ 인덱스 추가");

  // 6. 최종 확인
  const finalCols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'activations'
    ORDER BY ordinal_position
  `;
  console.log(
    "\n최종 activations 컬럼:",
    finalCols.map((c) => c.column_name).join(", ")
  );

  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'activation_notes'
  `;
  console.log("activation_notes 테이블 존재:", tables.length > 0);
}

migrate().catch(console.error);
