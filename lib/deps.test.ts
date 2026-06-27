import { beforeEach, describe, expect, it } from "vitest";
import { createAppDeps, resetAppDepsForTests } from "@/lib/deps";
import { createGoogleCalendarStub } from "@/lib/stubs/google-calendar-stub";
import { createSlotEngineStub } from "@/lib/stubs/slot-engine-stub";
import { defaultSchedulingSettingsStub } from "@/lib/stubs/scheduling-settings-stub";

describe("createAppDeps", () => {
  beforeEach(() => {
    resetAppDepsForTests();
    process.env.USE_STUBS = "1";
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  });

  it("returns stub google and slot ports when USE_STUBS=1", () => {
    const deps = createAppDeps();
    expect(deps.google).toBeDefined();
    expect(deps.slots).toBeDefined();
    expect(deps.db).toBeDefined();
  });

  it("google stub returns free busy for all members", async () => {
    const google = createGoogleCalendarStub();
    const result = await google.queryFreeBusy({
      memberEmails: ["a@acme.com", "b@acme.com"],
      timeMin: "2026-06-01T09:00:00.000Z",
      timeMax: "2026-06-01T17:00:00.000Z",
    });

    expect(result.byEmail["a@acme.com"]).toEqual({ status: "ok", busy: [] });
    expect(result.byEmail["b@acme.com"]).toEqual({ status: "ok", busy: [] });
  });

  it("falls back to google stub when GOOGLE_SERVICE_ACCOUNT_JSON is invalid", async () => {
    delete process.env.USE_STUBS;
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      client_email: "sa@test.iam.gserviceaccount.com",
      private_key: "not-a-valid-pem-key",
    });

    const deps = createAppDeps();
    const result = await deps.google.queryFreeBusy({
      memberEmails: ["a@acme.com"],
      timeMin: "2026-06-01T09:00:00.000Z",
      timeMax: "2026-06-01T17:00:00.000Z",
    });

    expect(result.byEmail["a@acme.com"]).toEqual({ status: "ok", busy: [] });
  });

  it("slot stub assigns first member by sort order", async () => {
    const slots = createSlotEngineStub();
    const result = await slots.assignMember({
      bundle: {
        id: "cal-1",
        schedulerId: "sched-1",
        name: "Interview",
        slug: "abc",
        bookingWindowDays: 14,
        minNoticeHours: 4,
        defaultMaxPerDay: 3,
        defaultMaxPerWeek: 15,
        defaultWorkingHours: [],
        durations: [30],
        createdAt: "2026-01-01T00:00:00.000Z",
        scheduler: { id: "sched-1", email: "r@acme.com", name: "Recruiter" },
        members: [
          {
            id: "m-2",
            calendarId: "cal-1",
            email: "b@acme.com",
            displayName: null,
            maxPerDayOverride: null,
            maxPerWeekOverride: null,
            workingHoursOverride: null,
            sortOrder: 2,
            assignmentWeight: 100,
          },
          {
            id: "m-1",
            calendarId: "cal-1",
            email: "a@acme.com",
            displayName: null,
            maxPerDayOverride: null,
            maxPerWeekOverride: null,
            workingHoursOverride: null,
            sortOrder: 1,
            assignmentWeight: 100,
          },
        ],
      },
      startsAt: "2026-06-03T14:00:00.000Z",
      durationMinutes: 30,
      viewerTimezone: "UTC",
      scheduling: defaultSchedulingSettingsStub(),
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        member: expect.objectContaining({ id: "m-1", email: "a@acme.com" }),
      }),
    );
  });
});
