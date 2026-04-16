// QA Test Script for Plan Verification
// Tests: months API filtering, export API, import API permissions

const BASE = "http://localhost:3000";

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": BASE },
    body: JSON.stringify({ email, password }),
    redirect: "manual",
  });
  const cookies = res.headers.getSetCookie?.() || [];
  const cookieHeader = cookies.map(c => c.split(";")[0]).join("; ");
  const body = await res.json();
  return { token: body.token, cookies: cookieHeader, user: body.user };
}

async function apiGet(path, cookies) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Cookie: cookies },
    redirect: "manual",
  });
  if (res.status === 307 || res.status === 302) {
    return { status: res.status, redirect: res.headers.get("location") };
  }
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, text: text.substring(0, 200) };
  }
}

async function apiPost(path, cookies, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Cookie: cookies, "Content-Type": "application/json", "Origin": BASE },
    body: JSON.stringify(body),
    redirect: "manual",
  });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, text: text.substring(0, 200) };
  }
}

function assert(condition, msg) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${msg}`);
    return false;
  }
  console.log(`  ✅ PASS: ${msg}`);
  return true;
}

async function main() {
  let passed = 0, failed = 0;
  const check = (c, m) => { if (assert(c, m)) passed++; else failed++; };

  // === LOGIN ===
  console.log("\n=== 1. LOGIN TESTS ===");

  const admin = await login("admin@activation-erp.local", "admin123");
  check(!!admin.token, "ADMIN 로그인 성공");

  const partner = await login("dod1@activation-erp.local", "1234");
  check(!!partner.token, "PARTNER 로그인 성공");

  const subadmin = await login("nb950719@activation-erp.local", "qhal123");
  check(!!subadmin.token, "SUB_ADMIN 로그인 성공");

  // === P0: MONTHS API FILTERING ===
  console.log("\n=== 2. MONTHS API (P0 BUG FIX) ===");

  const adminMonths = await apiGet("/api/activations/months", admin.cookies);
  check(adminMonths.status === 200, `ADMIN months API status=200 (got ${adminMonths.status})`);

  const partnerMonths = await apiGet("/api/activations/months", partner.cookies);
  check(partnerMonths.status === 200, `PARTNER months API status=200 (got ${partnerMonths.status})`);

  if (adminMonths.data?.months && partnerMonths.data?.months) {
    const adminTotal = adminMonths.data.months.reduce((s, m) => s + Number(m.total), 0);
    const partnerTotal = partnerMonths.data.months.reduce((s, m) => s + Number(m.total), 0);
    console.log(`  INFO: ADMIN total=${adminTotal}, PARTNER total=${partnerTotal}`);
    check(partnerTotal <= adminTotal, `PARTNER 건수(${partnerTotal}) <= ADMIN 건수(${adminTotal}) — 파트너 필터링 정상`);

    // 파트너 months에 0건인 달이 없어야 함
    const zeroMonths = partnerMonths.data.months.filter(m => Number(m.total) === 0);
    check(zeroMonths.length === 0, `PARTNER에 0건 달 없음 (${zeroMonths.length}개 발견)`);
  }

  // === P2: EXPORT API ===
  console.log("\n=== 3. EXPORT API (P2 엑셀 다운로드) ===");

  const adminExport = await apiGet("/api/export", admin.cookies);
  check(adminExport.status === 200, `ADMIN export status=200 (got ${adminExport.status})`);
  check(adminExport.text?.includes("대분류"), "ADMIN export CSV에 헤더 포함");

  const partnerExport = await apiGet("/api/export", partner.cookies);
  check(partnerExport.status === 200, `PARTNER export status=200 (got ${partnerExport.status})`);
  check(partnerExport.text?.includes("대분류"), "PARTNER export CSV에 헤더 포함");

  const subadminExport = await apiGet("/api/export", subadmin.cookies);
  check(subadminExport.status === 200, `SUB_ADMIN export status=200 (got ${subadminExport.status})`);

  // 파트너 export 데이터 < 관리자 export 데이터
  if (adminExport.text && partnerExport.text) {
    const adminRows = adminExport.text.split("\n").length;
    const partnerRows = partnerExport.text.split("\n").length;
    console.log(`  INFO: ADMIN export rows=${adminRows}, PARTNER export rows=${partnerRows}`);
    check(partnerRows <= adminRows, `PARTNER export 행(${partnerRows}) <= ADMIN(${adminRows})`);
  }

  // 월 필터 테스트
  const adminExportMonth = await apiGet("/api/export?month=2026-03", admin.cookies);
  check(adminExportMonth.status === 200, "ADMIN export with month filter status=200");

  // GUEST는 export 불가
  console.log("\n=== 4. EXPORT GUEST RESTRICTION ===");
  const noAuthExport = await apiGet("/api/export", "");
  check(noAuthExport.status === 401 || noAuthExport.status === 307, `미인증 export 차단 (status=${noAuthExport.status})`);

  // === P2: IMPORT API PARTNER PERMISSION ===
  console.log("\n=== 5. IMPORT API (P2 파트너 업로드) ===");

  // 파트너의 허용 에이전시 확인
  const partnerActivations = await apiGet("/api/activations?page=1&pageSize=1", partner.cookies);
  console.log(`  INFO: Partner activations API status=${partnerActivations.status}`);

  // 파트너 import — 빈 데이터로 테스트 (형식 확인)
  const partnerImport = await apiPost("/api/import", partner.cookies, { rows: [], defaultAgencyId: null });
  console.log(`  INFO: Partner import status=${partnerImport.status}, response:`, JSON.stringify(partnerImport.data || partnerImport.text).substring(0, 100));
  check(partnerImport.status !== 403 || partnerImport.data?.error === "접근 가능한 거래처가 없습니다.",
    `PARTNER import API 접근 가능 (status=${partnerImport.status})`);

  // ADMIN import는 당연히 동작
  const adminImport = await apiPost("/api/import", admin.cookies, { rows: [], defaultAgencyId: null });
  console.log(`  INFO: Admin import status=${adminImport.status}`);

  // === P3: PASSWORD CHANGE API ===
  console.log("\n=== 6. PASSWORD CHANGE API (P3) ===");

  // 잘못된 현재 비밀번호 (PATCH method)
  const wrongPwRes = await fetch(`${BASE}/api/users/change-password`, {
    method: "PATCH",
    headers: { Cookie: subadmin.cookies, "Content-Type": "application/json", "Origin": BASE },
    body: JSON.stringify({ currentPassword: "wrong_password", newPassword: "test1234" }),
    redirect: "manual",
  });
  const wrongPw = { status: wrongPwRes.status, data: await wrongPwRes.json().catch(() => null) };
  console.log(`  INFO: Wrong password response:`, JSON.stringify(wrongPw.data).substring(0, 100));
  check(wrongPw.status === 400 || wrongPw.status === 401, `잘못된 현재 비밀번호 → 에러 (status=${wrongPw.status})`);

  // === SUMMARY ===
  console.log(`\n${"=".repeat(50)}`);
  console.log(`QA 결과: ${passed} PASSED / ${failed} FAILED / ${passed + failed} TOTAL`);
  console.log(`${"=".repeat(50)}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
