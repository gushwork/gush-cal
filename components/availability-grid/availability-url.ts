import { toDateKey } from "@/components/booking/group-slots-by-date";
import { startOfLocalDay } from "./time-utils";

export type AvailabilityViewMode = "day" | "week";

export type ParsedAvailabilityParams = {
  anchorDate: Date;
  viewMode: AvailabilityViewMode;
  /** Non-null when the URL had invalid values and should be replaced. */
  urlCorrection: URLSearchParams | null;
};

/** Parse YYYY-MM-DD into a stable noon-UTC Date, or null when invalid. */
export function parseDateKey(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export function buildAvailabilitySearchParams(
  anchorDate: Date,
  viewMode: AvailabilityViewMode,
  timeZone: string,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("date", toDateKey(anchorDate, timeZone));
  params.set("view", viewMode);
  return params;
}

export function parseAvailabilitySearchParams(
  params: URLSearchParams,
  timeZone: string,
): ParsedAvailabilityParams {
  const rawDate = params.get("date");
  const rawView = params.get("view");

  const today = startOfLocalDay(new Date(), timeZone);
  let anchorDate = today;
  let viewMode: AvailabilityViewMode = "day";
  let needsCorrection = false;

  if (rawDate !== null) {
    const parsed = parseDateKey(rawDate);
    if (parsed) {
      anchorDate = parsed;
    } else {
      needsCorrection = true;
      anchorDate = today;
    }
  }

  if (rawView !== null) {
    if (rawView === "day" || rawView === "week") {
      viewMode = rawView;
    } else {
      needsCorrection = true;
      viewMode = "day";
    }
  }

  return {
    anchorDate,
    viewMode,
    urlCorrection: needsCorrection
      ? buildAvailabilitySearchParams(anchorDate, viewMode, timeZone)
      : null,
  };
}
