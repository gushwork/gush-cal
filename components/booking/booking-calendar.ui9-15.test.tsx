import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BookingCalendar,
  dateKeyForDay,
  firstWeekdayOfMonth,
  isDateKeyInWindow,
} from "./booking-calendar";
import { CalendarDayOverlay, calendarDayAriaLabel } from "./calendar-day-overlay";
import {
  BookingDatePanel,
  findNextDateWithSlots,
} from "./steps/booking-date-panel";

describe("SP-15 booking calendar helpers", () => {
  it("firstWeekdayOfMonth returns Sunday=0 for June 2026", () => {
    expect(firstWeekdayOfMonth(2026, 6)).toBe(1);
  });

  it("dateKeyForDay matches viewer timezone", () => {
    expect(dateKeyForDay(2026, 6, 8, "UTC")).toBe("2026-06-08");
  });

  it("isDateKeyInWindow compares keys in viewer TZ", () => {
    const min = new Date("2026-06-05T12:00:00.000Z");
    const max = new Date("2026-06-10T12:00:00.000Z");
    expect(isDateKeyInWindow("2026-06-08", min, max, "UTC")).toBe(true);
    expect(isDateKeyInWindow("2026-06-11", min, max, "UTC")).toBe(false);
  });

  it("findNextDateWithSlots returns earliest future date with slots", () => {
    const counts = new Map([
      ["2026-06-08", 0],
      ["2026-06-09", 2],
      ["2026-06-11", 1],
    ]);
    const min = new Date("2026-06-05T12:00:00.000Z");
    const max = new Date("2026-06-15T12:00:00.000Z");
    expect(
      findNextDateWithSlots(counts, "2026-06-08", min, max, "UTC"),
    ).toBe("2026-06-09");
  });
});

describe("SP-15 calendar day overlay", () => {
  it("uses distinct no-slots styling and selected badge contrast", () => {
    const noSlots = renderToStaticMarkup(
      <CalendarDayOverlay day={8} slotCount={0} state="no-slots" />,
    );
    expect(noSlots).toContain("line-through");

    const selected = renderToStaticMarkup(
      <CalendarDayOverlay day={8} slotCount={2} state="selected" />,
    );
    expect(selected).toContain("bg-white text-primary");
  });

  it("calendarDayAriaLabel describes slot states", () => {
    expect(calendarDayAriaLabel(8, "available", 3)).toContain("3 slots");
    expect(calendarDayAriaLabel(8, "no-slots", 0)).toContain("no slots");
    expect(calendarDayAriaLabel(8, "out-of-window", 0)).toContain(
      "outside booking window",
    );
  });
});

describe("SP-15 BookingCalendar", () => {
  it("renders skeleton grid while loading", () => {
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

    expect(html).toContain("Loading calendar");
    expect(html).toContain("animate-skeleton");
  });

  it("renders day buttons with aria-labels when loaded", () => {
    const slotCounts = new Map([
      ["2026-06-08", 3],
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

    expect(html).toContain("3 slots");
    expect(html).toContain("no slots");
    expect(html).toContain("border-dashed");
  });
});

describe("SP-15 BookingDatePanel", () => {
  it("shows info banner when today has zero slots", () => {
    const html = renderToStaticMarkup(
      <BookingDatePanel
        visibleMonth={{ year: 2026, month: 6 }}
        onMonthChange={() => {}}
        slotCountsByDate={
          new Map([
            ["2026-06-04", 0],
            ["2026-06-05", 2],
          ])
        }
        selectedDate={null}
        onSelectDate={() => {}}
        minDate={new Date("2026-06-04T12:00:00.000Z")}
        maxDate={new Date("2026-06-10T12:00:00.000Z")}
        viewerTimezone="UTC"
        onContinue={() => {}}
      />,
    );

    expect(html).toContain("No slots today");
    expect(html).toContain("Next availability");
  });
});
