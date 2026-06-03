import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BookingCalendar,
  dateKeyForDay,
  firstWeekdayOfMonth,
  isDateKeyInWindow,
} from "./booking-calendar";
import { CalendarDayOverlay } from "./calendar-day-overlay";

describe("booking-calendar helpers", () => {
  it("firstWeekdayOfMonth returns Sunday=0 for June 2026", () => {
    expect(firstWeekdayOfMonth(2026, 6)).toBe(1);
  });

  it("dateKeyForDay matches viewer timezone", () => {
    expect(dateKeyForDay(2026, 6, 8, "UTC")).toBe("2026-06-08");
  });

  it("isDateKeyInWindow compares YYYY-MM-DD keys in viewer TZ", () => {
    const min = new Date("2026-06-05T12:00:00.000Z");
    const max = new Date("2026-06-10T12:00:00.000Z");
    expect(isDateKeyInWindow("2026-06-04", min, max, "UTC")).toBe(false);
    expect(isDateKeyInWindow("2026-06-08", min, max, "UTC")).toBe(true);
    expect(isDateKeyInWindow("2026-06-11", min, max, "UTC")).toBe(false);
  });
});

describe("CalendarDayOverlay", () => {
  it("renders slot count badge for available days", () => {
    const html = renderToStaticMarkup(
      <CalendarDayOverlay day={8} slotCount={3} state="available" />,
    );
    expect(html).toContain("3");
    expect(html).toContain("bg-primary");
  });

  it("renders selected state with primary styling", () => {
    const html = renderToStaticMarkup(
      <CalendarDayOverlay day={8} slotCount={2} state="selected" />,
    );
    expect(html).toContain("text-white");
    expect(html).toContain("2");
  });

  it("omits badge for no-slots state", () => {
    const html = renderToStaticMarkup(
      <CalendarDayOverlay day={8} slotCount={0} state="no-slots" />,
    );
    expect(html).not.toContain("bg-primary text-white");
    expect(html).toContain("text-ink-muted/40");
  });
});

describe("BookingCalendar", () => {
  it("renders month grid with available and disabled day classes", () => {
    const slotCounts = new Map([
      ["2026-06-08", 3],
      ["2026-06-10", 2],
      ["2026-06-09", 0],
    ]);

    const html = renderToStaticMarkup(
      <BookingCalendar
        visibleMonth={{ year: 2026, month: 6 }}
        onMonthChange={() => {}}
        slotCountsByDate={slotCounts}
        selectedDate="2026-06-08"
        onSelectDate={() => {}}
        minDate={new Date("2026-06-05T12:00:00.000Z")}
        maxDate={new Date("2026-06-10T12:00:00.000Z")}
        viewerTimezone="UTC"
      />,
    );

    expect(html).toContain("ring-primary/20");
    expect(html).toContain("border-primary bg-primary");
    expect(html).toContain("cursor-not-allowed");
    expect(html).toContain('aria-label="Go to the Previous Month"');
    expect(html).toContain('aria-label="Go to the Next Month"');
  });

  it("shows loading message when loading", () => {
    const html = renderToStaticMarkup(
      <BookingCalendar
        visibleMonth={{ year: 2026, month: 6 }}
        onMonthChange={() => {}}
        slotCountsByDate={new Map()}
        selectedDate={null}
        onSelectDate={() => {}}
        minDate={new Date("2026-06-01T12:00:00.000Z")}
        maxDate={new Date("2026-06-30T12:00:00.000Z")}
        loading
        viewerTimezone="UTC"
      />,
    );

    expect(html).toContain("Loading availability");
    expect(html).toContain("pointer-events-none");
  });
});
