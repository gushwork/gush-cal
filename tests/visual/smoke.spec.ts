import { existsSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import {
  isVisualServerReachable,
  serverSkipMessage,
  visualBaseUrl,
} from "./server";

const repoRoot = join(__dirname, "../..");
let serverAvailable = false;

test.beforeAll(async () => {
  serverAvailable = await isVisualServerReachable(visualBaseUrl());
});

test.describe("visual QA infrastructure", () => {
  test("playwright visual config and smoke suite exist", () => {
    expect(existsSync(join(repoRoot, "playwright.visual.config.ts"))).toBe(
      true,
    );
    expect(existsSync(join(repoRoot, "scripts/visual-audit.sh"))).toBe(true);
    expect(existsSync(join(repoRoot, "tests/visual/smoke.spec.ts"))).toBe(true);
  });

  test("targets port 4000 by default", () => {
    expect(visualBaseUrl()).toBe("http://localhost:4000");
  });
});

test.describe("public route smoke", () => {
  test.beforeEach(({ page }, testInfo) => {
    test.skip(!serverAvailable, serverSkipMessage);
    testInfo.annotations.push({
      type: "server",
      description: visualBaseUrl(),
    });
  });

  test("login page renders sign-in shell", async ({ page }) => {
    await page.goto("/login");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /continue with google/i }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });

  test("calendars redirects unauthenticated users to login", async ({
    page,
  }) => {
    await page.goto("/calendars");

    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fcalendars/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("invalid book slug shows not-found state", async ({ page }) => {
    await page.goto("/book/invalid-slug");

    await expect(
      page.getByRole("heading", { name: /booking link not found/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /go to sign in/i }),
    ).toBeVisible();
  });
});
