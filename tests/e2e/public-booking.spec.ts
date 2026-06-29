import { test, expect } from "@playwright/test";
import { e2e } from "./fixtures";
import { e2eBaseUrl, isE2eServerReachable, serverSkipMessage } from "./server";

// ponytail: flat manifest keys + legacy aliases
const e2eSlug =
  (e2e as { e2eCalendarSlug?: string }).e2eCalendarSlug ??
  e2e.calendarSlug ??
  null;
const e2eCalendarName = e2e.calendarName ?? null;
const noSeedMessage =
  "E2E skipped: manifest missing calendar slug. Run `npm run seed:e2e`.";

let serverAvailable = false;

test.beforeAll(async () => {
  serverAvailable = await isE2eServerReachable(e2eBaseUrl());
});

function skipUnlessServer() {
  test.skip(!serverAvailable, serverSkipMessage);
}

function skipUnlessSeed() {
  test.skip(!e2eSlug, noSeedMessage);
}

test.describe("public booking API", () => {
  test.beforeEach(() => {
    skipUnlessServer();
  });

  test("GET /api/book/:slug returns 404 for unknown slug", async ({ request }) => {
    const res = await request.get(`/api/book/${e2e.invalidCalendarSlug}`);
    expect(res.status()).toBe(404);
    await expect(res.json()).resolves.toMatchObject({
      error: "Calendar not found",
    });
  });

  test("GET /api/book/:slug/slots returns 404 for unknown slug", async ({
    request,
  }) => {
    const res = await request.get(
      `/api/book/${e2e.invalidCalendarSlug}/slots?duration=30&from=2026-07-01T00:00:00.000Z&to=2026-07-31T23:59:59.000Z&tz=UTC`,
    );
    expect(res.status()).toBe(404);
  });

  test("GET /api/book/:slug/slots returns 400 when query params missing", async ({
    request,
  }) => {
    skipUnlessSeed();
    const res = await request.get(`/api/book/${e2eSlug}/slots`);
    expect(res.status()).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringMatching(/required/i),
    });
  });

  test("POST /api/book/:slug/confirm returns 404 for unknown slug", async ({
    request,
  }) => {
    const res = await request.post(`/api/book/${e2e.invalidCalendarSlug}/confirm`, {
      data: {
        startsAt: "2026-07-15T14:00:00.000Z",
        durationMinutes: 30,
        subject: "Test",
        body: "",
        invitees: [],
        viewerTimezone: "UTC",
      },
    });
    expect(res.status()).toBe(404);
  });

  test("POST /api/book/:slug/confirm returns 400 for invalid JSON", async ({
    request,
  }) => {
    skipUnlessSeed();
    const res = await request.fetch(`/api/book/${e2eSlug}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    expect(res.status()).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Invalid JSON body",
    });
  });

  test("POST /api/book/:slug/confirm returns 400 for disallowed duration", async ({
    request,
  }) => {
    skipUnlessSeed();
    const res = await request.post(`/api/book/${e2eSlug}/confirm`, {
      data: {
        startsAt: "2026-07-15T14:00:00.000Z",
        durationMinutes: 999,
        subject: "Test",
        body: "",
        invitees: [],
        viewerTimezone: "UTC",
      },
    });
    expect(res.status()).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Duration not allowed for this calendar",
    });
  });
});

test.describe("public booking page", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipUnlessServer();
    testInfo.annotations.push({ type: "server", description: e2eBaseUrl() });
  });

  test("valid slug renders booking wizard shell", async ({ page }) => {
    skipUnlessSeed();
    await page.goto(`/book/${e2eSlug}`);

    if (e2eCalendarName) {
      await expect(
        page.getByRole("heading", { name: e2eCalendarName, level: 1 }),
      ).toBeVisible();
    }
    await expect(page.getByRole("button", { name: /continue/i })).toBeVisible();
    await expect(page.getByText(/pick a time/i)).toBeVisible();
  });

  test("seeded calendar metadata API returns public calendar", async ({
    request,
  }) => {
    skipUnlessSeed();
    const res = await request.get(`/api/book/${e2eSlug}`);
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { calendar?: { slug?: string } };
    expect(body.calendar?.slug).toBe(e2eSlug);
  });

  test("seeded slots API returns slots array", async ({ request }) => {
    skipUnlessSeed();
    const from = new Date().toISOString();
    const to = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request.get(
      `/api/book/${e2eSlug}/slots?duration=30&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&tz=UTC`,
    );
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { slots?: unknown[] };
    expect(Array.isArray(body.slots)).toBe(true);
  });
});
