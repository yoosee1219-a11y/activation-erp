import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
await sql`ALTER TABLE activations ADD COLUMN IF NOT EXISTS customer_birth_date date`;
console.log("✓ customer_birth_date 컬럼 추가");
