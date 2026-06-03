import { describe, expect, it } from "vitest";
import {
  applyMonToWeekdays,
  applyPreset,
  businessHoursPreset,
  clearAllPreset,
  copyDayTo,
  updateBlock,
  validationError,
} from "@/lib/working-hours/editor-utils";
import { buildTimezoneOptions, getSupportedTimezones } from "./timezone-select";

describe("WorkingHoursEditor presets", () => {
  it("preset produces valid hours", () => {
    const hours = businessHoursPreset();
    expect(validationError(hours)).toBeNull();
  });

  it("emits Mon–Fri business hours from preset", () => {
    const result = applyPreset([], businessHoursPreset());
    expect(result.hours).toEqual(businessHoursPreset());
    expect(validationError(result.hours)).toBeNull();
  });

  it("emits empty hours from clear all preset", () => {
    const result = applyPreset(businessHoursPreset(), clearAllPreset());
    expect(result.hours).toEqual([]);
    expect(result.error).toMatch(/At least one availability window required/);
  });
});

describe("WorkingHoursEditor copy actions", () => {
  it("apply Mon to weekdays keeps valid hours", () => {
    const hours = applyMonToWeekdays([{ day: 1, start: 540, end: 1020 }]);
    expect(validationError(hours)).toBeNull();
    expect(hours.filter((block) => block.day === 5)).toHaveLength(1);
  });

  it("copy day can produce overlaps", () => {
    const hours = copyDayTo(
      [
        { day: 1, start: 540, end: 600 },
        { day: 1, start: 580, end: 1020 },
      ],
      1,
      2,
    );
    expect(validationError(hours)).toMatch(/Overlapping/);
  });
});

describe("WorkingHoursEditor overlap rejection", () => {
  it("does not apply overlapping block updates", () => {
    const hours = [
      { day: 1 as const, start: 540, end: 720 },
      { day: 1 as const, start: 780, end: 1020 },
    ];
    const result = updateBlock(hours, 1, 1, { start: 700 });
    expect(result.applied).toBe(false);
    expect(result.hours).toEqual(hours);
    expect(result.error).toMatch(/Overlapping hours on Mon/);
  });
});

describe("TimezoneSelect options", () => {
  it("returns timezone list from supportedValuesOf or fallback", () => {
    const zones = getSupportedTimezones();
    expect(zones.length).toBeGreaterThan(0);
    expect(zones).toContain("UTC");
  });

  it("includes current value in options", () => {
    const value = "America/Anchorage";
    const options = buildTimezoneOptions(value);
    expect(options).toContain(value);
  });
});
