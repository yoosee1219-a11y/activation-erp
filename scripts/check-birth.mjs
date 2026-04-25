import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

const cnt = await sql`SELECT COUNT(*) as total, COUNT(customer_birth_date) as filled FROM activations`;
console.log("총", cnt[0].total, "건 중 생년월일 입력된 건:", cnt[0].filled);

const col = await sql`
  SELECT data_type FROM information_schema.columns
  WHERE table_name='activations' AND column_name='customer_birth_date'
`;
console.log("현재 컬럼 타입:", col[0]?.data_type);
