"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/ui/cn";
import type { IanaTimezone } from "@/lib/types";

const COMMON_TIMEZONES: IanaTimezone[] = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];

type TimezoneSelectorProps = {
  value: IanaTimezone;
  onChange: (tz: IanaTimezone) => void;
};

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 3.8 6.2 3.8 9s-1.3 6.3-3.8 9M12 3c-2.5 2.7-3.8 6.2-3.8 9s1.3 6.3 3.8 9" />
    </svg>
  );
}

function formatTimezoneLabel(tz: IanaTimezone): string {
  return tz.replace(/_/g, " ");
}

function buildTimezoneOptions(value: IanaTimezone): IanaTimezone[] {
  const browserTz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";

  return Array.from(new Set([browserTz, ...COMMON_TIMEZONES, value]));
}

export function TimezoneSelector({ value, onChange }: TimezoneSelectorProps) {
  const [expanded, setExpanded] = useState(false);
  const selectId = useId();
  const options = buildTimezoneOptions(value);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={selectId}
        onClick={() => setExpanded((open) => !open)}
        className={cn(
          "interactive inline-flex max-w-[11rem] items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-primary sm:max-w-none sm:text-sm",
          expanded && "border-primary ring-2 ring-primary/20",
        )}
      >
        <GlobeIcon className="h-3.5 w-3.5 shrink-0 text-ink-muted sm:h-4 sm:w-4" />
        <span className="truncate">{formatTimezoneLabel(value)}</span>
      </button>

      {expanded ? (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-border bg-surface p-2 shadow-sm sm:w-64">
          <label htmlFor={selectId} className="sr-only">
            Times shown in
          </label>
          <select
            id={selectId}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setExpanded(false);
            }}
            className="w-full rounded-lg border border-border bg-paper px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {options.map((tz) => (
              <option key={tz} value={tz}>
                {formatTimezoneLabel(tz)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}

export function defaultViewerTimezone(): IanaTimezone {
  if (typeof Intl === "undefined") {
    return "UTC";
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
