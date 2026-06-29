import { test, expect } from "@playwright/test";
import { e2e } from "./fixtures";
import { e2eBaseUrl, isE2eServerReachable, serverSkipMessage } from "./server";

let serverAvailable = false;

test.beforeAll(async () => {
  serverAvailable = await isE2eServerReachable(e2eBaseUrl());
});

test.describe("public booking wizard shell", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(!serverAvailable, serverSkipMessage);
    test.skip(!e2e.calendarSlug, "Run `npm run seed:e2e`.");
    testInfo.annotations.push({ type: "server", description: e2eBaseUrl() });
  });

  test("shows duration step and advances to date step", async ({ page }) => {
    await page.goto(`/book/${e2e.calendarSlug}`);

    await expect(page.getByText(/pick a time/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: e2e.calendarName, level: 1 }),
    ).toBeVisible();

    const durationChip = page.getByRole("button", { name: /30 min/i }).first();
    await expect(durationChip).toBeVisible();
    await durationChip.click();

    await expect(page.getByRole("button", { name: /^continue$/i })).toBeEnabled();
    await page.getByRole("button", { name: /^continue$/i }).click();

    await expect(page.getByRole("heading", { name: /^date$/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
