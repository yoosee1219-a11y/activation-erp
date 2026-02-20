import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function createAdmin() {
  const sql = neon(process.env.DATABASE_URL!);

  const userId = "zOnaPzallee2mmMlNWSao903TSeuyLSk";
  const email = "admin@activation-erp.kr";

  await sql`
    INSERT INTO user_profiles (id, email, name, role, allowed_agencies)
    VALUES (${userId}, ${email}, 'Admin', 'ADMIN', ARRAY['ALL'])
    ON CONFLICT (id) DO UPDATE SET role = 'ADMIN', allowed_agencies = ARRAY['ALL']
  `;

  console.log("✓ ADMIN profile created");

  const result = await sql`SELECT * FROM user_profiles WHERE id = ${userId}`;
  console.log(result[0]);
}

createAdmin().catch(console.error);
