// Simplified QA Test - diagnose fetch hanging
const BASE = "http://localhost:3000";
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);

try {
  console.log("Attempting login...");
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@activation-erp.local", password: "admin123" }),
    signal: controller.signal,
  });
  clearTimeout(timeout);
  console.log("Status:", res.status);
  console.log("Headers:", [...res.headers.entries()].map(([k,v]) => `${k}: ${v.substring(0,80)}`).join("\n"));
  const body = await res.text();
  console.log("Body:", body.substring(0, 200));
} catch(e) {
  clearTimeout(timeout);
  console.error("Error:", e.message);
}
