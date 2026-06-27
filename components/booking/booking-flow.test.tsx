import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/book/test-slug",
}));
import { renderToStaticMarkup } from "react-dom/server";
import { BookingFlow } from "./booking-flow";
import { BookingStepper } from "./booking-stepper";
import { BookingSuccessPanel } from "./booking-success";
import { parseInviteeLines } from "./invitee-form";
import { TimezoneSelector } from "./timezone-selector";
import type { PublicMeeting } from "@/lib/types";

const sampleMeeting: PublicMeeting = {
  startsAt: "2026-06-08T14:00:00.000Z",
  durationMinutes: 30,
  subject: "Intro call",
  meetLink: "https://meet.google.com/abc-defg-hij",
};

describe("BookingSuccessPanel", () => {
  it("renders signature success panel with Meet and Google Calendar links", () => {
    const html = renderToStaticMarkup(
      <BookingSuccessPanel
        meeting={sampleMeeting}
        viewerTimezone="UTC"
        calendarName="Sales Team"
      />,
    );

    expect(html).toContain("Meeting booked");
    expect(html).toContain("Intro call");
    expect(html).toContain("bg-primary-soft");
    expect(html).toContain("animate-pop-in");
    expect(html).toContain("animate-fade-up");
    expect(html).toContain("https://meet.google.com/abc-defg-hij");
    expect(html).toContain("Join Google Meet");
    expect(html).toContain("Add to Google Calendar");
    expect(html).toContain("calendar.google.com");
    expect(html).toContain("with Sales Team");
  });
});

describe("BookingStepper", () => {
  it("renders vertical stepper for desktop and wires onStepClick", () => {
    const onStepClick = vi.fn();
    const html = renderToStaticMarkup(
      <BookingStepper currentStep="time" onStepClick={onStepClick} />,
    );

    expect(html).toContain('aria-label="Booking progress"');
    expect(html).toContain("hidden md:block");
    expect(html).toContain('aria-label="Go to Duration"');
    expect(html).toContain('aria-label="Go to Date"');
    expect(onStepClick).not.toHaveBeenCalled();
  });
});

describe("TimezoneSelector", () => {
  it("renders compact timezone pill with globe control", () => {
    const html = renderToStaticMarkup(
      <TimezoneSelector value="UTC" onChange={() => {}} />,
    );

    expect(html).toContain("rounded-[var(--radius-control)]");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("UTC");
  });
});

describe("parseInviteeLines", () => {
  it("splits invitees on newlines and commas", () => {
    expect(parseInviteeLines("a@x.com\nb@x.com, c@x.com")).toEqual([
      "a@x.com",
      "b@x.com",
      "c@x.com",
    ]);
  });
});

describe("BookingFlow", () => {
  it("renders two-column wizard with duration chips and sticky footer", () => {
    const html = renderToStaticMarkup(
      <BookingFlow
        calendarName="Demo Calendar"
        durations={[30, 60]}
        bookingWindowDays={14}
        slotsApiPath="/api/test/slots"
        confirmApiPath="/api/test/confirm"
      />,
    );

    expect(html).toContain("md:flex-row");
    expect(html).toContain('aria-label="Duration"');
    expect(html).toContain("Duration");
    expect(html).toContain("sticky bottom-0");
    expect(html).toContain("Continue");
    expect(html).not.toContain("DatePickerMonth");
  });

  it("renders public trust line on details step markup path", () => {
    const html = renderToStaticMarkup(
      <BookingFlow
        calendarName="Demo Calendar"
        durations={[30]}
        bookingWindowDays={14}
        slotsApiPath="/api/test/slots"
        confirmApiPath="/api/test/confirm"
        isPublic
      />,
    );

    expect(html).not.toContain("You&apos;ll receive");
  });
});
