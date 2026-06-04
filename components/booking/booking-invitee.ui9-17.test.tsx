import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { BookingSuccessPanel } from "./booking-success";
import { BookingSummary } from "./booking-summary";
import { BookingDetailsPanel } from "./steps/booking-details-panel";
import {
  InviteeForm,
  isGuestEmailValid,
  parseInviteeLines,
} from "./invitee-form";
import type { PublicMeeting } from "@/lib/types";

const sampleMeeting: PublicMeeting = {
  startsAt: "2026-06-08T14:00:00.000Z",
  durationMinutes: 30,
  subject: "Intro call",
  meetLink: "https://meet.google.com/abc-defg-hij",
};

describe("SP-17 BookingSummary", () => {
  it("renders meeting summary fields", () => {
    const html = renderToStaticMarkup(
      <BookingSummary
        dateKey="2026-06-08"
        startsAt="2026-06-08T14:00:00.000Z"
        durationMinutes={30}
        viewerTimezone="UTC"
        calendarName="Sales Team"
      />,
    );

    expect(html).toContain("Your meeting");
    expect(html).toContain("Sales Team");
    expect(html).toContain("30 min");
    expect(html).toContain('aria-label="Meeting summary"');
  });
});

describe("SP-17 InviteeForm", () => {
  it("uses FormField and validates guest email", () => {
    const html = renderToStaticMarkup(
      <InviteeForm
        invitees={"a@x.com\nb@x.com"}
        subject="Hello"
        body=""
        guestEmail="not-an-email"
        showGuestEmail
        onInviteesChange={() => {}}
        onSubjectChange={() => {}}
        onBodyChange={() => {}}
        onGuestEmailChange={() => {}}
      />,
    );

    expect(html).toContain("Your email");
    expect(html).toContain("Enter a valid email address");
    expect(html).toContain("2 invitees added");
  });

  it("parseInviteeLines splits on newlines and commas", () => {
    expect(parseInviteeLines("a@x.com\nb@x.com, c@x.com")).toEqual([
      "a@x.com",
      "b@x.com",
      "c@x.com",
    ]);
  });

  it("isGuestEmailValid checks email shape", () => {
    expect(isGuestEmailValid("you@example.com")).toBe(true);
    expect(isGuestEmailValid("bad")).toBe(false);
  });
});

describe("SP-17 BookingSuccessPanel", () => {
  it("uses Button asChild with rounded-lg and CheckCircle2", () => {
    const html = renderToStaticMarkup(
      <BookingSuccessPanel
        meeting={sampleMeeting}
        viewerTimezone="UTC"
        calendarName="Sales Team"
        bookAnotherHref="/book"
        meetingsHref="/meetings"
      />,
    );

    expect(html).toContain("Meeting booked");
    expect(html).toContain("rounded-[var(--radius-control)]");
    expect(html).toContain("Join Google Meet");
    expect(html).toContain("Book another meeting");
    expect(html).toContain("View meetings");
    expect(html).toContain("print:hidden");
  });

  it("public success omits admin links when hrefs omitted", () => {
    const html = renderToStaticMarkup(
      <BookingSuccessPanel
        meeting={sampleMeeting}
        viewerTimezone="UTC"
      />,
    );

    expect(html).not.toContain("Book another meeting");
    expect(html).not.toContain("View meetings");
  });

  it("booking-success source includes print utilities", () => {
    const source = readFileSync(
      join(process.cwd(), "components/booking/booking-success.tsx"),
      "utf8",
    );
    expect(source).toContain("print:hidden");
    expect(source).toContain("print:bg-white");
  });
});

describe("SP-17 BookingDetailsPanel", () => {
  it("composes summary and invitee form", () => {
    const html = renderToStaticMarkup(
      <BookingDetailsPanel
        calendarName="Demo"
        dateKey="2026-06-08"
        startsAt="2026-06-08T14:00:00.000Z"
        durationMinutes={30}
        viewerTimezone="UTC"
        invitees=""
        subject="Meet"
        body=""
        onInviteesChange={() => {}}
        onSubjectChange={() => {}}
        onBodyChange={() => {}}
        onContinue={() => {}}
      />,
    );

    expect(html).toContain("Your meeting");
    expect(html).toContain("Subject");
  });
});
