import { describe, expect, it } from "vitest";
import {
  addBlock,
  applyMonToWeekdays,
  applyPreset,
  businessHoursPreset,
  clearAllPreset,
  copyDayTo,
  flattenDayBlocks,
  groupByDay,
  removeBlock,
  toggleDay,
  updateBlock,
  validationError,
} from "./editor-utils";

describe("businessHoursPreset", () => {
  it("sets Mon–Fri 9–5", () => {
    const hours = businessHoursPreset();
    expect(hours).toHaveLength(5);
    expect(hours.every((block) => block.start === 540 && block.end === 1020)).toBe(
      true,
    );
    expect(hours.map((block) => block.day)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("clearAllPreset", () => {
  it("returns empty hours", () => {
    expect(clearAllPreset()).toEqual([]);
  });
});

describe("applyMonToWeekdays", () => {
  it("copies Monday blocks to Tue–Fri", () => {
    const hours = [
      { day: 1 as const, start: 540, end: 720 },
      { day: 1 as const, start: 780, end: 1020 },
      { day: 6 as const, start: 600, end: 900 },
    ];
    const result = applyMonToWeekdays(hours);
    expect(result.filter((block) => block.day === 1)).toEqual([
      { day: 1, start: 540, end: 720 },
      { day: 1, start: 780, end: 1020 },
    ]);
    for (const day of [2, 3, 4, 5] as const) {
      expect(result.filter((block) => block.day === day)).toEqual([
        { day, start: 540, end: 720 },
        { day, start: 780, end: 1020 },
      ]);
    }
    expect(result.filter((block) => block.day === 6)).toEqual([
      { day: 6, start: 600, end: 900 },
    ]);
  });
});

describe("copyDayTo", () => {
  it("copies blocks from one day to another", () => {
    const hours = [{ day: 1 as const, start: 540, end: 1020 }];
    const result = copyDayTo(hours, 1, 3);
    expect(result.filter((block) => block.day === 3)).toEqual([
      { day: 3, start: 540, end: 1020 },
    ]);
  });
});

describe("groupByDay / flattenDayBlocks", () => {
  it("round-trips blocks sorted by day and start", () => {
    const hours = [
      { day: 3 as const, start: 600, end: 900 },
      { day: 1 as const, start: 540, end: 1020 },
      { day: 1 as const, start: 480, end: 510 },
    ];
    expect(flattenDayBlocks(groupByDay(hours))).toEqual([
      { day: 1, start: 480, end: 510 },
      { day: 1, start: 540, end: 1020 },
      { day: 3, start: 600, end: 900 },
    ]);
  });
});

describe("toggleDay", () => {
  it("enables a day with default block", () => {
    expect(toggleDay([], 2, true)).toEqual([{ day: 2, start: 540, end: 1020 }]);
  });

  it("disables a day by removing blocks", () => {
    const hours = [{ day: 2 as const, start: 540, end: 1020 }];
    expect(toggleDay(hours, 2, false)).toEqual([]);
  });
});

describe("updateBlock overlap rejection", () => {
  it("rejects overlapping blocks on the same day", () => {
    const hours = [
      { day: 1 as const, start: 540, end: 720 },
      { day: 1 as const, start: 780, end: 1020 },
    ];
    const result = updateBlock(hours, 1, 1, { start: 660 });
    expect(result.applied).toBe(false);
    expect(result.error).toMatch(/Overlapping hours on Mon/);
    expect(result.hours).toEqual(hours);
  });

  it("accepts non-overlapping edits", () => {
    const hours = [{ day: 1 as const, start: 540, end: 1020 }];
    const result = updateBlock(hours, 1, 0, { end: 900 });
    expect(result.applied).toBe(true);
    expect(result.error).toBeNull();
    expect(result.hours).toEqual([{ day: 1, start: 540, end: 900 }]);
  });
});

describe("addBlock", () => {
  it("adds a non-overlapping block", () => {
    const hours = [{ day: 1 as const, start: 540, end: 720 }];
    const result = addBlock(hours, 1);
    expect(result.applied).toBe(true);
    expect(result.hours).toHaveLength(2);
  });
});

describe("removeBlock", () => {
  it("removes a block by index", () => {
    const hours = [
      { day: 1 as const, start: 540, end: 720 },
      { day: 1 as const, start: 780, end: 1020 },
    ];
    expect(removeBlock(hours, 1, 0)).toEqual([{ day: 1, start: 780, end: 1020 }]);
  });
});

describe("applyPreset", () => {
  it("applies business hours preset", () => {
    const result = applyPreset([], businessHoursPreset());
    expect(result.applied).toBe(true);
    expect(result.error).toBeNull();
    expect(result.hours).toEqual(businessHoursPreset());
  });

  it("reports validation error for clear all", () => {
    const result = applyPreset(businessHoursPreset(), clearAllPreset());
    expect(result.hours).toEqual([]);
    expect(result.error).toMatch(/At least one availability window required/);
  });
});

describe("validationError", () => {
  it("returns null for valid hours", () => {
    expect(validationError(businessHoursPreset())).toBeNull();
  });
});
