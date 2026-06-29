import { test, expect, type APIRequestContext } from "@playwright/test";
import {
  annotateServer,
  authStatePath,
  bookingWindow,
  detectServer,
  e2e,
  hasAuthFixture,
  skipNoSeed,
  skipNoServer,
} from "./helpers";

let serverAvailable = false;

test.beforeAll(async () => {
  serverAvailable = await detectServer();
});

async function firstBookableSlot(
  request: APIRequestContext,
): Promise<{ startsAt: string; durationMinutes: number } | null> {
  const { from, to } = bookingWindow();
  const res = await request.get(
    `/api/book/${e2e.calendarSlug}/slots?duration=30&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&tz=UTC`,
  );
  expect(res.status()).toBe(200);
  const body = (await res.json()) as {
    slots?: Array<{ startsAt: string; durationMinutes: number }>;
  };
  return body.slots?.[0] ?? null;
}

test.describe("overlap: guest confirm creates meeting", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoSeed();
    annotateServer(testInfo);
  });

  test("POST /api/book/:slug/confirm returns 201 with public meeting", async ({
    request,
  }) => {
    const slot = await firstBookableSlot(request);
    test.skip(!slot, "No stub slots available in booking window");
    const subject = "E2E overlap guest confirm";

    const res = await request.post(`/api/book/${e2e.calendarSlug}/confirm`, {
      data: {
        startsAt: slot!.startsAt,
        durationMinutes: slot!.durationMinutes,
        subject,
        body: "",
        invitees: ["overlap-guest@example.com"],
        viewerTimezone: "UTC",
      },
    });

    expect(res.status()).toBe(201);
    const body = (await res.json()) as {
      meeting?: {
        startsAt?: string;
        durationMinutes?: number;
        subject?: string;
        meetLink?: string;
      };
    };
    expect(body.meeting?.startsAt).toBeDefined();
    expect(new Date(body.meeting!.startsAt!).getTime()).toBe(
      new Date(slot!.startsAt).getTime(),
    );
    expect(body.meeting?.durationMinutes).toBe(slot!.durationMinutes);
    expect(body.meeting?.subject).toBe(subject);
    expect(body.meeting?.meetLink).toMatch(/^https?:\/\//);
  });
});

test.describe("overlap: scheduler cancels guest-booked meeting", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoSeed();
    test.skip(!hasAuthFixture, "needs PLAYWRIGHT_STORAGE_STATE (see E2E_SEED.md)");
    annotateServer(testInfo);
  });

  test.use({ storageState: authStatePath! });

  test("DELETE /api/meetings/:id returns 204 after guest confirm", async ({
    request,
  }) => {
    const slot = await firstBookableSlot(request);
    test.skip(!slot, "No stub slots available in booking window");
    const subject = `E2E overlap admin cancel ${Date.now()}`;

    const confirmRes = await request.post(`/api/book/${e2e.calendarSlug}/confirm`, {
      data: {
        startsAt: slot!.startsAt,
        durationMinutes: slot!.durationMinutes,
        subject,
        body: "",
        invitees: ["overlap-cancel@example.com"],
        viewerTimezone: "UTC",
      },
    });
    expect(confirmRes.status()).toBe(201);

    const listRes = await request.get(
      `/api/calendars/${e2e.calendarId}/meetings?from=${encodeURIComponent(slot!.startsAt)}&to=${encodeURIComponent(new Date(new Date(slot!.startsAt).getTime() + 60_000).toISOString())}`,
    );
    expect(listRes.status()).toBe(200);
    const listed = (await listRes.json()) as {
      meetings?: Array<{ id?: string; subject?: string }>;
    };
    const meeting = listed.meetings?.find((m) => m.subject === subject);
    expect(meeting?.id).toBeTruthy();

    const cancelRes = await request.delete(`/api/meetings/${meeting!.id}`);
    expect(cancelRes.status()).toBe(204);
  });
});

test.describe("overlap: wrong scheduler meeting 404", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    test.skip(!hasAuthFixture, "needs PLAYWRIGHT_STORAGE_STATE (see E2E_SEED.md)");
    annotateServer(testInfo);
  });

  test.use({ storageState: authStatePath! });

  // ponytail: auth 404 at cancel boundary — unauth covered in meetings.spec
  test("DELETE /api/meetings/:id returns 404 for unknown id", async ({
    request,
  }) => {
    const res = await request.delete(`/api/meetings/${e2e.invalidMeetingId}`);

    expect(res.status()).toBe(404);
    await expect(res.json()).resolves.toMatchObject({
      error: "Meeting not found",
    });
  });
});
