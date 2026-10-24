#!/usr/bin/env node
// Loads routes in non-UTC browser timezones and reports console errors,
// including React hydration mismatches (#418) and server render failures (#419).
//
// Usage (production build running):
//   BASE_URL=http://localhost:4000 STORAGE_STATE=auth.json \
//   node .agents/skills/page-loading-performance/scripts/hydration-check.mjs /calendars /book/<slug>
// TIMEZONES defaults to "Asia/Kolkata,America/Los_Angeles,UTC".
import { chromium } from "@playwright/test";

const base = process.env.BASE_URL ?? "http://localhost:4000";
const routes = process.argv.slice(2);
const timezones = (process.env.TIMEZONES ?? "Asia/Kolkata,America/Los_Angeles,UTC").split(",");
if (routes.length === 0) {
  console.error("Pass one or more route paths.");
  process.exit(1);
}

const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
);
let failures = 0;
for (const timezoneId of timezones) {
  const context = await browser.newContext({
    timezoneId,
    storageState: process.env.STORAGE_STATE,
  });
  for (const route of routes) {
    const page = await context.newPage();
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !/Failed to load resource/.test(message.text())) {
        errors.push(message.text().split("\n")[0].slice(0, 200));
      }
    });
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message.split("\n")[0].slice(0, 200)}`));
    await page.goto(base + route, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    failures += errors.length;
    console.log(`${errors.length ? "✗" : "✓"} [${timezoneId}] ${route}`);
    for (const error of new Set(errors)) console.log(`    ${error}`);
    await page.close();
  }
  await context.close();
}
await browser.close();
process.exit(failures ? 1 : 0);
