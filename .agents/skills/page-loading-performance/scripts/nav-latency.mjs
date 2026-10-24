#!/usr/bin/env node
// Measures click → first feedback → content-ready for in-app navigation with
// injected server latency (simulates cold starts / remote DB round trips).
//
// Usage (app running, e.g. `npm run build && npm start`):
//   BASE_URL=http://localhost:4000 START=/calendars/<id> STORAGE_STATE=auth.json \
//   DELAY=800 node .agents/skills/page-loading-performance/scripts/nav-latency.mjs Members Teams Links
// Args are sidebar link names. PW_CHROMIUM optionally points at a Chromium binary.
import { chromium } from "@playwright/test";

const base = process.env.BASE_URL ?? "http://localhost:4000";
const delay = Number(process.env.DELAY ?? 800);
const links = process.argv.slice(2);
if (!process.env.START || links.length === 0) {
  console.error("Set START=/path and pass sidebar link names as arguments.");
  process.exit(1);
}

const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
);
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  storageState: process.env.STORAGE_STATE,
});
const page = await context.newPage();
await page.goto(base + process.env.START, { waitUntil: "networkidle" });
await page.waitForTimeout(1500); // let link prefetches settle

await page.route("**/*", async (route) => {
  if (!route.request().url().includes("/_next/static/")) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  await route.continue();
});

const pane = "aside + div";
for (const name of links) {
  const before = await page.locator(pane).first().innerHTML();
  const start = Date.now();
  await page.getByRole("link", { name, exact: true }).first().click();
  await page.waitForFunction(
    ([selector, html]) => document.querySelector(selector)?.innerHTML !== html,
    [pane, before],
    { timeout: 15000, polling: 16 },
  );
  const feedback = Date.now() - start;
  await page.waitForFunction(
    () => !document.querySelector('[aria-busy="true"], .animate-skeleton'),
    null,
    { timeout: 15000, polling: 16 },
  );
  const ready = Date.now() - start;
  await page.waitForLoadState("networkidle");
  const apiCalls = await page.evaluate(
    () =>
      performance
        .getEntriesByType("resource")
        .filter((entry) => entry.name.includes("/api/")).length,
  );
  console.log(
    `${name.padEnd(14)} first-feedback=${feedback}ms content-ready=${ready}ms api-calls=${apiCalls}`,
  );
}
await browser.close();
