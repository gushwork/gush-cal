import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Meeting } from "@/lib/types";
import {
  formatInvitees,
  formatRelativeMeetingTime,
} from "./meeting-card";

const baseMeeting: Meeting = {
  id: "m1",
  calendarId: "c1",
  assignedMemberId: "mem1",
  startsAt: "2026-06-10T14:00:00.000Z",
  durationMinutes: 30,
  subject: "Interview",
  body: "",
  invitees: [],
  googleEventId: "evt1",
  meetLink: "https://meet.google.com/abc",
  bookedBy: "scheduler",
  guestEmail: null,
  createdAt: "2026-06-01T10:00:00.000Z",
};

describe("SP-24 meeting card", () => {
  const cardPath = join(process.cwd(), "components/booking/meeting-card.tsx");

  it("formatInvitees returns No invitees when empty", () => {
    expect(formatInvitees(baseMeeting)).toBe("No invitees");
    expect(
      formatInvitees({
        ...baseMeeting,
        invitees: ["a@example.com"],
      }),
    ).toBe("a@example.com");
  });

  it("formatRelativeMeetingTime returns a string within seven days", () => {
    const soon = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeMeetingTime(soon)).toBeTypeOf("string");
  });

  it("uses Member label, Avatar, formatBookedBy, link Join, and cancel aria-label", () => {
    const source = readFileSync(cardPath, "utf8");
    expect(source).toContain("Member:");
    expect(source).not.toContain("Panelist");
    expect(source).toContain("Avatar");
    expect(source).toContain("formatBookedBy");
    expect(source).toContain("formatRelativeMeetingTime");
    expect(source).toContain("ExternalLink");
    expect(source).toContain('variant="link"');
    expect(source).toContain("aria-label={`Join ${meeting.subject}`}");
    expect(source).toContain("aria-label={`Cancel ${meeting.subject}`}");
    expect(source).toContain("hover:text-destructive");
  });
});
