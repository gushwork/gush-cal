import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_WORKING_HOURS } from "./validation";
import type { Calendar, WorkingHours } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/components/calendar-admin/working-hours-editor", () => ({
  WorkingHoursEditor: ({ value }: { value: WorkingHours }) => (
    <p>Working hours editor ({value.length} blocks)</p>
  ),
  TimezoneSelect: ({
    value,
    label,
  }: {
    value: string;
    label?: string;
  }) => (
    <div>
      <span>{label ?? "Timezone"}</span>
      <span>{value}</span>
    </div>
  ),
}));

import {
  buildCalendarSavePayload,
  CalendarForm,
  getBrowserTimezone,
} from "./calendar-form";

const sampleCalendar: Calendar = {
  id: "cal-1",
  schedulerId: "sched-1",
  name: "Sales",
  slug: "sales",
  bookingWindowDays: 14,
  minNoticeHours: 2,
  defaultMaxPerDay: 3,
  defaultMaxPerWeek: 10,
  defaultWorkingHours: DEFAULT_WORKING_HOURS,
  timezone: "Europe/London",
  durations: [30, 60],
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("getBrowserTimezone", () => {
  it("returns Intl resolved timezone", () => {
    const spy = vi
      .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
      .mockReturnValue({
        locale: "en-US",
        calendar: "gregory",
        numberingSystem: "latn",
        timeZone: "America/Chicago",
      });

    expect(getBrowserTimezone()).toBe("America/Chicago");
    spy.mockRestore();
  });
});

describe("buildCalendarSavePayload", () => {
  it("includes timezone and defaultWorkingHours", () => {
    const payload = buildCalendarSavePayload({
      name: "Demo",
      bookingWindowDays: 7,
      minNoticeHours: 1,
      defaultMaxPerDay: 2,
      defaultMaxPerWeek: 8,
      defaultWorkingHours: DEFAULT_WORKING_HOURS,
      timezone: "UTC",
      durations: [30],
    });

    expect(payload.timezone).toBe("UTC");
    expect(payload.defaultWorkingHours).toEqual(DEFAULT_WORKING_HOURS);
    expect(payload.name).toBe("Demo");
  });
});

describe("CalendarForm", () => {
  it("renders timezone and working hours in create mode", () => {
    const html = renderToStaticMarkup(<CalendarForm mode="create" />);

    expect(html).toContain("Calendar timezone");
    expect(html).toContain("Default working hours");
    expect(html).toContain("Working hours editor (5 blocks)");
  });

  it("renders saved timezone in edit mode", () => {
    const html = renderToStaticMarkup(
      <CalendarForm mode="edit" calendar={sampleCalendar} />,
    );

    expect(html).toContain("Europe/London");
    expect(html).toContain("Availability windows are interpreted in Europe/London");
  });
});
