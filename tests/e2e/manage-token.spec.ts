import { test, expect } from "@playwright/test";
import {
  annotateServer,
  bookingWindow,
  detectServer,
  e2e,
  skipNoSeed,
  skipNoServer,
} from "./helpers";

// Manage routes are PUBLIC (middleware bypass) — no auth/storage state.
// Seed gives ONE valid token; cancel & reschedule each revoke it, so the two
// success paths are CHAINED: reschedule-success returns a fresh token, which
// cancel-success then consumes. fullyParallel is on, so force serial to keep
// non-mutating reads + failures ahead of the mutations and preserve the chain.
test.describe.configure({ mode: "serial" });

let serverAvailable = false;
// ponytail: fresh token from reschedule-success, reused by cancel-success.
let reschedToken: string | null = null;

test.beforeAll(async () => {
  serverAvailable = await detectServer();
});

test.describe("manage-token guest self-service", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoSeed();
    annotateServer(testInfo);
  });

  // --- Non-mutating reads (valid token) -------------------------------------

  test("GET /api/manage/:token returns meeting + calendar for valid token", async ({
    request,
  }) => {
    const res = await request.get(`/api/manage/${e2e.manageTokenPlaintext}`);
    expect(res.status()).toBe(200);
    const body = (await res.json()) as {
      meeting: {
        startsAt: string;
        durationMinutes: number;
        subject: string;
        memberName: string;
        cancelled: boolean;
      };
      calendar: {
        name: string;
        durations: number[];
        bookingWindowDays: number;
        minNoticeHours: number;
      };
    };
    expect(body.meeting.subject).toBe("E2E manage meeting");
    expect(new Date(body.meeting.startsAt).getTime()).toBe(
      new Date("2030-07-15T15:00:00.000Z").getTime(),
    );
    expect(body.meeting.durationMinutes).toBe(30);
    expect(body.meeting.memberName).toBe("E2E Member");
    expect(body.meeting.cancelled).toBe(false);
    expect(body.calendar.name).toBe("E2E Demo Calendar");
    expect(body.calendar.durations).toContain(30);
    expect(body.calendar.bookingWindowDays).toBe(14);
  });

  test("GET /api/manage/:token returns 401 for invalid token", async ({
    request,
  }) => {
    const res = await request.get(`/api/manage/${e2e.invalidToken}`);
    expect(res.status()).toBe(401);
    await expect(res.json()).resolves.toMatchObject({
      error: "Invalid or expired link",
    });
  });

  test("GET /api/manage/:token returns 401 for revoked token", async ({
    request,
  }) => {
    const res = await request.get(`/api/manage/${e2e.revokedManageTokenPlaintext}`);
    expect(res.status()).toBe(401);
    await expect(res.json()).resolves.toMatchObject({
      error: "Invalid or expired link",
    });
  });

  test("GET /api/manage/:token returns 401 for expired token", async ({
    request,
  }) => {
    const res = await request.get(`/api/manage/${e2e.expiredManageTokenPlaintext}`);
    expect(res.status()).toBe(401);
    await expect(res.json()).resolves.toMatchObject({
      error: "Invalid or expired link",
    });
  });

  // 404 (valid token, meeting missing) needs a hard-deleted meeting; not
  // reproducible from shared seed without destroying it. Skipped by design.

  test("GET /api/manage/:token/slots returns slots for valid token", async ({
    request,
  }) => {
    const { from, to } = bookingWindow(14);
    const res = await request.get(
      `/api/manage/${e2e.manageTokenPlaintext}/slots?duration=30&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&tz=UTC`,
    );
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { slots?: unknown[] };
    expect(Array.isArray(body.slots)).toBe(true);
  });

  test("GET /api/manage/:token/slots returns 401 for invalid token", async ({
    request,
  }) => {
    const { from, to } = bookingWindow(14);
    const res = await request.get(
      `/api/manage/${e2e.invalidToken}/slots?duration=30&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&tz=UTC`,
    );
    expect(res.status()).toBe(401);
    await expect(res.json()).resolves.toMatchObject({
      error: "Invalid or expired link",
    });
  });

  test("/manage/:token renders manage UI for valid token", async ({ page }) => {
    await page.goto(`/manage/${e2e.manageTokenPlaintext}`);
    await expect(
      page.getByRole("heading", { name: /manage your meeting/i }),
    ).toBeVisible();
    await expect(page.getByText("E2E manage meeting")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /reschedule/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /cancel meeting/i }),
    ).toBeVisible();
  });

  test("/manage/:token renders error state for invalid token", async ({
    page,
  }) => {
    await page.goto(`/manage/${e2e.invalidToken}`);
    await expect(
      page.getByRole("heading", { name: /link unavailable/i }),
    ).toBeVisible();
    await expect(page.getByText(/invalid or has expired/i)).toBeVisible();
  });

  // --- Reschedule failures (non-mutating: fail before any write) ------------

  test("POST /api/manage/:token/reschedule returns 401 for invalid token", async ({
    request,
  }) => {
    const res = await request.post(`/api/manage/${e2e.invalidToken}/reschedule`, {
      data: {
        startsAt: "2026-07-15T14:00:00.000Z",
        durationMinutes: 30,
        viewerTimezone: "UTC",
      },
    });
    expect(res.status()).toBe(401);
    await expect(res.json()).resolves.toMatchObject({
      error: "Invalid or expired link",
    });
  });

  test("POST /api/manage/:token/reschedule returns 400 for invalid JSON", async ({
    request,
  }) => {
    const res = await request.fetch(
      `/api/manage/${e2e.manageTokenPlaintext}/reschedule`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      },
    );
    expect(res.status()).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Invalid JSON body",
    });
  });

  test("POST /api/manage/:token/reschedule returns 400 for disallowed duration", async ({
    request,
  }) => {
    const res = await request.post(
      `/api/manage/${e2e.manageTokenPlaintext}/reschedule`,
      {
        data: {
          startsAt: "2026-07-15T14:00:00.000Z",
          durationMinutes: 45,
          viewerTimezone: "UTC",
        },
      },
    );
    expect(res.status()).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Duration not allowed for this calendar",
    });
  });

  test("POST /api/manage/:token/reschedule returns 409 for unavailable slot", async ({
    request,
  }) => {
    // Past instant is never an available slot; min notice is 0, meeting is
    // future → assignment fails with SLOT_UNAVAILABLE before any mutation.
    const res = await request.post(
      `/api/manage/${e2e.manageTokenPlaintext}/reschedule`,
      {
        data: {
          startsAt: "2020-01-02T03:00:00.000Z",
          durationMinutes: 30,
          viewerTimezone: "UTC",
        },
      },
    );
    expect(res.status()).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      error: "This time is no longer available",
    });
  });

  // --- Cancel failures ------------------------------------------------------

  test("POST /api/manage/:token/cancel returns 401 for invalid token", async ({
    request,
  }) => {
    const res = await request.post(`/api/manage/${e2e.invalidToken}/cancel`);
    expect(res.status()).toBe(401);
    await expect(res.json()).resolves.toMatchObject({
      error: "Invalid or expired link",
    });
  });

  test("POST /api/manage/:token/cancel returns 401 for revoked token", async ({
    request,
  }) => {
    const res = await request.post(
      `/api/manage/${e2e.revokedManageTokenPlaintext}/cancel`,
    );
    expect(res.status()).toBe(401);
  });

  test("POST /api/manage/:token/cancel returns 401 for expired token", async ({
    request,
  }) => {
    const res = await request.post(
      `/api/manage/${e2e.expiredManageTokenPlaintext}/cancel`,
    );
    expect(res.status()).toBe(401);
  });

  // --- Mutations (chained): reschedule-success → fresh token → cancel -------

  test("POST /api/manage/:token/reschedule moves meeting into an open slot", async ({
    request,
  }) => {
    const { from, to } = bookingWindow(14);
    const slotsRes = await request.get(
      `/api/manage/${e2e.manageTokenPlaintext}/slots?duration=30&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&tz=UTC`,
    );
    expect(slotsRes.status()).toBe(200);
    const { slots } = (await slotsRes.json()) as {
      slots: { startsAt: string }[];
    };
    test.skip(slots.length === 0, "no open slots to reschedule into");

    const futureStartsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    futureStartsAt.setUTCMinutes(0, 0, 0);

    const res = await request.post(
      `/api/manage/${e2e.manageTokenPlaintext}/reschedule`,
      {
        data: {
          startsAt: futureStartsAt.toISOString(),
          durationMinutes: 30,
          viewerTimezone: "UTC",
        },
      },
    );
    expect(res.status()).toBe(200);
    const body = (await res.json()) as {
      meeting: { startsAt: string; durationMinutes: number };
      manageUrl: string;
    };
    expect(new Date(body.meeting.startsAt).getTime()).toBe(
      futureStartsAt.getTime(),
    );
    expect(body.meeting.durationMinutes).toBe(30);
    expect(typeof body.manageUrl).toBe("string");

    reschedToken = body.manageUrl.split("/manage/")[1] ?? null;
    expect(reschedToken).toBeTruthy();
  });

  test("old token is revoked after a successful reschedule", async ({
    request,
  }) => {
    const res = await request.get(`/api/manage/${e2e.manageTokenPlaintext}`);
    expect(res.status()).toBe(401);
  });

  test("POST /api/manage/:token/cancel soft-cancels with the fresh token", async ({
    request,
  }) => {
    test.skip(!reschedToken, "reschedule did not yield a fresh token");
    const res = await request.post(`/api/manage/${reschedToken}/cancel`);
    expect(res.status()).toBe(204);
  });

  test("fresh token is revoked after cancel", async ({ request }) => {
    test.skip(!reschedToken, "reschedule did not yield a fresh token");
    const res = await request.get(`/api/manage/${reschedToken}`);
    expect(res.status()).toBe(401);
  });
});
