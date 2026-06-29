"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CalendarBundle,
  CalendarMember,
  MemberBusyBlock,
  Slot,
} from "@/lib/types";
import { AlertBanner, Skeleton } from "@/components/ui";
import { toDateKey } from "@/components/booking/group-slots-by-date";
import { AvailabilityGridToolbar } from "./availability-grid-toolbar";
import {
  buildAvailabilitySearchParams,
  parseAvailabilitySearchParams,
  type AvailabilityViewMode,
} from "./availability-url";
import { BookableOverlay } from "./bookable-overlay";
import { GridHourLines } from "./grid-hour-lines";
import { fetchBookableSlots } from "./fetch-bookable-slots";
import { MemberColumn } from "./member-column";
import {
  addLocalDays,
  endOfLocalDay,
  endOfLocalWeek,
  formatLocalDayLabel,
  getViewerTimezone,
  gridHourLabels,
  GRID_COLUMN_HEADER_HEIGHT_PX,
  GRID_TOTAL_MINUTES,
  startOfLocalDay,
  startOfLocalWeek,
  toUtcInstant,
  blockPositionPercent,
} from "./time-utils";

type ViewMode = AvailabilityViewMode;

const LOAD_DEBOUNCE_MS = 300;

type AvailabilityGridProps = {
  calendarId: string;
  bundle: CalendarBundle;
};

function memberDisplayName(member: CalendarMember): string {
  return member.displayName ?? member.email;
}

function nowLinePercent(
  anchorDate: Date,
  rangeStart: string,
  timeZone: string,
): number | null {
  const todayKey = toDateKey(new Date(), timeZone);
  const anchorKey = toDateKey(anchorDate, timeZone);
  if (todayKey !== anchorKey) {
    return null;
  }

  const now = new Date();
  const end = new Date(now.getTime() + 60_000).toISOString();
  const position = blockPositionPercent(
    now.toISOString(),
    end,
    rangeStart,
    timeZone,
  );
  return position?.top ?? null;
}

function AvailabilityGridSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === "week") {
    return (
      <div
        className="grid min-h-[12rem] flex-1 grid-cols-7 gap-px bg-border p-2"
        data-testid="grid-skeleton"
        aria-busy
        aria-label="Loading availability"
      >
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2 bg-surface p-2">
            <Skeleton className="mx-auto h-4 w-16" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex min-h-[12rem] flex-1 gap-2 p-2"
      data-testid="grid-skeleton"
      aria-busy
      aria-label="Loading availability"
    >
      <Skeleton className="h-full w-14 shrink-0" />
      <div className="flex flex-1 gap-2">
        <Skeleton className="h-full flex-1" />
        <Skeleton className="h-full flex-1" />
        <Skeleton className="h-full w-28 shrink-0" />
      </div>
    </div>
  );
}

export function AvailabilityGrid({ calendarId, bundle }: AvailabilityGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timeZone = useMemo(() => getViewerTimezone(), []);
  const initialParams = useMemo(
    () =>
      parseAvailabilitySearchParams(
        new URLSearchParams(searchParams.toString()),
        timeZone,
      ),
    [searchParams, timeZone],
  );
  const [anchorDate, setAnchorDate] = useState(
    () => initialParams.anchorDate,
  );
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => initialParams.viewMode,
  );
  const [durationMinutes, setDurationMinutes] = useState(
    () => bundle.durations[0] ?? 30,
  );
  const [busyBlocks, setBusyBlocks] = useState<MemberBusyBlock[]>([]);
  const [bookableSlots, setBookableSlots] = useState<Slot[]>([]);
  const [revealedWeekDays, setRevealedWeekDays] = useState<Set<string>>(
    () => new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configWarning, setConfigWarning] = useState<string | null>(null);

  useEffect(() => {
    if (initialParams.urlCorrection) {
      router.replace(
        `${pathname}?${initialParams.urlCorrection.toString()}`,
      );
    }
  }, [initialParams.urlCorrection, pathname, router]);

  // Follow external URL changes (browser back/forward, shared links).
  useEffect(() => {
    setAnchorDate(initialParams.anchorDate);
    setViewMode(initialParams.viewMode);
  }, [initialParams.anchorDate, initialParams.viewMode]);

  const syncUrl = useCallback(
    (date: Date, mode: ViewMode) => {
      const next = buildAvailabilitySearchParams(date, mode, timeZone);
      router.replace(`${pathname}?${next.toString()}`);
    },
    [pathname, router, timeZone],
  );

  const navigateToDate = useCallback(
    (date: Date) => {
      setAnchorDate(date);
      syncUrl(date, viewMode);
    },
    [syncUrl, viewMode],
  );

  const navigateToday = useCallback(() => {
    navigateToDate(new Date());
  }, [navigateToDate]);

  const shiftAnchor = useCallback(
    (days: number) => {
      const next = addLocalDays(anchorDate, days, timeZone);
      setAnchorDate(next);
      syncUrl(next, viewMode);
    },
    [anchorDate, syncUrl, timeZone, viewMode],
  );

  const changeViewMode = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
      syncUrl(anchorDate, mode);
    },
    [anchorDate, syncUrl],
  );

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
    setRevealedWeekDays(new Set());

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

      if (viewMode === "week") {
        const weekStart = startOfLocalWeek(anchorDate, timeZone);
        const days = Array.from({ length: 7 }, (_, index) =>
          addLocalDays(weekStart, index, timeZone),
        );
        days.forEach((day, index) => {
          const dayKey = toDateKey(day, timeZone);
          window.setTimeout(() => {
            setRevealedWeekDays((current) => new Set(current).add(dayKey));
          }, index * 40);
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [
    anchorDate,
    calendarId,
    durationMinutes,
    rangeEndIso,
    rangeStartIso,
    timeZone,
    viewMode,
  ]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadData();
    }, LOAD_DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
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

  const rangeLabel =
    viewMode === "day"
      ? formatLocalDayLabel(anchorDate, timeZone)
      : `${formatLocalDayLabel(range.start, timeZone)} – ${formatLocalDayLabel(range.end, timeZone)}`;

  const nowPercent = nowLinePercent(anchorDate, rangeStartIso, timeZone);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 py-[var(--page-py)]">
      <AvailabilityGridToolbar
        calendarId={calendarId}
        calendarName={bundle.name}
        timeZone={timeZone}
        rangeLabel={rangeLabel}
        anchorDate={anchorDate}
        viewMode={viewMode}
        durationMinutes={durationMinutes}
        durations={bundle.durations}
        onViewModeChange={changeViewMode}
        onDurationChange={setDurationMinutes}
        onToday={navigateToday}
        onShiftAnchor={shiftAnchor}
        onSelectDate={navigateToDate}
      />

      {configWarning ? (
        <AlertBanner variant="warning" className="shrink-0">
          {configWarning}
        </AlertBanner>
      ) : null}

      {error ? (
        <AlertBanner variant="error" className="shrink-0">
          {error}
        </AlertBanner>
      ) : null}

      <div className="-mx-[var(--page-px)] flex min-h-0 flex-1 flex-col overflow-hidden border-y border-border bg-surface sm:mx-0 sm:rounded-lg sm:border">
        {loading ? (
          <AvailabilityGridSkeleton viewMode={viewMode} />
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
                const revealed = revealedWeekDays.has(dayKey);

                return (
                  <div key={day.toISOString()} className="flex min-w-0 flex-col">
                    <div className="sticky top-0 z-10 border-b border-border bg-paper px-2 py-2 text-center text-xs font-medium text-ink">
                      {formatLocalDayLabel(day, timeZone)}
                    </div>
                    {revealed ? (
                      <BookableOverlay
                        calendarId={calendarId}
                        slots={daySlots}
                        rangeStart={dayStart}
                        timeZone={timeZone}
                        compact
                      />
                    ) : (
                      <div className="flex flex-1 flex-col gap-2 p-2">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    )}
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
                  className="sticky top-0 z-30 flex items-center justify-center border-b border-border bg-paper text-center text-xs font-medium text-ink-muted"
                  style={{ height: `${GRID_COLUMN_HEADER_HEIGHT_PX}px` }}
                >
                  Time
                </div>
                <div
                  className="relative"
                  style={{ height: `${GRID_TOTAL_MINUTES}px` }}
                >
                  <GridHourLines />
                  {nowPercent !== null && nowPercent !== undefined ? (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-primary"
                      style={{ top: `${nowPercent}%` }}
                      aria-hidden
                    />
                  ) : null}
                  {gridHourLabels().map((label, index) => (
                    <div
                      key={label}
                      className="absolute right-2 z-10 -translate-y-1/2 text-[10px] text-ink-muted"
                      style={{
                        top: `${(index / (gridHourLabels().length - 1)) * 100}%`,
                      }}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative flex min-w-0 flex-1">
                {nowPercent !== null && nowPercent !== undefined ? (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-30 border-t-2 border-primary"
                    style={{
                      top: `calc(${GRID_COLUMN_HEADER_HEIGHT_PX}px + ${GRID_TOTAL_MINUTES}px * ${nowPercent} / 100)`,
                    }}
                    data-testid="today-now-line"
                    aria-hidden
                  />
                ) : null}

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
                  calendarId={calendarId}
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
        <AlertBanner variant="info" className="shrink-0" data-testid="no-bookable-hint">
          No pooled bookable slots in this range. Check booking window (
          {bundle.bookingWindowDays} days), working hours, duration (
          {durationMinutes}m), and member caps. Times use {timeZone}.
        </AlertBanner>
      ) : null}
    </div>
  );
}
