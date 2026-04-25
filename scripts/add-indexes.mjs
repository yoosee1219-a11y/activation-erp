import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

const idx = [
  ["activations_agency_id_idx", "activations(agency_id)"],
  ["activations_work_status_idx", "activations(work_status)"],
  ["activations_entry_date_idx", "activations(entry_date DESC)"],
  ["activations_activation_date_idx", "activations(activation_date DESC)"],
  ["activations_excluded_idx", "activations(excluded_from_supplement)"],
  ["activations_termination_date_idx", "activations(termination_date)"],
  ["activations_deduction_settled_idx", "activations(deduction_settled_at)"],
  ["activations_workstatus_excluded_idx", "activations(work_status, excluded_from_supplement)"],
];

for (const [name, def] of idx) {
  try {
    await sql.query(`CREATE INDEX IF NOT EXISTS ${name} ON ${def}`);
    console.log(`✓ ${name}`);
  } catch (e) {
    console.log(`✗ ${name}: ${e.message}`);
  }
}

const list = await sql`SELECT indexname FROM pg_indexes WHERE tablename='activations' ORDER BY indexname`;
console.log("\n현재 activations 인덱스:");
list.forEach(r => console.log(" ", r.indexname));
