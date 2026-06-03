import type { DayOfWeek, MinutesOfDay, WorkingHours } from "@/lib/types";

const DAY_LABELS: Record<DayOfWeek, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

export function getDayLabel(day: DayOfWeek): string {
  return DAY_LABELS[day];
}

/** Format minutes-from-midnight using browser/locale conventions. */
export function minutesToLocaleTime(
  minutes: MinutesOfDay,
  locale?: string,
): string {
  const date = new Date(2000, 0, 1, 0, minutes);
  return date.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

/** Parse locale time string (HH:mm or h:mm AM) to minutes from midnight. */
export function localeTimeToMinutes(
  value: string,
  locale?: string,
): MinutesOfDay | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const match24 = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (match24) {
    const hour = Number(match24[1]);
    const minute = Number(match24[2]);
    if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
      return hour * 60 + minute;
    }
    return null;
  }

  const parsed = Date.parse(`2000-01-01 ${trimmed}`);
  if (Number.isNaN(parsed)) {
    return null;
  }
  const date = new Date(parsed);
  return date.getHours() * 60 + date.getMinutes();
}

export function businessHoursPreset(): WorkingHours {
  return [1, 2, 3, 4, 5].map((day) => ({
    day: day as DayOfWeek,
    start: 540,
    end: 1020,
  }));
}
