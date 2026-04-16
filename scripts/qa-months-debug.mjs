const BASE = "http://localhost:3000";

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": BASE },
    body: JSON.stringify({ email, password }),
  });
  const cookies = res.headers.getSetCookie?.() || [];
  return cookies.map(c => c.split(";")[0]).join("; ");
}

const adminCookies = await login("admin@activation-erp.local", "admin123");
const partnerCookies = await login("dod1@activation-erp.local", "1234");

const adminRes = await fetch(`${BASE}/api/activations/months`, { headers: { Cookie: adminCookies } });
const adminData = await adminRes.json();
console.log("ADMIN months response:", JSON.stringify(adminData, null, 2));

const partnerRes = await fetch(`${BASE}/api/activations/months`, { headers: { Cookie: partnerCookies } });
const partnerData = await partnerRes.json();
console.log("\nPARTNER months response:", JSON.stringify(partnerData, null, 2));
