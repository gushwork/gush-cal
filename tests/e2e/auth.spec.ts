import { test, expect } from "@playwright/test";
import { e2eBaseUrl, isE2eServerReachable, serverSkipMessage } from "./server";

let serverAvailable = false;

test.beforeAll(async () => {
  serverAvailable = await isE2eServerReachable(e2eBaseUrl());
});

test.describe("middleware session gate", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(!serverAvailable, serverSkipMessage);
    testInfo.annotations.push({ type: "server", description: e2eBaseUrl() });
  });

  test("home redirects unauthenticated users through calendars to login", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/login\?callbackUrl=%2F(?:calendars)?/);
  });

  test("deep admin path preserves callbackUrl on redirect", async ({ page }) => {
    await page.goto("/calendars/new");

    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fcalendars%2Fnew/);
  });
});

test.describe("middleware public bypass", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(!serverAvailable, serverSkipMessage);
    testInfo.annotations.push({ type: "server", description: e2eBaseUrl() });
  });

  test("health endpoint responds without session", async ({ request }) => {
    const response = await request.get("/api/health");

    expect(response.status()).toBeLessThan(500);
    expect(response.status()).not.toBe(401);
  });
});

test.describe("login sign-in failure state", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(!serverAvailable, serverSkipMessage);
    testInfo.annotations.push({ type: "server", description: e2eBaseUrl() });
  });

  test("shows domain error banner when error query present", async ({ page }) => {
    await page.goto("/login?error=AccessDenied");

    await expect(page).toHaveURL(/\/login\?error=AccessDenied/);
    await expect(
      page.getByText(/sign-in failed.*organization.*domain/i),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /continue with google/i }),
    ).toBeVisible();
  });
});

test.describe("protected API session gate", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(!serverAvailable, serverSkipMessage);
    testInfo.annotations.push({ type: "server", description: e2eBaseUrl() });
  });

  test("calendars API redirects unauthenticated requests to login", async ({
    request,
  }) => {
    const response = await request.get("/api/calendars", { maxRedirects: 0 });

    expect(response.status()).toBeGreaterThanOrEqual(300);
    expect(response.status()).toBeLessThan(400);
    expect(response.headers().location).toMatch(
      /\/login\?callbackUrl=%2Fapi%2Fcalendars/,
    );
  });
});
