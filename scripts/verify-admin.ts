import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  const admin = await sql`SELECT id, email, name FROM "user" WHERE id = 'zOnaPzallee2mmMlNWSao903TSeuyLSk'`;
  console.log("user:", admin[0]);

  const acc = await sql`SELECT provider_id, account_id, password FROM account WHERE user_id = 'zOnaPzallee2mmMlNWSao903TSeuyLSk'`;
  console.log("account provider:", acc[0]?.provider_id);
  console.log("account_id:", acc[0]?.account_id);
  console.log("has password:", !!acc[0]?.password);
  console.log("password length:", acc[0]?.password?.length);
}
main().catch(console.error);
