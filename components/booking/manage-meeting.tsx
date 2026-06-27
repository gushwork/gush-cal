"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SlotPicker } from "@/components/booking/slot-picker";
import {
  countSlotsByDate,
  getMonthBounds,
  groupSlotsByDate,
  intersectRange,
} from "@/components/booking/group-slots-by-date";
import { BookingDatePanel } from "@/components/booking/steps/booking-date-panel";
import {
  defaultViewerTimezone,
  TimezoneSelector,
} from "@/components/booking/timezone-selector";
import type { DateKey } from "@/components/booking/types";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import type { PublicMeeting, Slot } from "@/lib/types";

export type ManageMeetingData = {
  meeting: PublicMeeting & {
    memberName: string;
    cancelled: boolean;
  };
  calendar: {
    name: string;
    durations: number[];
    bookingWindowDays: number;
    minNoticeHours: number;
  };
};

type ManageMeetingProps = {
  token: string;
  initial: ManageMeetingData;
};

function formatMeetingWhen(
  startsAt: string,
  durationMinutes: number,
  timezone: string,
): string {
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const dateFmt = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: timezone,
  });
  const timeFmt = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  });
  return `${dateFmt.format(start)} · ${timeFmt.format(start)} – ${timeFmt.format(end)}`;
}

function computeBookingWindow(bookingWindowDays: number): {
  minDate: Date;
  maxDate: Date;
} {
  const minDate = new Date();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + bookingWindowDays);
  return { minDate, maxDate };
}

export function ManageMeeting({ token, initial }: ManageMeetingProps) {
  const [data, setData] = useState(initial);
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [timezone, setTimezone] = useState(defaultViewerTimezone);
  const [durationMinutes, setDurationMinutes] = useState(
    initial.meeting.durationMinutes,
  );
  const [selectedDate, setSelectedDate] = useState<DateKey | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { minDate, maxDate } = useMemo(
    () => computeBookingWindow(data.calendar.bookingWindowDays),
    [data.calendar.bookingWindowDays],
  );

  const visibleMonth = useMemo(() => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "numeric",
    })
      .formatToParts(minDate)
      .reduce(
        (acc, p) => {
          if (p.type === "year") acc.year = Number(p.value);
          if (p.type === "month") acc.month = Number(p.value);
          return acc;
        },
        { year: 0, month: 1 },
      );
    return parts;
  }, [minDate, timezone]);

  const [year, setYear] = useState(visibleMonth.year);
  const [month, setMonth] = useState(visibleMonth.month);
  const visibleMonthState = useMemo(
    () => ({ year, month }),
    [year, month],
  );

  const fetchSlots = useCallback(async () => {
    const { start: monthStart, end: monthEnd } = getMonthBounds(year, month);
    const range = intersectRange(monthStart, monthEnd, minDate, maxDate);
    if (!range) {
      setSlots([]);
      return;
    }

    setSlotsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        duration: String(durationMinutes),
        from: range.start.toISOString(),
        to: range.end.toISOString(),
        tz: timezone,
      });
      const res = await fetch(`/api/manage/${token}/slots?${params}`);
      if (!res.ok) {
        throw new Error("Could not load available times");
      }
      const json = (await res.json()) as { slots: Slot[] };
      setSlots(json.slots);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load times");
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [durationMinutes, maxDate, minDate, month, timezone, token, year]);

  useEffect(() => {
    if (mode === "reschedule") {
      void fetchSlots();
    }
  }, [fetchSlots, mode]);

  const grouped = useMemo(() => groupSlotsByDate(slots, timezone), [slots, timezone]);
  const countsByDate = useMemo(() => countSlotsByDate(grouped), [grouped]);
  const daySlots = selectedDate ? (grouped.get(selectedDate) ?? []) : [];

  async function handleCancel() {
    if (!window.confirm("Cancel this meeting? This cannot be undone.")) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/manage/${token}/cancel`, { method: "POST" });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? "Could not cancel meeting");
      }
      setData((prev) => ({
        ...prev,
        meeting: { ...prev.meeting, cancelled: true },
      }));
      setMode("view");
      toast("Meeting cancelled", { variant: "success" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Cancel failed";
      setError(message);
      toast(message, { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReschedule() {
    if (!selectedSlot) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/manage/${token}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsAt: selectedSlot,
          durationMinutes,
          viewerTimezone: timezone,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        message?: string;
        meeting?: PublicMeeting;
        manageUrl?: string;
      };
      if (!res.ok) {
        throw new Error(json.message ?? json.error ?? "Could not reschedule");
      }
      if (json.meeting) {
        setData((prev) => ({
          ...prev,
          meeting: {
            ...prev.meeting,
            ...json.meeting!,
            memberName: prev.meeting.memberName,
            cancelled: false,
          },
        }));
      }
      setMode("view");
      setSelectedDate(null);
      setSelectedSlot(null);
      toast("Meeting rescheduled", { variant: "success" });
      if (json.manageUrl && json.manageUrl !== `/manage/${token}`) {
        window.location.href = json.manageUrl;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Reschedule failed";
      setError(message);
      toast(message, { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  if (data.meeting.cancelled) {
    return (
      <div className="rounded-xl border border-neutral-100 bg-white p-8 shadow-s3">
        <h1 className="font-grotesk text-2xl font-semibold text-neutral-900">
          Meeting cancelled
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          This meeting has been cancelled. No further action is needed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-100 bg-white p-8 shadow-s3">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {data.calendar.name}
        </p>
        <h1 className="mt-1 font-grotesk text-2xl font-semibold text-neutral-900">
          {data.meeting.subject}
        </h1>
        <p className="mt-3 text-sm text-neutral-600">
          {formatMeetingWhen(
            data.meeting.startsAt,
            data.meeting.durationMinutes,
            timezone,
          )}
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          with {data.meeting.memberName}
        </p>
        {data.meeting.meetLink ? (
          <a
            href={data.meeting.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Join video call
          </a>
        ) : null}
      </div>

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      {mode === "view" ? (
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => setMode("reschedule")}>
            Reschedule
          </Button>
          <Button type="button" variant="secondary" onClick={() => void handleCancel()}
            disabled={submitting}
          >
            Cancel meeting
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-100 bg-white shadow-s3">
          <div className="border-b border-neutral-100 px-6 py-4">
            <h2 className="font-grotesk text-lg font-semibold text-neutral-900">
              Pick a new time
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <TimezoneSelector value={timezone} onChange={setTimezone} />
              {data.calendar.durations.length > 1 ? (
                <div className="flex gap-2">
                  {data.calendar.durations.map((d) => (
                    <Button
                      key={d}
                      type="button"
                      size="sm"
                      variant={durationMinutes === d ? "primary" : "secondary"}
                      onClick={() => {
                        setDurationMinutes(d);
                        setSelectedSlot(null);
                      }}
                    >
                      {d} min
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid min-h-[320px] md:grid-cols-2">
            <div className="border-b border-neutral-100 p-4 md:border-b-0 md:border-r">
              {slotsLoading && slots.length === 0 ? (
                <Skeleton className="h-64 w-full rounded-lg" />
              ) : (
                <BookingDatePanel
                  visibleMonth={visibleMonthState}
                  onMonthChange={(y, m) => {
                    setYear(y);
                    setMonth(m);
                  }}
                  slotCountsByDate={countsByDate}
                  selectedDate={selectedDate}
                  onSelectDate={(date) => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                  }}
                  minDate={minDate}
                  maxDate={maxDate}
                  slotsLoading={slotsLoading}
                  viewerTimezone={timezone}
                  onContinue={() => {}}
                />
              )}
            </div>
            <div className="p-4">
              {selectedDate ? (
                <SlotPicker
                  slots={daySlots}
                  selectedStartsAt={selectedSlot}
                  onSelect={setSelectedSlot}
                  loading={slotsLoading}
                  viewerTimezone={timezone}
                  showMemberCount={false}
                  onBackToDate={() => setSelectedDate(null)}
                />
              ) : (
                <p className="text-sm text-neutral-500">
                  Select a date to see available times.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-neutral-100 px-6 py-4">
            <Button
              type="button"
              disabled={!selectedSlot || submitting}
              onClick={() => void handleReschedule()}
            >
              Confirm new time
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setMode("view");
                setSelectedDate(null);
                setSelectedSlot(null);
                setError(null);
              }}
            >
              Back
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
