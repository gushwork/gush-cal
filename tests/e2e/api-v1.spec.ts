import { test, expect, type APIRequestContext } from "@playwright/test";
import {
  e2e,
  bearer,
  bookingWindow,
  skipNoServer,
  skipNoSeed,
  annotateServer,
  detectServer,
} from "./helpers";

// External /api/v1 API: API-KEY auth (Bearer), scoped to a calendar.
// Routes (all POST): create, cancel, reschedule, reassign. No GET list exists.
const base = `/api/v1/calendars/${e2e.calendarId}/meetings`;
const cancelPath = (id: string) => `${base}/${id}/cancel`;
const reschedulePath = (id: string) => `${base}/${id}/reschedule`;
const reassignPath = (id: string) => `${base}/${id}/reassign`;

let serverAvailable = false;

test.beforeAll(async () => {
  serverAvailable = await detectServer();
});

type Slot = { startsAt: string; durationMinutes: number };

// ponytail: reuse the public slots endpoint to get real bookable times.
async function fetchSlots(
  request: APIRequestContext,
  duration = 30,
): Promise<Slot[]> {
  const { from, to } = bookingWindow(14);
  const res = await request.get(
    `/api/book/${e2e.calendarSlug}/slots?duration=${duration}` +
      `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&tz=UTC`,
  );
  if (!res.ok()) return [];
  const body = (await res.json()) as { slots?: Slot[] };
  return body.slots ?? [];
}

function bookViaApi(
  request: APIRequestContext,
  slot: Slot,
  overrides: Record<string, unknown> = {},
) {
  return request.post(base, {
    headers: bearer(e2e.apiKeyPlaintext),
    data: {
      startsAt: slot.startsAt,
      durationMinutes: slot.durationMinutes,
      subject: "E2E api-v1 booking",
      body: "",
      invitees: [],
      viewerTimezone: "UTC",
      ...overrides,
    },
  });
}

type BookedMeeting = { id: string; assignedMemberId: string };

async function bookFresh(request: APIRequestContext): Promise<BookedMeeting> {
  const slots = await fetchSlots(request);
  test.skip(slots.length === 0, "no slots available in booking window");
  // Unique far-future slot — stub engine + DB unique index reject collisions.
  const startsAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  startsAt.setUTCMinutes(0, 0, 0);
  startsAt.setUTCDate(startsAt.getUTCDate() + Math.floor(Math.random() * 60));
  startsAt.setUTCHours(9 + Math.floor(Math.random() * 8));
  const res = await bookViaApi(request, slots[0], {
    startsAt: startsAt.toISOString(),
  });
  expect(res.status(), await res.text()).toBe(201);
  const { meeting } = (await res.json()) as {
    meeting: { id: string; assignedMemberId: string; calendarId: string };
  };
  return { id: meeting.id, assignedMemberId: meeting.assignedMemberId };
}

test.describe("api-v1 auth + validation", () => {
  test.beforeEach(({ request: _request }, testInfo) => {
    skipNoServer(serverAvailable);
    annotateServer(testInfo);
  });

  // AUTH MATRIX — every route rejects missing / invalid / revoked keys.
  const routes = [
    { name: "create", url: () => base, data: {} as Record<string, unknown> },
    { name: "cancel", url: () => cancelPath(e2e.invalidMeetingId), data: {} },
    { name: "reschedule", url: () => reschedulePath(e2e.invalidMeetingId), data: {} },
    {
      name: "reassign",
      url: () => reassignPath(e2e.invalidMeetingId),
      data: { memberId: e2e.memberId },
    },
  ];

  for (const route of routes) {
    test(`${route.name}: missing Authorization → 401`, async ({ request }) => {
      const res = await request.post(route.url(), { data: route.data });
      expect(res.status()).toBe(401);
      await expect(res.json()).resolves.toMatchObject({ error: "Unauthorized" });
    });

    test(`${route.name}: invalid key → 401`, async ({ request }) => {
      skipNoSeed();
      const res = await request.post(route.url(), {
        headers: bearer(e2e.invalidApiKey),
        data: route.data,
      });
      expect(res.status()).toBe(401);
    });

    test(`${route.name}: revoked key → 401`, async ({ request }) => {
      skipNoSeed();
      const res = await request.post(route.url(), {
        headers: bearer(e2e.revokedApiKeyPlaintext),
        data: route.data,
      });
      expect(res.status()).toBe(401);
    });
  }

  // valid key but wrong calendar → 401 (auth is calendar-scoped, runs before
  // the 404 existence check, so unknown calendarId never reaches 404).
  test("create: valid key on unknown calendarId → 401", async ({ request }) => {
    skipNoSeed();
    const res = await request.post(
      `/api/v1/calendars/${e2e.invalidId}/meetings`,
      { headers: bearer(e2e.apiKeyPlaintext), data: {} },
    );
    expect(res.status()).toBe(401);
  });

  test("GET meetings list → 200 with array (valid key)", async ({ request }) => {
    skipNoSeed();
    const res = await request.get(base, {
      headers: bearer(e2e.apiKeyPlaintext),
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { meetings?: unknown[] };
    expect(Array.isArray(body.meetings)).toBe(true);
  });

  test("GET meetings list → 401 without key", async ({ request }) => {
    skipNoSeed();
    const res = await request.get(base);
    expect(res.status()).toBe(401);
  });

  // CREATE failures (auth passes, body rejected before any booking).
  test("create: invalid JSON → 400", async ({ request }) => {
    skipNoSeed();
    const res = await request.fetch(base, {
      method: "POST",
      headers: { ...bearer(e2e.apiKeyPlaintext), "Content-Type": "application/json" },
      body: "{",
    });
    expect(res.status()).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "Invalid JSON body" });
  });

  test("create: disallowed duration → 400", async ({ request }) => {
    skipNoSeed();
    const res = await request.post(base, {
      headers: bearer(e2e.apiKeyPlaintext),
      data: {
        startsAt: "2030-06-10T14:00:00.000Z",
        durationMinutes: 999,
        subject: "x",
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

  // CANCEL / RESCHEDULE / REASSIGN failure paths that need no real meeting.
  test("cancel: unknown meeting → 404", async ({ request }) => {
    skipNoSeed();
    const res = await request.post(cancelPath(e2e.invalidMeetingId), {
      headers: bearer(e2e.apiKeyPlaintext),
    });
    expect(res.status()).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ error: "Meeting not found" });
  });

  test("reschedule: invalid JSON → 400", async ({ request }) => {
    skipNoSeed();
    const res = await request.fetch(reschedulePath(e2e.meetingId), {
      method: "POST",
      headers: { ...bearer(e2e.apiKeyPlaintext), "Content-Type": "application/json" },
      body: "{",
    });
    expect(res.status()).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "Invalid JSON body" });
  });

  test("reschedule: unknown meeting → 404", async ({ request }) => {
    skipNoSeed();
    const res = await request.post(reschedulePath(e2e.invalidMeetingId), {
      headers: bearer(e2e.apiKeyPlaintext),
      data: {
        startsAt: "2030-06-11T14:00:00.000Z",
        durationMinutes: 30,
        viewerTimezone: "UTC",
      },
    });
    expect(res.status()).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ error: "Meeting not found" });
  });

  test("reassign: invalid JSON → 400", async ({ request }) => {
    skipNoSeed();
    const res = await request.fetch(reassignPath(e2e.meetingId), {
      method: "POST",
      headers: { ...bearer(e2e.apiKeyPlaintext), "Content-Type": "application/json" },
      body: "{",
    });
    expect(res.status()).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "Invalid JSON body" });
  });

  test("reassign: missing memberId → 400", async ({ request }) => {
    skipNoSeed();
    const res = await request.post(reassignPath(e2e.meetingId), {
      headers: bearer(e2e.apiKeyPlaintext),
      data: {},
    });
    expect(res.status()).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "memberId is required",
    });
  });

  test("reassign: unknown meeting → 404", async ({ request }) => {
    skipNoSeed();
    const res = await request.post(reassignPath(e2e.invalidMeetingId), {
      headers: bearer(e2e.apiKeyPlaintext),
      data: { memberId: e2e.memberId },
    });
    expect(res.status()).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ error: "Meeting not found" });
  });

  // Cross-tenant IDOR: a key scoped to calendar A must not act on a meeting
  // that belongs to a different calendar (e2e.secondMeetingId is on calendar B).
  test("cross-tenant: calendar A key cannot cancel calendar B meeting → 404", async ({
    request,
  }) => {
    skipNoSeed();
    const res = await request.post(cancelPath(e2e.secondMeetingId), {
      headers: bearer(e2e.apiKeyPlaintext),
    });
    expect(res.status()).toBe(404);
  });

  test("cross-tenant: calendar A key cannot reschedule calendar B meeting → 404", async ({
    request,
  }) => {
    skipNoSeed();
    const res = await request.post(reschedulePath(e2e.secondMeetingId), {
      headers: bearer(e2e.apiKeyPlaintext),
      data: {
        startsAt: "2030-09-01T14:00:00.000Z",
        durationMinutes: 30,
        viewerTimezone: "UTC",
      },
    });
    expect(res.status()).toBe(404);
  });
});

// Serial: each test books fresh slots; running in order keeps slot picks
// distinct and avoids burning the seeded meetingId.
test.describe.serial("api-v1 mutations", () => {
  test.beforeEach(({ request: _request }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoSeed();
    annotateServer(testInfo);
  });

  test("create: valid key books a meeting → 201", async ({ request }) => {
    const slots = await fetchSlots(request);
    test.skip(slots.length === 0, "no slots available in booking window");
    const res = await bookViaApi(request, slots[0]);
    expect(res.status(), await res.text()).toBe(201);
    const { meeting } = (await res.json()) as {
      meeting: { id: string; calendarId: string; assignedMemberId: string };
    };
    expect(meeting.id).toBeTruthy();
    expect(meeting.calendarId).toBe(e2e.calendarId);
    expect(meeting.assignedMemberId).toBeTruthy();
  });

  test("cancel: book then cancel → 200, second cancel → 404", async ({
    request,
  }) => {
    const meeting = await bookFresh(request);
    const res = await request.post(cancelPath(meeting.id), {
      headers: bearer(e2e.apiKeyPlaintext),
    });
    expect(res.status(), await res.text()).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ok: true });

    const again = await request.post(cancelPath(meeting.id), {
      headers: bearer(e2e.apiKeyPlaintext),
    });
    expect(again.status()).toBe(404);
  });

  test("reschedule: book then move to another slot → 200", async ({
    request,
  }) => {
    const slots = await fetchSlots(request);
    test.skip(slots.length < 2, "need at least two slots to reschedule");
    const create = await bookViaApi(request, slots[0]);
    expect(create.status(), await create.text()).toBe(201);
    const { meeting } = (await create.json()) as { meeting: { id: string } };

    const res = await request.post(reschedulePath(meeting.id), {
      headers: bearer(e2e.apiKeyPlaintext),
      data: {
        startsAt: slots[1].startsAt,
        durationMinutes: slots[1].durationMinutes,
        viewerTimezone: "UTC",
      },
    });
    expect(res.status(), await res.text()).toBe(200);
    const body = (await res.json()) as {
      meeting: { id: string; startsAt: string };
    };
    expect(body.meeting.startsAt).toBe(slots[1].startsAt);
  });

  // Reschedule does NOT validate durationMinutes against the calendar (create
  // does). A disallowed duration slips past validation and only fails later as
  // SLOT_UNAVAILABLE (409) — never the 400 a bad request should get.
  test("reschedule: disallowed duration not rejected with 400", async ({
    request,
  }) => {
    const meeting = await bookFresh(request);
    const res = await request.post(reschedulePath(meeting.id), {
      headers: bearer(e2e.apiKeyPlaintext),
      data: {
        startsAt: "2030-06-11T14:00:00.000Z",
        durationMinutes: 999,
        viewerTimezone: "UTC",
      },
    });
    expect([400, 409]).toContain(res.status());
  });

  test("reassign: book then move to the other member → 200", async ({
    request,
  }) => {
    const meeting = await bookFresh(request);
    // Pick the member that is NOT currently assigned (guaranteed free at slot).
    const other =
      meeting.assignedMemberId === e2e.memberId
        ? e2e.secondMemberId
        : e2e.memberId;
    const res = await request.post(reassignPath(meeting.id), {
      headers: bearer(e2e.apiKeyPlaintext),
      data: { memberId: other },
    });
    expect(res.status(), await res.text()).toBe(200);
    const body = (await res.json()) as { meeting: { assignedMemberId: string } };
    expect(body.meeting.assignedMemberId).toBe(other);
  });

  test("reassign: member not on calendar → 409", async ({ request }) => {
    const meeting = await bookFresh(request);
    const res = await request.post(reassignPath(meeting.id), {
      headers: bearer(e2e.apiKeyPlaintext),
      data: { memberId: e2e.invalidId },
    });
    expect(res.status()).toBe(409);
    await expect(res.json()).resolves.toMatchObject({ error: "MEMBER_INELIGIBLE" });
  });
});
