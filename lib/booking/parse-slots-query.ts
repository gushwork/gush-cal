import type { IanaTimezone, UtcInstant } from "@/lib/types";

export type SlotsQueryParams = {
  durationMinutes: number;
  rangeStart: UtcInstant;
  rangeEnd: UtcInstant;
  viewerTimezone: IanaTimezone;
};

export function parseSlotsQuery(
  searchParams: URLSearchParams,
  allowedDurations: number[],
): { ok: true; params: SlotsQueryParams } | { ok: false; error: string } {
  const durationRaw = searchParams.get("duration");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const tz = searchParams.get("tz");

  if (!durationRaw || !from || !to || !tz) {
    return { ok: false, error: "duration, from, to, and tz are required" };
  }

  const durationMinutes = Number(durationRaw);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return { ok: false, error: "Invalid duration" };
  }

  if (!allowedDurations.includes(durationMinutes)) {
    return { ok: false, error: "Duration not allowed for this calendar" };
  }

  if (Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) {
    return { ok: false, error: "Invalid from or to date" };
  }

  if (new Date(from).getTime() >= new Date(to).getTime()) {
    return { ok: false, error: "from must be before to" };
  }

  return {
    ok: true,
    params: {
      durationMinutes,
      rangeStart: from,
      rangeEnd: to,
      viewerTimezone: tz,
    },
  };
}
