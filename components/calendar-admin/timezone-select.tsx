"use client";

import { Label } from "@/components/ui";
import type { IanaTimezone } from "@/lib/types";

const FALLBACK_TIMEZONES: IanaTimezone[] = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export function getSupportedTimezones(): IanaTimezone[] {
  if (
    typeof Intl !== "undefined" &&
    typeof Intl.supportedValuesOf === "function"
  ) {
    return Array.from(new Set(["UTC", ...Intl.supportedValuesOf("timeZone")]));
  }
  return FALLBACK_TIMEZONES;
}

export function buildTimezoneOptions(value: IanaTimezone): IanaTimezone[] {
  const browserTz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";

  return Array.from(
    new Set([browserTz, ...getSupportedTimezones(), value].filter(Boolean)),
  );
}

function formatTimezoneLabel(tz: IanaTimezone): string {
  return tz.replace(/_/g, " ");
}

export type TimezoneSelectProps = {
  value: IanaTimezone;
  onChange: (tz: IanaTimezone) => void;
  label?: string;
  disabled?: boolean;
};

export function TimezoneSelect({
  value,
  onChange,
  label = "Timezone",
  disabled = false,
}: TimezoneSelectProps) {
  const options = buildTimezoneOptions(value);

  return (
    <Label className="block space-y-1.5">
      {label}
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {options.map((tz) => (
          <option key={tz} value={tz}>
            {formatTimezoneLabel(tz)}
          </option>
        ))}
      </select>
    </Label>
  );
}
