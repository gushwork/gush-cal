import { test, expect, type APIRequestContext } from "@playwright/test";
import {
  annotateServer,
  authStatePath,
  detectServer,
  e2e,
  skipNoAuth,
  skipNoServer,
} from "./helpers";

const calendarId = e2e.calendarId;

let serverAvailable = false;

test.beforeAll(async () => {
  serverAvailable = await detectServer();
});

// UNAUTH: middleware 307 -> /login?callbackUrl=<path>. Testable without seed/auth.
test.describe("calendar CRUD auth guards", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    annotateServer(testInfo);
  });

  const guarded = [
    { method: "GET", path: "/api/calendars" },
    { method: "POST", path: "/api/calendars" },
    { method: "GET", path: `/api/calendars/${calendarId}` },
    { method: "PATCH", path: `/api/calendars/${calendarId}` },
    { method: "DELETE", path: `/api/calendars/${calendarId}` },
  ] as const;

  for (const { method, path } of guarded) {
    test(`${method} ${path} redirects to login`, async ({ request }) => {
      const res = await request.fetch(path, { method, maxRedirects: 0 });

      expect(res.status()).toBeGreaterThanOrEqual(300);
      expect(res.status()).toBeLessThan(400);
      expect(res.headers().location).toContain(
        `/login?callbackUrl=${encodeURIComponent(path)}`,
      );
    });
  }

  test("/calendars/new page redirects unauthenticated to login", async ({
    page,
  }) => {
    const path = "/calendars/new";
    await page.goto(path);

    await expect(page).toHaveURL(
      `/login?callbackUrl=${encodeURIComponent(path)}`,
    );
  });
});

function validCreateBody() {
  return {
    name: "E2E CRUD throwaway",
    bookingWindowDays: 14,
    minNoticeHours: 0,
    defaultMaxPerDay: 3,
    defaultMaxPerWeek: 15,
    defaultWorkingHours: [{ day: 1, start: 540, end: 1020 }],
    timezone: "UTC",
    durations: [30, 60],
  };
}

// ponytail: in-test create + delete. Leaks a random-slug throwaway only if an
// assertion fails mid-test; no afterAll because `request` is test-scoped.
async function createThrowaway(
  request: APIRequestContext,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; slug: string; name: string }> {
  const res = await request.post("/api/calendars", {
    data: { ...validCreateBody(), ...overrides },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).calendar;
}

test.describe("calendar CRUD authenticated", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoAuth();
    annotateServer(testInfo);
  });

  test.use({ storageState: authStatePath! });

  test("POST creates a calendar (201)", async ({ request }) => {
    const cal = await createThrowaway(request);
    expect(cal.id).toBeTruthy();
    expect(cal.slug).toBeTruthy();
    expect(cal.name).toBe("E2E CRUD throwaway");
    await request.delete(`/api/calendars/${cal.id}`);
  });

  const badBodies = [
    { label: "bad durations", patch: { durations: [7] } },
    { label: "bad timezone", patch: { timezone: "Not/AZone" } },
    {
      label: "bad working hours",
      patch: { defaultWorkingHours: [{ day: 1, start: 600, end: 500 }] },
    },
    { label: "bad minNotice", patch: { minNoticeHours: 9999 } },
  ];

  for (const { label, patch } of badBodies) {
    test(`POST rejects ${label} (400)`, async ({ request }) => {
      const res = await request.post("/api/calendars", {
        data: { ...validCreateBody(), ...patch },
      });
      expect(res.status()).toBe(400);
      await expect(res.json()).resolves.toHaveProperty("error");
    });
  }

  test("PATCH updates name (200)", async ({ request }) => {
    const cal = await createThrowaway(request);
    const res = await request.patch(`/api/calendars/${cal.id}`, {
      data: { name: "Renamed throwaway" },
    });
    expect(res.status()).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      calendar: { id: cal.id, name: "Renamed throwaway" },
    });
    await request.delete(`/api/calendars/${cal.id}`);
  });

  test("PATCH slug conflict returns 409", async ({ request }) => {
    const cal = await createThrowaway(request);
    const res = await request.patch(`/api/calendars/${cal.id}`, {
      data: { slug: e2e.calendarSlug },
    });
    expect(res.status()).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      error: "Slug already in use",
    });
    await request.delete(`/api/calendars/${cal.id}`);
  });

  test("PATCH slug + randomizeSlug together returns 400", async ({
    request,
  }) => {
    const cal = await createThrowaway(request);
    const res = await request.patch(`/api/calendars/${cal.id}`, {
      data: { slug: "some-valid-slug", randomizeSlug: true },
    });
    expect(res.status()).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Provide slug or randomizeSlug, not both",
    });
    await request.delete(`/api/calendars/${cal.id}`);
  });

  test("PATCH bad slug returns 400", async ({ request }) => {
    const cal = await createThrowaway(request);
    // "Bad Slug" normalizes to "bad slug" -> fails slug pattern (space).
    const res = await request.patch(`/api/calendars/${cal.id}`, {
      data: { slug: "Bad Slug" },
    });
    expect(res.status()).toBe(400);
    await expect(res.json()).resolves.toHaveProperty("error");
    await request.delete(`/api/calendars/${cal.id}`);
  });

  test("GET :id returns the calendar (200)", async ({ request }) => {
    const res = await request.get(`/api/calendars/${calendarId}`);
    expect(res.status()).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      calendar: { id: calendarId },
    });
  });

  test("GET unknown id returns 404", async ({ request }) => {
    const res = await request.get(`/api/calendars/${e2e.invalidId}`);
    expect(res.status()).toBe(404);
  });

  test("DELETE unknown id returns 404", async ({ request }) => {
    const res = await request.delete(`/api/calendars/${e2e.invalidId}`);
    expect(res.status()).toBe(404);
  });

  test("DELETE then GET returns 404", async ({ request }) => {
    const cal = await createThrowaway(request);
    const del = await request.delete(`/api/calendars/${cal.id}`);
    expect(del.status()).toBe(204);
    const res = await request.get(`/api/calendars/${cal.id}`);
    expect(res.status()).toBe(404);
  });
});

test.describe("calendar new page authenticated", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoAuth();
    annotateServer(testInfo);
  });

  test.use({ storageState: authStatePath! });

  // ponytail: render-only. Actual submit creates a real calendar (leaks) and
  // is covered by the POST 201 API test above; add a submit flow when wanted.
  test("renders the create form", async ({ page }) => {
    await page.goto("/calendars/new");

    await expect(
      page.getByRole("heading", { name: /new calendar/i, level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create calendar/i }),
    ).toBeVisible();
  });
});
