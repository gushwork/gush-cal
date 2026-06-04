import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { BookingFlow } from "./booking-flow";
import { BookingStepper } from "./booking-stepper";
import { Stepper } from "@/components/ui/stepper";

describe("SP-14 booking flow shell", () => {
  it("booking-flow source uses AlertBanner, aria-live, and content-booking footer", () => {
    const source = readFileSync(
      join(process.cwd(), "components/booking/booking-flow.tsx"),
      "utf8",
    );
    expect(source).toContain("AlertBanner");
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain("max-w-[var(--content-booking)]");
    expect(source).toContain("shadow-[var(--shadow-sm)]");
    expect(source).toContain("safe-area-inset-bottom");
    expect(source).toContain("toast(");
    expect(source).toContain("useSearchParams");
    expect(source).toContain("parseBookingDeepLink");
    expect(source).toContain('setStep("details")');
    expect(source).toContain("booking-deep-link-loading");
  });

  it("auto-skips duration step when only one duration", () => {
    const html = renderToStaticMarkup(
      <BookingFlow
        calendarName="Demo"
        durations={[30]}
        bookingWindowDays={14}
        slotsApiPath="/api/test/slots"
        confirmApiPath="/api/test/confirm"
      />,
    );

    expect(html).not.toContain("Choose duration");
    expect(html).toContain("Date");
  });

  it("renders two-column wizard with sticky footer", () => {
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
    expect(html).toContain("sticky bottom-0");
    expect(html).toContain("content-booking");
    expect(html).toContain("Duration");
  });
});

describe("SP-14 ui stepper", () => {
  it("shows Step N of 4 on mobile layout", () => {
    const html = renderToStaticMarkup(
      <Stepper
        steps={[
          { id: "duration", label: "Duration" },
          { id: "date", label: "Date" },
          { id: "time", label: "Time" },
          { id: "details", label: "Details" },
        ]}
        currentStep="date"
      />,
    );

    expect(html).toContain("Step 2 of 4");
  });
});

describe("SP-14 booking stepper", () => {
  it("renders vertical connector and mobile stepper", () => {
    const html = renderToStaticMarkup(
      <BookingStepper currentStep="time" onStepClick={vi.fn()} />,
    );

    expect(html).toContain("border-l-2");
    expect(html).toContain("Step 3 of 4");
    expect(html).toContain('aria-label="Booking progress"');
  });
});
