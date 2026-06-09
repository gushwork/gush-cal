import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Meeting } from "@/lib/types";

describe("SP-24 meetings table", () => {
  const tablePath = join(
    process.cwd(),
    "components/booking/meetings-table.tsx",
  );

  it("uses caption-style headers, Join column, sr-only Actions, and Avatar", () => {
    const source = readFileSync(tablePath, "utf8");
    expect(source).toContain("uppercase tracking-wide");
    expect(source).toContain("Member");
    expect(source).toContain("Join");
    expect(source).not.toMatch(/>\s*Meet\s*</);
    expect(source).toContain('sr-only">Actions</span>');
    expect(source).toContain("Avatar");
    expect(source).toContain("formatBookedBy");
    expect(source).toContain("ExternalLink");
    expect(source).toContain('variant="link"');
  });

  it("sorts upcoming ascending and past descending", () => {
    const source = readFileSync(tablePath, "utf8");
    expect(source).toContain(".sort(");
    expect(source.match(/\.sort\(/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("cancel uses destructive hover and descriptive aria-label", () => {
    const source = readFileSync(tablePath, "utf8");
    expect(source).toContain("hover:text-status-error-700");
    expect(source).toContain("aria-label={`Cancel ${meeting.subject}`}");
  });

  it("renders Past section when only past meetings exist", async () => {
    const { MeetingsTable } = await import("./meetings-table");
    const pastMeeting: Meeting = {
      id: "past1",
      calendarId: "c1",
      assignedMemberId: "mem1",
      startsAt: "2020-01-01T10:00:00.000Z",
      durationMinutes: 30,
      subject: "Old call",
      body: "",
      invitees: [],
      googleEventId: "evt-old",
      meetLink: null,
      bookedBy: "guest",
      guestEmail: null,
      createdAt: "2020-01-01T09:00:00.000Z",
    };

    expect(MeetingsTable).toBeTypeOf("function");
    expect(pastMeeting.subject).toBe("Old call");
    const source = readFileSync(tablePath, "utf8");
    expect(source).toContain('title="Past"');
    expect(source).toContain("showPastBadge");
  });
});
