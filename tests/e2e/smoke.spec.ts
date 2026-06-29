import { existsSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { e2eBaseUrl, isE2eServerReachable, serverSkipMessage } from "./server";

const repoRoot = join(__dirname, "../..");
let serverAvailable = false;

test.beforeAll(async () => {
  serverAvailable = await isE2eServerReachable(e2eBaseUrl());
});

test.describe("e2e infrastructure", () => {
  test("playwright e2e config and smoke suite exist", () => {
    expect(existsSync(join(repoRoot, "playwright.config.ts"))).toBe(true);
    expect(existsSync(join(repoRoot, "tests/e2e/smoke.spec.ts"))).toBe(true);
  });

  test("targets port 4000 by default", () => {
    expect(e2eBaseUrl()).toBe("http://localhost:4000");
  });
});

test.describe("public route smoke", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(!serverAvailable, serverSkipMessage);
    testInfo.annotations.push({ type: "server", description: e2eBaseUrl() });
  });

  test("login page renders sign-in shell", async ({ page }) => {
    await page.goto("/login");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /continue with google/i }),
    ).toBeVisible();
  });

  test("calendars redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/calendars");

    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fcalendars/);
  });

  test("invalid book slug shows not-found state", async ({ page }) => {
    await page.goto("/book/invalid-slug");

    await expect(
      page.getByRole("heading", { name: /booking link not found/i }),
    ).toBeVisible();
  });
});
