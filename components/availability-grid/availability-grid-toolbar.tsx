"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { GridLegend } from "./grid-legend";

type ViewMode = "day" | "week";

function ToggleGroup({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        'button:not([disabled])',
      ),
    );
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) {
      return;
    }

    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (index + 1) % buttons.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (index - 1 + buttons.length) % buttons.length;
    } else {
      return;
    }

    event.preventDefault();
    buttons[next]?.focus();
  }

  return (
    <div
      className="inline-flex rounded-lg border border-border bg-surface p-0.5"
      role="group"
      aria-label={label}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}

export type AvailabilityGridToolbarProps = {
  calendarId: string;
  calendarName: string;
  timeZone: string;
  rangeLabel: string;
  viewMode: ViewMode;
  durationMinutes: number;
  durations: number[];
  onViewModeChange: (mode: ViewMode) => void;
  onDurationChange: (minutes: number) => void;
  onToday: () => void;
  onShiftAnchor: (days: number) => void;
};

export function AvailabilityGridToolbar({
  calendarId,
  calendarName,
  timeZone,
  rangeLabel,
  viewMode,
  durationMinutes,
  durations,
  onViewModeChange,
  onDurationChange,
  onToday,
  onShiftAnchor,
}: AvailabilityGridToolbarProps) {
  const shiftDays = viewMode === "day" ? 1 : 7;
  const navLabel =
    viewMode === "day" ? "Previous day" : "Previous week";
  const nextNavLabel =
    viewMode === "day" ? "Next day" : "Next week";

  return (
    <header
      className="flex shrink-0 flex-col gap-3 md:gap-4"
      data-testid="availability-toolbar"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <Link
          href={`/calendars/${calendarId}`}
          className="interactive shrink-0 text-sm text-ink-muted hover:text-primary"
        >
          ← Calendar
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-title text-ink">
          {calendarName}
        </h1>
        <p
          className="w-full text-caption text-ink-muted sm:ml-auto sm:w-auto"
          data-testid="viewer-timezone"
        >
          Times in {timeZone}
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            className="px-2"
            aria-label={navLabel}
            onClick={() => onShiftAnchor(-shiftDays)}
            data-testid="nav-prev"
          >
            <Icon icon={ChevronLeft} size="sm" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onToday}>
            Today
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="px-2"
            aria-label={nextNavLabel}
            onClick={() => onShiftAnchor(shiftDays)}
            data-testid="nav-next"
          >
            <Icon icon={ChevronRight} size="sm" />
          </Button>
          <span className="px-1 text-sm font-medium text-ink">{rangeLabel}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup label="View mode">
            <Button
              variant={viewMode === "day" ? "primary" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("day")}
              data-testid="view-day"
            >
              Day
            </Button>
            <Button
              variant={viewMode === "week" ? "primary" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("week")}
              data-testid="view-week"
            >
              Week
            </Button>
          </ToggleGroup>

          <ToggleGroup label="Meeting duration">
            {durations.map((duration) => (
              <Button
                key={duration}
                variant={durationMinutes === duration ? "primary" : "ghost"}
                size="sm"
                onClick={() => onDurationChange(duration)}
                data-testid={`duration-${duration}`}
              >
                {duration}m
              </Button>
            ))}
          </ToggleGroup>

          <GridLegend className="hidden lg:inline-flex" />
        </div>
      </div>

      <GridLegend className="shrink-0 lg:hidden" />
    </header>
  );
}
