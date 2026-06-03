import type { DayOfWeek, WorkingHours, WorkingHoursBlock } from "@/lib/types";
import { businessHoursPreset } from "./format";
import { validateWorkingHours } from "./validate";

export type DayBlocks = {
  day: DayOfWeek;
  enabled: boolean;
  blocks: Array<{ start: number; end: number }>;
};

const ALL_DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

export function groupByDay(hours: WorkingHours): DayBlocks[] {
  const byDay = new Map<DayOfWeek, Array<{ start: number; end: number }>>();

  for (const block of hours) {
    const list = byDay.get(block.day) ?? [];
    list.push({ start: block.start, end: block.end });
    byDay.set(block.day, list);
  }

  return ALL_DAYS.map((day) => {
    const blocks = byDay.get(day) ?? [];
    return {
      day,
      enabled: blocks.length > 0,
      blocks: blocks.sort((a, b) => a.start - b.start),
    };
  });
}

export function flattenDayBlocks(days: DayBlocks[]): WorkingHours {
  const result: WorkingHoursBlock[] = [];
  for (const row of days) {
    if (!row.enabled) {
      continue;
    }
    for (const block of row.blocks) {
      result.push({ day: row.day, start: block.start, end: block.end });
    }
  }
  return result;
}

export function clearAllPreset(): WorkingHours {
  return [];
}

export { businessHoursPreset };

export function applyMonToWeekdays(hours: WorkingHours): WorkingHours {
  const monday = hours.filter((block) => block.day === 1);
  const other = hours.filter((block) => block.day === 0 || block.day === 6);
  const weekdays = [1, 2, 3, 4, 5].flatMap((day) =>
    monday.map((block) => ({ ...block, day: day as DayOfWeek })),
  );
  return [...other, ...weekdays];
}

export function copyDayTo(
  hours: WorkingHours,
  fromDay: DayOfWeek,
  toDay: DayOfWeek,
): WorkingHours {
  const source = hours.filter((block) => block.day === fromDay);
  const withoutTarget = hours.filter((block) => block.day !== toDay);
  const copied = source.map((block) => ({ ...block, day: toDay }));
  return [...withoutTarget, ...copied];
}

export type HoursChangeResult = {
  hours: WorkingHours;
  error: string | null;
  applied: boolean;
};

function validateChange(
  previous: WorkingHours,
  next: WorkingHours,
): HoursChangeResult {
  const error = validateWorkingHours(next);
  if (error) {
    return { hours: previous, error, applied: false };
  }
  return { hours: next, error: null, applied: true };
}

function nextBlockDefaults(dayBlocks: Array<{ start: number; end: number }>): {
  start: number;
  end: number;
} {
  if (dayBlocks.length === 0) {
    return { start: 540, end: 1020 };
  }
  const last = dayBlocks[dayBlocks.length - 1]!;
  const start = Math.min(last.end, 1380);
  const end = Math.min(start + 60, 1440);
  return { start, end: Math.max(start + 1, end) };
}

export function addBlock(hours: WorkingHours, day: DayOfWeek): HoursChangeResult {
  const row = groupByDay(hours).find((entry) => entry.day === day);
  const defaults = nextBlockDefaults(row?.blocks ?? []);
  const next = [
    ...hours,
    { day, start: defaults.start, end: defaults.end },
  ];
  return validateChange(hours, next);
}

export function removeBlock(
  hours: WorkingHours,
  day: DayOfWeek,
  index: number,
): WorkingHours {
  const dayBlocks = hours.filter((block) => block.day === day);
  const other = hours.filter((block) => block.day !== day);
  const next = dayBlocks.filter((_, i) => i !== index);
  return [...other, ...next];
}

export function updateBlock(
  hours: WorkingHours,
  day: DayOfWeek,
  index: number,
  patch: Partial<Pick<WorkingHoursBlock, "start" | "end">>,
): HoursChangeResult {
  let blockIndex = 0;
  const next = hours.map((block) => {
    if (block.day !== day) {
      return block;
    }
    if (blockIndex++ !== index) {
      return block;
    }
    return { ...block, ...patch };
  });
  return validateChange(hours, next);
}

export function toggleDay(
  hours: WorkingHours,
  day: DayOfWeek,
  enabled: boolean,
): WorkingHours {
  if (!enabled) {
    return hours.filter((block) => block.day !== day);
  }
  if (hours.some((block) => block.day === day)) {
    return hours;
  }
  return [...hours, { day, start: 540, end: 1020 }];
}

export function applyPreset(
  _hours: WorkingHours,
  preset: WorkingHours,
): HoursChangeResult {
  const error = validateWorkingHours(preset);
  return { hours: preset, error, applied: true };
}

export function validationError(hours: WorkingHours): string | null {
  return validateWorkingHours(hours);
}
