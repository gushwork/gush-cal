/** Shared local calendar-day math for slot engine and availability UI. */

type LocalDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export function getLocalDateTimeParts(
  date: Date,
  timeZone: string,
): LocalDateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  return {
    year: Number(parts.find((p) => p.type === "year")?.value),
    month: Number(parts.find((p) => p.type === "month")?.value),
    day: Number(parts.find((p) => p.type === "day")?.value),
    hour: hour === 24 ? 0 : hour,
    minute: Number(parts.find((p) => p.type === "minute")?.value),
  };
}

export function getLocalDateParts(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number } {
  const { year, month, day } = getLocalDateTimeParts(date, timeZone);
  return { year, month, day };
}

function matchesLocalDateTime(
  date: Date,
  target: LocalDateParts,
  timeZone: string,
): boolean {
  const parts = getLocalDateTimeParts(date, timeZone);
  return (
    parts.year === target.year &&
    parts.month === target.month &&
    parts.day === target.day &&
    parts.hour === target.hour &&
    parts.minute === target.minute
  );
}

function zonedInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const target: LocalDateParts = { year, month, day, hour, minute };
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  for (let offsetHours = -14; offsetHours <= 14; offsetHours++) {
    const candidate = new Date(utcGuess + offsetHours * 3_600_000);
    if (matchesLocalDateTime(candidate, target, timeZone)) {
      return candidate;
    }
  }

  for (let offsetMinutes = -24 * 60; offsetMinutes <= 24 * 60; offsetMinutes++) {
    const candidate = new Date(utcGuess + offsetMinutes * 60_000);
    if (matchesLocalDateTime(candidate, target, timeZone)) {
      return candidate;
    }
  }

  return new Date(utcGuess);
}

export function startOfLocalDay(date: Date, timeZone: string): Date {
  const { year, month, day } = getLocalDateParts(date, timeZone);
  return zonedInstant(year, month, day, 0, 0, timeZone);
}

export function endOfLocalDay(date: Date, timeZone: string): Date {
  const nextDayStart = startOfLocalDay(addLocalDays(date, 1, timeZone), timeZone);
  return new Date(nextDayStart.getTime() - 1);
}

/** Add calendar days in the given IANA timezone (handles month/year overflow). */
export function addLocalDays(date: Date, days: number, timeZone: string): Date {
  const { year, month, day } = getLocalDateParts(
    startOfLocalDay(date, timeZone),
    timeZone,
  );
  const anchor = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0, 0));
  return startOfLocalDay(anchor, timeZone);
}
