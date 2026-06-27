import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_WORKING_HOURS } from "./validation";
import type { CalendarMember, WorkingHours } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/components/calendar-admin/working-hours-editor", () => ({
  WorkingHoursEditor: ({ value }: { value: WorkingHours }) => (
    <p>Working hours editor ({value.length} blocks)</p>
  ),
}));

vi.mock("@/components/calendar-admin/timezone-select", () => ({
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
  buildMemberSavePayload,
  initialUseCalendarDefaultHours,
  memberAdvancedDefaultOpen,
  MemberForm,
  memberHasHoursOverride,
} from "./member-form";

const sampleMember: CalendarMember = {
  id: "mem-1",
  calendarId: "cal-1",
  email: "alice@acme.com",
  displayName: "Alice",
  maxPerDayOverride: null,
  maxPerWeekOverride: null,
  workingHoursOverride: [{ day: 2, start: 600, end: 900 }],
  timezone: "America/Denver",
  sortOrder: 0,
  assignmentWeight: 100,
};

const formProps = {
  calendarId: "cal-1",
  calendarDefaultDay: 3,
  calendarDefaultWeek: 10,
  calendarDefaultWorkingHours: DEFAULT_WORKING_HOURS,
  calendarTimezone: "America/New_York",
};

describe("memberHasHoursOverride", () => {
  it("is false for null or empty override", () => {
    expect(memberHasHoursOverride(null)).toBe(false);
    expect(memberHasHoursOverride([])).toBe(false);
  });

  it("is true when override has blocks", () => {
    expect(memberHasHoursOverride([{ day: 1, start: 540, end: 1020 }])).toBe(
      true,
    );
  });
});

describe("initialUseCalendarDefaultHours", () => {
  it("defaults to true when no override", () => {
    expect(initialUseCalendarDefaultHours(null)).toBe(true);
    expect(initialUseCalendarDefaultHours([])).toBe(true);
  });

  it("is false when member has override", () => {
    expect(
      initialUseCalendarDefaultHours([{ day: 1, start: 540, end: 1020 }]),
    ).toBe(false);
  });
});

describe("buildMemberSavePayload", () => {
  it("clears override and timezone when using calendar defaults", () => {
    const payload = buildMemberSavePayload({
      email: "a@acme.com",
      useCalendarDefaultHours: true,
      workingHoursOverride: DEFAULT_WORKING_HOURS,
      timezone: "America/New_York",
    });

    expect(payload.workingHoursOverride).toBeNull();
    expect(payload.timezone).toBeNull();
  });

  it("sends override and timezone when custom hours enabled", () => {
    const hours = [{ day: 1 as const, start: 600, end: 720 }];
    const payload = buildMemberSavePayload({
      email: "a@acme.com",
      useCalendarDefaultHours: false,
      workingHoursOverride: hours,
      timezone: "Asia/Tokyo",
    });

    expect(payload.workingHoursOverride).toEqual(hours);
    expect(payload.timezone).toBe("Asia/Tokyo");
  });
});

describe("memberAdvancedDefaultOpen", () => {
  it("returns false for create and default member", () => {
    expect(memberAdvancedDefaultOpen(null)).toBe(false);
    expect(
      memberAdvancedDefaultOpen({
        ...sampleMember,
        workingHoursOverride: null,
        timezone: null,
      }),
    ).toBe(false);
  });

  it("returns true when advanced fields are set", () => {
    expect(memberAdvancedDefaultOpen(sampleMember)).toBe(true);
    expect(
      memberAdvancedDefaultOpen({ ...sampleMember, assignmentWeight: 250 }),
    ).toBe(true);
  });
});

describe("MemberForm", () => {
  it("renders standard fields and collapsed advanced section on create", () => {
    const html = renderToStaticMarkup(
      <MemberForm mode="create" {...formProps} />,
    );

    expect(html).toContain("Standard settings");
    expect(html).toContain("Advanced settings");
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("Use calendar default hours");
    expect(html).not.toContain("Hours interpreted in member timezone");
    expect(html).not.toContain("Working hours editor");
  });

  it("opens advanced section when member has overrides on edit", () => {
    expect(memberAdvancedDefaultOpen(sampleMember)).toBe(true);

    const html = renderToStaticMarkup(
      <MemberForm mode="edit" member={sampleMember} {...formProps} />,
    );

    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain("Hours interpreted in member timezone");
    expect(html).toContain("Member timezone");
    expect(html).toContain("America/Denver");
    expect(html).toContain("Working hours editor (1 blocks)");
  });
});
