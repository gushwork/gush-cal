import { defineConfig, devices } from "@playwright/test";

// Env: PORT (default 4000), PLAYWRIGHT_BASE_URL, DATABASE_URL, USE_STUBS=1, SEED_E2E=1
const port = Number(process.env.PORT ?? 4000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["github"], ["list"], ["junit", { outputFile: "test-results/junit.xml" }]]
    : [["list"]],
  timeout: 30_000,
  globalSetup: process.env.SEED_E2E === "0" ? undefined : "./tests/e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
