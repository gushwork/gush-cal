"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CalendarBundle,
  CalendarMember,
  MemberBusyBlock,
  Slot,
} from "@/lib/types";
import { Button } from "@/components/ui";
import { toDateKey } from "@/components/booking/group-slots-by-date";
import { BookableOverlay } from "./bookable-overlay";
import { fetchBookableSlots } from "./fetch-bookable-slots";
import { GridLegend } from "./grid-legend";
import { MemberColumn } from "./member-column";
import {
  addLocalDays,
  endOfLocalDay,
  endOfLocalWeek,
  formatLocalDayLabel,
  getViewerTimezone,
  gridHourLabels,
  GRID_TOTAL_MINUTES,
  startOfLocalDay,
  startOfLocalWeek,
  toUtcInstant,
} from "./time-utils";

type ViewMode = "day" | "week";

type AvailabilityGridProps = {
  calendarId: string;
  bundle: CalendarBundle;
};

function memberDisplayName(member: CalendarMember): string {
  return member.displayName ?? member.email;
}

function ToggleGroup({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-border bg-surface p-0.5"
      role="group"
      aria-label={label}
    >
      {children}
    </div>
  );
}

export function AvailabilityGrid({ calendarId, bundle }: AvailabilityGridProps) {
  const timeZone = useMemo(() => getViewerTimezone(), []);
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [durationMinutes, setDurationMinutes] = useState(
    () => bundle.durations[0] ?? 30,
  );
  const [busyBlocks, setBusyBlocks] = useState<MemberBusyBlock[]>([]);
  const [bookableSlots, setBookableSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configWarning, setConfigWarning] = useState<string | null>(null);

  const range = useMemo(() => {
    if (viewMode === "day") {
      const start = startOfLocalDay(anchorDate, timeZone);
      const end = endOfLocalDay(anchorDate, timeZone);
      return { start, end };
    }

    const start = startOfLocalWeek(anchorDate, timeZone);
    const end = endOfLocalWeek(anchorDate, timeZone);
    return { start, end };
  }, [anchorDate, timeZone, viewMode]);

  const rangeStartIso = toUtcInstant(range.start);
  const rangeEndIso = toUtcInstant(range.end);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setConfigWarning(null);

    try {
      const params = new URLSearchParams({
        from: rangeStartIso,
        to: rangeEndIso,
      });
      const response = await fetch(
        `/api/calendars/${calendarId}/availability?${params.toString()}`,
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "Failed to load availability");
      }

      const data = (await response.json()) as {
        members: MemberBusyBlock[];
        warning?: string;
      };
      setBusyBlocks(data.members);
      setConfigWarning(data.warning ?? null);

      const slots = await fetchBookableSlots({
        calendarId,
        durationMinutes,
        rangeStart: rangeStartIso,
        rangeEnd: rangeEndIso,
        viewerTimezone: timeZone,
      });
      setBookableSlots(slots);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [calendarId, durationMinutes, rangeEndIso, rangeStartIso, timeZone]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const busyByMemberId = useMemo(() => {
    const map = new Map<string, MemberBusyBlock>();
    for (const block of busyBlocks) {
      map.set(block.memberId, block);
    }
    return map;
  }, [busyBlocks]);

  const weekDays = useMemo(() => {
    if (viewMode !== "week") {
      return [];
    }
    const start = startOfLocalWeek(anchorDate, timeZone);
    return Array.from({ length: 7 }, (_, index) =>
      addLocalDays(start, index, timeZone),
    );
  }, [anchorDate, timeZone, viewMode]);

  function shiftAnchor(days: number) {
    setAnchorDate((current) => addLocalDays(current, days, timeZone));
  }

  const rangeLabel =
    viewMode === "day"
      ? formatLocalDayLabel(anchorDate, timeZone)
      : `${formatLocalDayLabel(range.start, timeZone)} – ${formatLocalDayLabel(range.end, timeZone)}`;

  const shiftDays = viewMode === "day" ? 1 : 7;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 py-[var(--page-py)]">
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
        <Link
          href={`/calendars/${calendarId}`}
          className="interactive shrink-0 text-xs text-ink-muted hover:text-primary"
        >
          ← Calendar
        </Link>
        <h1 className="min-w-0 truncate text-title text-ink">{bundle.name}</h1>

        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            className="px-2"
            aria-label={viewMode === "day" ? "Previous day" : "Previous week"}
            onClick={() => shiftAnchor(-shiftDays)}
          >
            ←
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAnchorDate(new Date())}>
            Today
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="px-2"
            aria-label={viewMode === "day" ? "Next day" : "Next week"}
            onClick={() => shiftAnchor(shiftDays)}
          >
            →
          </Button>
          <span className="px-1 text-sm font-medium text-ink">{rangeLabel}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <ToggleGroup label="View mode">
            <Button
              variant={viewMode === "day" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("day")}
              data-testid="view-day"
            >
              Day
            </Button>
            <Button
              variant={viewMode === "week" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("week")}
              data-testid="view-week"
            >
              Week
            </Button>
          </ToggleGroup>

          <ToggleGroup label="Meeting duration">
            {bundle.durations.map((duration) => (
              <Button
                key={duration}
                variant={durationMinutes === duration ? "primary" : "ghost"}
                size="sm"
                onClick={() => setDurationMinutes(duration)}
                data-testid={`duration-${duration}`}
              >
                {duration}m
              </Button>
            ))}
          </ToggleGroup>

          <GridLegend className="hidden md:inline-flex" />
        </div>
      </header>

      <GridLegend className="shrink-0 md:hidden" />

      {configWarning ? (
        <p className="shrink-0 rounded-lg border border-primary/40 bg-primary-soft px-3 py-2 text-sm text-ink">
          {configWarning}
        </p>
      ) : null}

      {error ? (
        <p className="shrink-0 rounded-lg border border-destructive/40 bg-destructive-soft px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface">
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-ink-muted">
            Loading availability…
          </div>
        ) : viewMode === "week" ? (
          <div
            className="min-h-0 flex-1 overflow-auto"
            data-testid="week-grid"
          >
            <div className="grid min-w-[48rem] grid-cols-7 divide-x divide-border">
              {weekDays.map((day) => {
                const dayKey = toDateKey(day, timeZone);
                const dayStart = toUtcInstant(startOfLocalDay(day, timeZone));
                const daySlots = bookableSlots.filter(
                  (slot) =>
                    toDateKey(new Date(slot.startsAt), timeZone) === dayKey,
                );

                return (
                  <div key={day.toISOString()} className="min-w-0">
                    <div className="sticky top-0 z-10 border-b border-border bg-paper px-2 py-2 text-center text-xs font-medium text-ink">
                      {formatLocalDayLabel(day, timeZone)}
                    </div>
                    <BookableOverlay
                      slots={daySlots}
                      rangeStart={dayStart}
                      timeZone={timeZone}
                      compact
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <div className="flex min-w-max">
              <div className="sticky left-0 z-20 w-14 shrink-0 border-r border-border bg-paper">
                <div
                  className="sticky top-0 z-30 border-b border-border bg-paper py-2 text-center text-xs font-medium text-ink-muted"
                  style={{ height: "52px" }}
                >
                  Time
                </div>
                <div
                  className="relative"
                  style={{ height: `${GRID_TOTAL_MINUTES}px` }}
                >
                  {gridHourLabels().map((label, index) => (
                    <div
                      key={label}
                      className="absolute right-2 -translate-y-1/2 text-[10px] text-ink-muted"
                      style={{
                        top: `${(index / (gridHourLabels().length - 1)) * 100}%`,
                      }}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex min-w-0 flex-1">
                {bundle.members.map((member) => {
                  const busy = busyByMemberId.get(member.id) ?? {
                    memberId: member.id,
                    email: member.email,
                    status: "accessible" as const,
                    busy: [],
                  };

                  return (
                    <MemberColumn
                      key={member.id}
                      member={busy}
                      displayName={memberDisplayName(member)}
                      rangeStart={rangeStartIso}
                      timeZone={timeZone}
                    />
                  );
                })}

                <BookableOverlay
                  slots={bookableSlots}
                  rangeStart={rangeStartIso}
                  timeZone={timeZone}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {!loading && bookableSlots.length === 0 ? (
        <p
          className="shrink-0 text-xs text-ink-muted"
          data-testid="no-bookable-hint"
        >
          No pooled bookable slots in this range. Check booking window (
          {bundle.bookingWindowDays} days), working hours, duration (
          {durationMinutes}m), and caps. Times use {timeZone}.
        </p>
      ) : null}
    </div>
  );
}
