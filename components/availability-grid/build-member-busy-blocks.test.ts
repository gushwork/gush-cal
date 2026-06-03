import { describe, expect, it } from "vitest";
import { buildMemberBusyBlocks } from "./build-member-busy-blocks";
import type { CalendarMember } from "@/lib/types";

const members: CalendarMember[] = [
  {
    id: "m-1",
    calendarId: "cal-1",
    email: "alice@acme.com",
    displayName: "Alice",
    maxPerDayOverride: null,
    maxPerWeekOverride: null,
    workingHoursOverride: null,
    sortOrder: 1,
  },
  {
    id: "m-2",
    calendarId: "cal-1",
    email: "bob@acme.com",
    displayName: null,
    maxPerDayOverride: null,
    maxPerWeekOverride: null,
    workingHoursOverride: null,
    sortOrder: 2,
  },
];

describe("buildMemberBusyBlocks", () => {
  it("maps accessible members with busy blocks", () => {
    const result = buildMemberBusyBlocks(members, {
      byEmail: {
        "alice@acme.com": {
          status: "ok",
          busy: [
            {
              start: "2026-06-03T10:00:00.000Z",
              end: "2026-06-03T11:00:00.000Z",
            },
          ],
        },
        "bob@acme.com": {
          status: "ok",
          busy: [],
        },
      },
    });

    expect(result).toEqual([
      {
        memberId: "m-1",
        email: "alice@acme.com",
        status: "accessible",
        busy: [
          {
            start: "2026-06-03T10:00:00.000Z",
            end: "2026-06-03T11:00:00.000Z",
          },
        ],
      },
      {
        memberId: "m-2",
        email: "bob@acme.com",
        status: "accessible",
        busy: [],
      },
    ]);
  });

  it("marks members inaccessible on freebusy error without faking busy", () => {
    const result = buildMemberBusyBlocks(members, {
      byEmail: {
        "alice@acme.com": {
          status: "error",
          code: "notFound",
        },
        "bob@acme.com": {
          status: "ok",
          busy: [],
        },
      },
    });

    expect(result[0]).toEqual({
      memberId: "m-1",
      email: "alice@acme.com",
      status: "inaccessible",
      errorCode: "notFound",
      busy: [],
    });
  });

  it("marks members inaccessible when email missing from freebusy result", () => {
    const result = buildMemberBusyBlocks(members, {
      byEmail: {
        "bob@acme.com": {
          status: "ok",
          busy: [],
        },
      },
    });

    expect(result[0]?.status).toBe("inaccessible");
    expect(result[0]?.busy).toEqual([]);
  });
});
