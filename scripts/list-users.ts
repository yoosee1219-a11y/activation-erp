import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const users = await sql`SELECT id, email, name FROM "user" ORDER BY created_at`;
  console.log("=== user 테이블 ===");
  users.forEach(u => console.log(u.id, u.email, u.name));

  const profiles = await sql`SELECT id, email, name, role FROM user_profiles ORDER BY created_at`;
  console.log("\n=== user_profiles 테이블 ===");
  profiles.forEach(p => console.log(p.id, p.email, p.name, p.role));
}
main().catch(console.error);
