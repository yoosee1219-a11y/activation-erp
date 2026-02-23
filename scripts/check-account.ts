import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'account' ORDER BY ordinal_position`;
  console.log("account columns:", cols.map(c => c.column_name));
  
  const sample = await sql`SELECT * FROM account LIMIT 1`;
  console.log("sample row keys:", sample.length ? Object.keys(sample[0]) : "empty");
}
main().catch(console.error);
