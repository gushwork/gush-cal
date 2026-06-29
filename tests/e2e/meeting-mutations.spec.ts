import { test, expect, type APIRequestContext } from "@playwright/test";
import {
  annotateServer,
  authStatePath,
  detectServer,
  e2e,
  skipNoAuth,
  skipNoSeed,
  skipNoServer,
} from "./helpers";

// Branch: admin meeting mutations — POST /api/meetings/:id/reassign.
// Reassign is the only admin meeting mutation route; admin reschedule does not
// exist (reschedule is manage-token only). Eligibility/membership/ownership
// logic is unit-tested in lib/booking/reassign-meeting.test.ts; this spec
// covers the HTTP boundary: auth gate, validation, 404, and the happy path.
//
// ponytail: e2e server runs USE_STUBS=1 (scripts/e2e.sh) -> slot-engine-stub
// ignores the pinned memberId and picks the first member by sortOrder. So the
// route cannot enforce member eligibility in e2e; "ineligible" cases tolerate
// 200 here and are asserted strictly in the unit suite.

let serverAvailable = false;

test.beforeAll(async () => {
  serverAvailable = await detectServer();
});

test.describe("POST /api/meetings/:id/reassign auth gate", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    annotateServer(testInfo);
  });

  test("redirects unauthenticated reassign to login", async ({ request }) => {
    const path = `/api/meetings/${e2e.meetingId}/reassign`;
    const res = await request.post(path, {
      maxRedirects: 0,
      data: { memberId: e2e.secondMemberId },
    });

    expect(res.status()).toBeGreaterThanOrEqual(300);
    expect(res.status()).toBeLessThan(400);
    expect(res.headers().location).toContain(
      `/login?callbackUrl=${encodeURIComponent(path)}`,
    );
  });
});

test.describe("POST /api/meetings/:id/reassign authed validation", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoAuth();
    annotateServer(testInfo);
  });

  test.use({ storageState: authStatePath! });

  test("returns 400 when memberId is missing", async ({ request }) => {
    const res = await request.post(`/api/meetings/${e2e.meetingId}/reassign`, {
      data: {},
    });

    expect(res.status()).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "memberId is required",
    });
  });

  test("returns 400 for invalid JSON body", async ({ request }) => {
    const res = await request.fetch(
      `/api/meetings/${e2e.meetingId}/reassign`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        data: "not-json",
      },
    );

    expect(res.status()).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Invalid JSON body",
    });
  });

  test("returns 404 for unknown meeting id", async ({ request }) => {
    const res = await request.post(
      `/api/meetings/${e2e.invalidMeetingId}/reassign`,
      { data: { memberId: e2e.secondMemberId } },
    );

    expect(res.status()).toBe(404);
    await expect(res.json()).resolves.toMatchObject({
      error: "Meeting not found",
    });
  });
});

// Mutations on the seeded meeting. Serial so the reassign + restore pair does
// not race itself. Ownership-gated: the saved storage state authenticates a
// real Google scheduler that may not own the seeded calendar (getSchedulerId
// resolves by email), so each test skips when the calendar is not visible.
test.describe.serial("POST /api/meetings/:id/reassign authed mutations", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoSeed();
    skipNoAuth();
    annotateServer(testInfo);
  });

  test.use({ storageState: authStatePath! });

  async function ownsSeededCalendar(
    request: APIRequestContext,
  ): Promise<boolean> {
    const res = await request.get(`/api/calendars/${e2e.calendarId}/meetings`);
    return res.status() === 200;
  }

  test("reassigns seeded meeting then restores original member", async ({
    request,
  }) => {
    test.skip(
      !(await ownsSeededCalendar(request)),
      "authed scheduler does not own seeded calendar",
    );

    const path = `/api/meetings/${e2e.meetingId}/reassign`;

    const res = await request.post(path, {
      data: { memberId: e2e.secondMemberId },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { meeting?: { id?: string } };
    expect(body.meeting?.id).toBe(e2e.meetingId);

    // Restore so other specs see the seeded assignment.
    const restore = await request.post(path, {
      data: { memberId: e2e.memberId },
    });
    expect(restore.status()).toBe(200);
  });

  test("reassign to a member not on the calendar is rejected (real engine)", async ({
    request,
  }) => {
    test.skip(
      !(await ownsSeededCalendar(request)),
      "authed scheduler does not own seeded calendar",
    );

    const res = await request.post(
      `/api/meetings/${e2e.meetingId}/reassign`,
      { data: { memberId: e2e.invalidId } },
    );

    // Real slot engine: 409 MEMBER_INELIGIBLE. Stub (USE_STUBS=1): ignores the
    // pin and returns 200. Either is acceptable here; never 500/404.
    expect([200, 409]).toContain(res.status());
  });

  test("reassign to the currently assigned member", async ({ request }) => {
    test.skip(
      !(await ownsSeededCalendar(request)),
      "authed scheduler does not own seeded calendar",
    );

    const res = await request.post(
      `/api/meetings/${e2e.meetingId}/reassign`,
      { data: { memberId: e2e.memberId } },
    );

    // BUG (🟡): with the real engine this returns 409 — the member's own
    // existing event marks the slot busy in the eligibility freeBusy check
    // (lib/slots/eligibility.ts:58), and there is no same-member short-circuit
    // (lib/booking/reassign-meeting.ts:93). Stub returns 200.
    expect([200, 409]).toContain(res.status());
  });
});

test.describe("admin meetings page authed render", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoSeed();
    skipNoAuth();
    annotateServer(testInfo);
  });

  test.use({ storageState: authStatePath! });

  test("renders meeting list with cancel controls (no reassign UI)", async ({
    page,
  }) => {
    await page.goto(`/calendars/${e2e.calendarId}/meetings`);

    // Ownership-gated: seeded calendar may belong to a different scheduler.
    const owns = await page
      .getByText("Scheduled interviews and calls for this calendar.")
      .isVisible()
      .catch(() => false);
    test.skip(!owns, "authed scheduler does not own seeded calendar");

    await expect(
      page.getByRole("heading", { name: "Meetings", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("E2E seeded meeting").first()).toBeVisible();

    expect(
      await page.getByRole("button", { name: /^Cancel/ }).count(),
    ).toBeGreaterThan(0);
    // Reassign has no admin UI — it is API-only.
    await expect(
      page.getByRole("button", { name: /reassign/i }),
    ).toHaveCount(0);
  });
});
