"use client";

import { Globe } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
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
  const rootRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const options = buildTimezoneOptions(value);

  const close = useCallback(() => setExpanded(false), []);

  useEffect(() => {
    if (!expanded) return;

    selectRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    }

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        close();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [expanded, close]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative w-full sm:w-auto sm:shrink-0",
      )}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`${selectId}-panel`}
        aria-haspopup="listbox"
        onClick={() => setExpanded((open) => !open)}
        className={cn(
          "interactive inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-primary sm:max-w-none sm:justify-start",
          expanded && "border-primary ring-2 ring-primary/20",
        )}
      >
        <Icon icon={Globe} size="sm" className="text-ink-muted" />
        <span className="truncate">{formatTimezoneLabel(value)}</span>
      </button>

      {expanded ? (
        <div
          id={`${selectId}-panel`}
          role="dialog"
          aria-label="Select timezone"
          className="absolute right-0 z-20 mt-2 w-full rounded-lg border border-border bg-surface p-2 shadow-[var(--shadow-sm)] sm:w-64"
        >
          <label htmlFor={selectId} className="sr-only">
            Times shown in
          </label>
          <select
            ref={selectRef}
            id={selectId}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              close();
            }}
            onKeyDown={(e) => {
              if (e.key === "Tab" && !e.shiftKey) {
                e.preventDefault();
                selectRef.current?.focus();
              }
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
