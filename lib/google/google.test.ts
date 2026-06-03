import { generateKeyPairSync } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FreeBusyRequest } from "@/lib/ports/google-calendar";

const freebusyQuery = vi.fn();
const eventsInsert = vi.fn();
const eventsDelete = vi.fn();

vi.mock("googleapis", () => ({
  google: {
    auth: {
      JWT: vi.fn().mockImplementation(() => ({})),
    },
    calendar: vi.fn(() => ({
      freebusy: { query: freebusyQuery },
      events: { insert: eventsInsert, delete: eventsDelete },
    })),
  },
}));

function testServiceAccountJson(): string {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return JSON.stringify({
    client_email: "sa@test.iam.gserviceaccount.com",
    private_key: privateKey.export({ type: "pkcs8", format: "pem" }),
  });
}

describe("createGoogleCalendarPort", () => {
  beforeEach(() => {
    vi.resetModules();
    freebusyQuery.mockReset();
    eventsInsert.mockReset();
    eventsDelete.mockReset();
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = testServiceAccountJson();
  });

  it("queryFreeBusy maps busy blocks per email", async () => {
    freebusyQuery.mockResolvedValue({
      data: {
        calendars: {
          "a@acme.com": {
            busy: [{ start: "2026-06-03T10:00:00Z", end: "2026-06-03T11:00:00Z" }],
          },
          "b@acme.com": {
            errors: [{ reason: "notFound" }],
          },
        },
      },
    });

    const { createGoogleCalendarPort } = await import("@/lib/google");
    const port = createGoogleCalendarPort();

    const req: FreeBusyRequest = {
      memberEmails: ["a@acme.com", "b@acme.com"],
      timeMin: "2026-06-03T09:00:00Z",
      timeMax: "2026-06-03T17:00:00Z",
    };

    const result = await port.queryFreeBusy(req);

    expect(result.byEmail["a@acme.com"]).toEqual({
      status: "ok",
      busy: [{ start: "2026-06-03T10:00:00Z", end: "2026-06-03T11:00:00Z" }],
    });
    expect(result.byEmail["b@acme.com"]).toEqual({
      status: "error",
      code: "notFound",
    });
  });

  it("queryFreeBusy matches calendar entries case-insensitively", async () => {
    freebusyQuery.mockResolvedValue({
      data: {
        calendars: {
          "alice@acme.com": {
            busy: [{ start: "2026-06-03T10:00:00Z", end: "2026-06-03T11:00:00Z" }],
          },
        },
      },
    });

    const { createGoogleCalendarPort } = await import("@/lib/google");
    const port = createGoogleCalendarPort();

    const result = await port.queryFreeBusy({
      memberEmails: ["Alice@acme.com"],
      timeMin: "2026-06-03T09:00:00Z",
      timeMax: "2026-06-03T17:00:00Z",
    });

    expect(result.byEmail["Alice@acme.com"]).toEqual({
      status: "ok",
      busy: [{ start: "2026-06-03T10:00:00Z", end: "2026-06-03T11:00:00Z" }],
    });
  });

  it("queryFreeBusy maps auth failures to per-email error codes", async () => {
    freebusyQuery.mockRejectedValue(
      new Error("unauthorized_client: Client is unauthorized"),
    );

    const { createGoogleCalendarPort } = await import("@/lib/google");
    const port = createGoogleCalendarPort();

    const result = await port.queryFreeBusy({
      memberEmails: ["a@acme.com", "b@acme.com"],
      timeMin: "2026-06-03T09:00:00Z",
      timeMax: "2026-06-03T17:00:00Z",
    });

    expect(result.byEmail["a@acme.com"]).toEqual({
      status: "error",
      code: "DWD_NOT_AUTHORIZED",
    });
    expect(result.byEmail["b@acme.com"]).toEqual({
      status: "error",
      code: "DWD_NOT_AUTHORIZED",
    });
  });

  it("createMeetingEvent returns event id and meet link", async () => {
    eventsInsert.mockResolvedValue({
      data: {
        id: "evt-123",
        hangoutLink: "https://meet.google.com/abc-defg-hij",
      },
    });

    const { createGoogleCalendarPort } = await import("@/lib/google");
    const port = createGoogleCalendarPort();

    const result = await port.createMeetingEvent({
      organizerEmail: "scheduler@acme.com",
      startsAt: "2026-06-03T14:00:00.000Z",
      durationMinutes: 30,
      subject: "Interview",
      body: "Panel interview",
      attendeeEmails: ["member@acme.com", "candidate@example.com"],
      requestMeet: true,
    });

    expect(result).toEqual({
      ok: true,
      googleEventId: "evt-123",
      meetLink: "https://meet.google.com/abc-defg-hij",
    });
    expect(eventsInsert).toHaveBeenCalledWith({
      calendarId: "primary",
      conferenceDataVersion: 1,
      sendUpdates: "all",
      requestBody: expect.objectContaining({
        summary: "Interview",
        description: "Panel interview",
        attendees: [
          { email: "member@acme.com" },
          { email: "candidate@example.com" },
        ],
        conferenceData: expect.objectContaining({
          createRequest: expect.objectContaining({
            conferenceSolutionKey: { type: "hangoutsMeet" },
          }),
        }),
      }),
    });
  });

  it("deleteEvent calls calendar events.delete", async () => {
    eventsDelete.mockResolvedValue({});

    const { createGoogleCalendarPort } = await import("@/lib/google");
    const port = createGoogleCalendarPort();

    await port.deleteEvent("scheduler@acme.com", "evt-123");

    expect(eventsDelete).toHaveBeenCalledWith({
      calendarId: "primary",
      eventId: "evt-123",
      sendUpdates: "all",
    });
  });

  it("deleteEvent skips Google for stub event ids", async () => {
    const { createGoogleCalendarPort } = await import("@/lib/google");
    const port = createGoogleCalendarPort();

    await port.deleteEvent("scheduler@acme.com", "stub-event-202606031200");

    expect(eventsDelete).not.toHaveBeenCalled();
  });

  it("deleteEvent treats 404 as already deleted", async () => {
    eventsDelete.mockRejectedValue({
      response: { status: 404, data: { error: { message: "Not Found" } } },
    });

    const { createGoogleCalendarPort } = await import("@/lib/google");
    const port = createGoogleCalendarPort();

    await expect(
      port.deleteEvent("scheduler@acme.com", "evt-gone"),
    ).resolves.toBeUndefined();
  });
});

describe("parseServiceAccountJson", () => {
  it("throws when GOOGLE_SERVICE_ACCOUNT_JSON is missing", async () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const { parseServiceAccountJson } = await import(
      "@/lib/google/calendar-client"
    );
    expect(() => parseServiceAccountJson()).toThrow(
      "GOOGLE_SERVICE_ACCOUNT_JSON is not set",
    );
  });

  it("normalizes escaped newlines in private_key", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON =
      '{"client_email":"sa@test.iam.gserviceaccount.com","private_key":"-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n"}';
    const { parseServiceAccountJson } = await import(
      "@/lib/google/calendar-client"
    );
    expect(parseServiceAccountJson().private_key).toBe(
      "-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----",
    );
  });

  it("returns null from tryParseServiceAccountJson when PEM is invalid", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      client_email: "sa@test.iam.gserviceaccount.com",
      private_key: "not-a-valid-pem-key",
    });
    const { tryParseServiceAccountJson } = await import(
      "@/lib/google/calendar-client"
    );
    expect(tryParseServiceAccountJson()).toBeNull();
  });

  it("accepts a single-line PEM private key", async () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }) as string;
    const singleLine = pem.replace(/\n/g, "");
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      client_email: "sa@test.iam.gserviceaccount.com",
      private_key: singleLine,
    });

    const { tryParseServiceAccountJson } = await import(
      "@/lib/google/calendar-client"
    );
    expect(tryParseServiceAccountJson()).not.toBeNull();
  });
});
