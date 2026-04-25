// 프로덕션 성능 측정 스크립트
// 사용자가 visible Chrome에서 로그인 → 자동으로 dashboard/activations API 응답시간 측정

import { chromium } from "playwright";
import { writeFileSync } from "fs";

const BASE_URL = "https://activation-erp.vercel.app";

(async () => {
  console.log("\n[1/4] Visible Chrome 시작...");
  const browser = await chromium.launch({
    headless: false,
    args: ["--start-maximized"],
  });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  // 모든 API 요청 시간 기록
  const apiTimings = [];
  page.on("response", async (resp) => {
    const url = resp.url();
    if (!url.includes("/api/")) return;
    const req = resp.request();
    const timing = req.timing();
    apiTimings.push({
      url: url.replace(BASE_URL, ""),
      status: resp.status(),
      duration: Math.round(timing.responseEnd - timing.startTime),
      size: parseInt(resp.headers()["content-length"] || "0"),
      cache: resp.headers()["cache-control"] || "(none)",
      ts: new Date().toISOString(),
    });
  });

  console.log("[2/4] /login 페이지 열기...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });

  console.log("\n========================================");
  console.log("👉 Chrome 창에서 admin 계정으로 직접 로그인하세요.");
  console.log("로그인 후 자동으로 측정이 시작됩니다.");
  console.log("(/login → /activations 또는 /로 리다이렉트되면 측정 시작)");
  console.log("========================================\n");

  // 로그인 완료 = URL이 /login이 아닌 다른 페이지로 이동
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 5 * 60 * 1000, // 5분 대기
  });

  console.log(`[3/4] 로그인 감지됨 → ${page.url()}`);
  console.log("       3초 대기 후 측정 시작...\n");
  await page.waitForTimeout(3000);

  // 측정 단계
  const samples = [];

  // Step 1: 대시보드 측정 (cold)
  console.log("📊 Step 1: 대시보드 cold load");
  const dashStart = Date.now();
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle", timeout: 60000 });
  const dashCold = Date.now() - dashStart;
  console.log(`   total: ${dashCold}ms`);
  samples.push({ step: "dashboard_cold", total: dashCold });

  await page.waitForTimeout(2000);

  // Step 2: 대시보드 측정 (warm)
  console.log("📊 Step 2: 대시보드 warm reload");
  const dashWarmStart = Date.now();
  await page.reload({ waitUntil: "networkidle", timeout: 60000 });
  const dashWarm = Date.now() - dashWarmStart;
  console.log(`   total: ${dashWarm}ms`);
  samples.push({ step: "dashboard_warm", total: dashWarm });

  await page.waitForTimeout(2000);

  // Step 3: /activations 측정
  console.log("📊 Step 3: /activations cold");
  const actStart = Date.now();
  await page.goto(`${BASE_URL}/activations`, { waitUntil: "networkidle", timeout: 60000 });
  const actCold = Date.now() - actStart;
  console.log(`   total: ${actCold}ms`);
  samples.push({ step: "activations_cold", total: actCold });

  // 결과 정리
  console.log("\n[4/4] 결과 분석\n");
  console.log("=== 페이지 로드 시간 ===");
  samples.forEach((s) => console.log(`  ${s.step.padEnd(20)} ${s.total}ms`));

  console.log("\n=== API 응답 시간 (느린 순 TOP 15) ===");
  const sorted = [...apiTimings].sort((a, b) => b.duration - a.duration);
  sorted.slice(0, 15).forEach((t) => {
    console.log(
      `  ${String(t.duration).padStart(5)}ms  ${String(t.status)}  ${t.url}  (${t.size}b)`
    );
  });

  console.log("\n=== /api/dashboard 별도 분석 ===");
  const dashApis = apiTimings.filter((t) => t.url.startsWith("/api/dashboard"));
  dashApis.forEach((t) => {
    console.log(`  ${t.duration}ms  ${t.url}  cache: ${t.cache}`);
  });

  console.log("\n=== /api/activations 별도 분석 ===");
  const actApis = apiTimings.filter((t) => t.url.startsWith("/api/activations"));
  actApis.forEach((t) => {
    console.log(`  ${t.duration}ms  ${t.url}  cache: ${t.cache}`);
  });

  // 전체 결과 JSON 저장
  const result = {
    timestamp: new Date().toISOString(),
    pageLoads: samples,
    apiTimings: sorted,
  };
  writeFileSync(
    "scripts/measure-perf-result.json",
    JSON.stringify(result, null, 2)
  );
  console.log("\n💾 전체 결과 저장: scripts/measure-perf-result.json");

  console.log("\n측정 완료. Chrome 창은 30초 후 자동 닫힘 (확인 시간)...");
  await page.waitForTimeout(30000);
  await browser.close();
})();
