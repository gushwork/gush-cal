import type { IanaTimezone, WorkingHours } from "@/lib/types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function validateTimezone(tz: string): string | null {
  if (!tz.trim()) {
    return "Timezone is required";
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return null;
  } catch {
    return "Invalid timezone";
  }
}

export function validateWorkingHours(hours: WorkingHours): string | null {
  if (hours.length === 0) {
    return "At least one availability window required";
  }

  const byDay = new Map<number, Array<{ start: number; end: number }>>();

  for (const block of hours) {
    if (block.day < 0 || block.day > 6) {
      return "Invalid day of week";
    }
    if (block.start < 0 || block.end > 1440 || block.start >= block.end) {
      return "Invalid time range";
    }

    const dayBlocks = byDay.get(block.day) ?? [];
    dayBlocks.push({ start: block.start, end: block.end });
    byDay.set(block.day, dayBlocks);
  }

  for (const [day, blocks] of byDay) {
    const sorted = [...blocks].sort((a, b) => a.start - b.start);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i]!.start < sorted[i - 1]!.end) {
        return `Overlapping hours on ${DAY_NAMES[day]}`;
      }
    }
  }

  return null;
}

export function validateMemberHoursAndTimezone(
  workingHoursOverride: WorkingHours | null | undefined,
  timezone: IanaTimezone | null | undefined,
): string | null {
  const hasOverride =
    workingHoursOverride != null && workingHoursOverride.length > 0;

  if (hasOverride) {
    const hoursError = validateWorkingHours(workingHoursOverride);
    if (hoursError) {
      return hoursError;
    }
    if (!timezone) {
      return "Member timezone required when using custom hours";
    }
    return validateTimezone(timezone);
  }

  if (timezone) {
    return "Member timezone must be empty when using calendar default hours";
  }

  return null;
}
