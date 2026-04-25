import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
await sql`ALTER TABLE activations ALTER COLUMN customer_birth_date TYPE text USING customer_birth_date::text`;
console.log("✓ customer_birth_date date → text 변경");
const c = await sql`SELECT data_type FROM information_schema.columns WHERE table_name='activations' AND column_name='customer_birth_date'`;
console.log("현재 타입:", c[0].data_type);
