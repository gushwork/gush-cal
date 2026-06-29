import { test, expect, type APIRequestContext } from "@playwright/test";
import {
  annotateServer,
  authStatePath,
  bookingWindow,
  detectServer,
  e2e,
  skipNoAuth,
  skipNoSeed,
  skipNoServer,
} from "./helpers";

const calendarId = e2e.calendarId;

let serverAvailable = false;

test.beforeAll(async () => {
  serverAvailable = await detectServer();
});

function slotsUrl(id: string, duration: number, days: number): string {
  const { from, to } = bookingWindow(days);
  const q = new URLSearchParams({
    duration: String(duration),
    from,
    to,
    tz: "UTC",
  });
  return `/api/calendars/${id}/slots?${q}`;
}

/** Authed: seeded calendar durations + booking window. */
async function fetchCalendar(
  request: APIRequestContext,
): Promise<{ durations: number[]; bookingWindowDays: number }> {
  const res = await request.get(`/api/calendars/${calendarId}`);
  expect(res.status()).toBe(200);
  const { calendar } = (await res.json()) as {
    calendar: { durations: number[]; bookingWindowDays: number };
  };
  return calendar;
}

/** Authed admin-policy slots; null when seed has none in window. */
async function fetchFirstSlot(
  request: APIRequestContext,
  duration: number,
  days: number,
): Promise<{ startsAt: string; durationMinutes: number } | null> {
  const res = await request.get(slotsUrl(calendarId, duration, days));
  expect(res.status()).toBe(200);
  const { slots } = (await res.json()) as {
    slots: Array<{ startsAt: string; durationMinutes: number }>;
  };
  return slots[0] ?? null;
}

// ---- UNAUTH: middleware redirects to /login (307) ----

test.describe("scheduler booking auth guards (unauth)", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    annotateServer(testInfo);
  });

  for (const { method, path } of [
    { method: "GET", path: `/api/calendars/${calendarId}/slots` },
    { method: "POST", path: `/api/calendars/${calendarId}/book` },
  ]) {
    test(`${method} ${path} redirects unauthenticated requests to login`, async ({
      request,
    }) => {
      const response = await request.fetch(path, { method, maxRedirects: 0 });

      expect(response.status()).toBeGreaterThanOrEqual(300);
      expect(response.status()).toBeLessThan(400);
      expect(response.headers().location).toContain(
        `/login?callbackUrl=${encodeURIComponent(path)}`,
      );
    });
  }

  test("book page redirects unauthenticated users to login", async ({
    page,
  }) => {
    const path = `/calendars/${calendarId}/book`;
    await page.goto(path);

    await expect(page).toHaveURL(
      `/login?callbackUrl=${encodeURIComponent(path)}`,
    );
  });
});

// ---- AUTHED: scheduler slots API (admin policy) ----

test.describe("scheduler slots API (authed)", () => {
  test.use({ storageState: authStatePath! });

  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoAuth();
    skipNoSeed();
    annotateServer(testInfo);
  });

  test("GET slots returns an array of slots", async ({ request }) => {
    const { durations, bookingWindowDays } = await fetchCalendar(request);
    const res = await request.get(
      slotsUrl(calendarId, durations[0], bookingWindowDays),
    );
    expect(res.status()).toBe(200);
    const { slots } = (await res.json()) as { slots: unknown[] };
    expect(Array.isArray(slots)).toBe(true);
  });

  // admin window starts at `now`; guest window at `now + minNoticeHours`.
  // Same end + same eligibility => admin slots are a superset of guest slots.
  test("admin slots are a superset of guest slots (skips min-notice)", async ({
    request,
  }) => {
    const { durations, bookingWindowDays } = await fetchCalendar(request);
    const duration = durations[0];
    const { from, to } = bookingWindow(bookingWindowDays);
    const q = `duration=${duration}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&tz=UTC`;

    const [adminRes, guestRes] = await Promise.all([
      request.get(`/api/calendars/${calendarId}/slots?${q}`),
      request.get(`/api/book/${e2e.calendarSlug}/slots?${q}`),
    ]);
    expect(adminRes.status()).toBe(200);
    expect(guestRes.status()).toBe(200);

    const admin = (await adminRes.json()) as { slots: unknown[] };
    const guest = (await guestRes.json()) as { slots: unknown[] };
    expect(admin.slots.length).toBeGreaterThanOrEqual(guest.slots.length);
  });

  test("GET slots returns 400 for missing query params", async ({
    request,
  }) => {
    const res = await request.get(`/api/calendars/${calendarId}/slots`);
    expect(res.status()).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringMatching(/required/i),
    });
  });

  test("GET slots returns 404 for unknown calendar", async ({ request }) => {
    const res = await request.get(slotsUrl(e2e.invalidId, 30, 14));
    expect(res.status()).toBe(404);
    await expect(res.json()).resolves.toMatchObject({
      error: "Calendar not found",
    });
  });
});

// ---- AUTHED: scheduler book API (confirm) ----

test.describe("scheduler book API (authed)", () => {
  test.use({ storageState: authStatePath! });

  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoAuth();
    skipNoSeed();
    annotateServer(testInfo);
  });

  test("POST book creates a meeting (201) then cancels it", async ({
    request,
  }) => {
    const { durations, bookingWindowDays } = await fetchCalendar(request);
    const duration = durations[0];
    const slot = await fetchFirstSlot(request, duration, bookingWindowDays);
    test.skip(!slot, "seed has no available slots in booking window");

    let meetingId: string | undefined;
    try {
      const res = await request.post(`/api/calendars/${calendarId}/book`, {
        data: {
          startsAt: slot!.startsAt,
          durationMinutes: duration,
          subject: "E2E scheduler booking",
          body: "",
          invitees: [],
          viewerTimezone: "UTC",
        },
      });
      expect(res.status()).toBe(201);
      const { meeting } = (await res.json()) as { meeting: { id: string } };
      expect(meeting.id).toBeTruthy();
      meetingId = meeting.id;
    } finally {
      if (meetingId) {
        const del = await request.delete(`/api/meetings/${meetingId}`);
        expect(del.status()).toBe(204);
      }
    }
  });

  test("POST book returns 400 for disallowed duration", async ({ request }) => {
    const res = await request.post(`/api/calendars/${calendarId}/book`, {
      data: {
        startsAt: bookingWindow(1).to,
        durationMinutes: 999,
        subject: "E2E bad duration",
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

  // Pin a member that isn't on the calendar => empty member pool => SLOT_UNAVAILABLE.
  // Deterministic regardless of seed availability/caps or Google stub state.
  test("POST book returns 409 SLOT_UNAVAILABLE when no member can take the slot", async ({
    request,
  }) => {
    const { durations } = await fetchCalendar(request);
    const res = await request.post(`/api/calendars/${calendarId}/book`, {
      data: {
        startsAt: bookingWindow(1).to,
        durationMinutes: durations[0],
        subject: "E2E unavailable",
        body: "",
        invitees: [],
        viewerTimezone: "UTC",
        memberId: e2e.invalidId,
      },
    });
    expect(res.status()).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      error: "SLOT_UNAVAILABLE",
    });
  });

  test("POST book returns 404 for unknown calendar", async ({ request }) => {
    const res = await request.post(`/api/calendars/${e2e.invalidId}/book`, {
      data: {
        startsAt: bookingWindow(1).to,
        durationMinutes: 30,
        subject: "E2E unknown calendar",
        body: "",
        invitees: [],
        viewerTimezone: "UTC",
      },
    });
    expect(res.status()).toBe(404);
    await expect(res.json()).resolves.toMatchObject({
      error: "Calendar not found",
    });
  });
});

// ---- AUTHED: scheduler book page (admin wizard variant) ----

test.describe("scheduler book page (authed)", () => {
  test.use({ storageState: authStatePath! });

  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoAuth();
    skipNoSeed();
    annotateServer(testInfo);
  });

  test("renders the admin booking wizard for a scheduler", async ({ page }) => {
    await page.goto(`/calendars/${calendarId}/book`);

    await expect(
      page.getByRole("heading", { name: /book a meeting/i, level: 1 }),
    ).toBeVisible();
    // Admin-only subtitle — public /book page has no "on behalf of" copy.
    await expect(page.getByText(/on behalf of/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /continue/i }),
    ).toBeVisible();
  });
});
