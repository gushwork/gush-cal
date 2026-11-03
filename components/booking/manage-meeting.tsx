"use client";

import { useRouter } from "next/navigation";
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
import { PageHeader } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { PublicMeeting, Slot } from "@/lib/types";
import { CalendarX2, CheckCircle2 } from "lucide-react";

/** Which step the guest lands on: overview, time picker, or cancel confirmation. */
export type ManageMode = "view" | "reschedule" | "cancel";

const HEADERS: Record<ManageMode, { title: string; subtitle: string }> = {
  view: { title: "Manage your meeting", subtitle: "Reschedule or cancel your booking." },
  reschedule: {
    title: "Reschedule your meeting",
    subtitle: "Pick a new time. Everyone on the invite gets an updated calendar invite.",
  },
  cancel: {
    title: "Cancel your meeting",
    subtitle: "We'll remove it from everyone's calendar and let them know.",
  },
};

/** Mirrors MAX_CANCELLATION_REASON_LENGTH on the server. */
const MAX_REASON_LENGTH = 500;

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
  /** Mode from the URL: `/manage/{t}`, `/manage/{t}/reschedule`, `/manage/{t}/cancel`. */
  initialMode?: ManageMode;
  /** Shown after the redirect that follows a successful reschedule. */
  notice?: "rescheduled";
  /** Public booking page, offered after a cancellation. */
  rebookUrl?: string;
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

export function ManageMeeting({
  token,
  initial,
  initialMode = "view",
  notice,
  rebookUrl,
}: ManageMeetingProps) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [mode, setMode] = useState<ManageMode>(initialMode);
  const [reason, setReason] = useState("");
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
  const [rescheduled, setRescheduled] = useState(notice === "rescheduled");
  // Rendered client-only (<ClientOnly>), so reading the clock once is safe.
  const [openedAt] = useState(() => Date.now());

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
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/manage/${token}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || null }),
      });
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
      setRescheduled(true);
      toast("Meeting rescheduled", { variant: "success" });
      // Old links are revoked on reschedule; move to the new token's page so
      // a refresh (or bookmark) keeps working.
      if (json.manageUrl && !json.manageUrl.endsWith(`/manage/${token}`)) {
        const next = new URL(json.manageUrl, window.location.origin);
        router.replace(`${next.pathname}?rescheduled=1`);
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
      <>
        <PageHeader title="Meeting cancelled" />
        <div
          className="animate-fade-up flex gap-4 rounded-xl border border-neutral-100 bg-white p-8 shadow-s3"
          role="status"
        >
          <CalendarX2 className="h-6 w-6 shrink-0 text-neutral-500" aria-hidden />
          <div>
            <p className="font-medium text-neutral-900">
              {data.meeting.subject} with {data.meeting.memberName}
            </p>
            <p className="mt-1 text-sm text-neutral-600">
              This meeting is cancelled. Everyone on the invite was notified and
              the event was removed from their calendars.
            </p>
            {rebookUrl ? (
              <div className="mt-6">
                <Button asChild variant="secondary">
                  <a href={rebookUrl}>Book a new time</a>
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </>
    );
  }

  const isPast = new Date(data.meeting.startsAt).getTime() <= openedAt;

  const header = HEADERS[mode];

  return (
    <div className="space-y-6">
      <PageHeader title={header.title} subtitle={header.subtitle} className="mb-0" />
      {rescheduled ? (
        <AlertBanner variant="success">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            You&apos;re rescheduled. An updated calendar invite is on its way,
            with new reschedule and cancel links.
          </span>
        </AlertBanner>
      ) : null}
      <div className="rounded-xl border border-neutral-100 bg-white p-8 shadow-s3">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {data.calendar.name}
        </p>
        <h2 className="mt-1 font-grotesk text-2xl font-semibold text-neutral-900">
          {data.meeting.subject}
        </h2>
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

      {isPast ? (
        <p className="text-sm text-neutral-500">
          This meeting has already started, so it can no longer be rescheduled
          or cancelled online. Contact the organizer if something changed.
        </p>
      ) : mode === "view" ? (
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => setMode("reschedule")}>
            Reschedule
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setError(null);
              setMode("cancel");
            }}
          >
            Cancel meeting
          </Button>
        </div>
      ) : mode === "cancel" ? (
        <form
          className="animate-fade-up rounded-xl border border-neutral-100 bg-white shadow-s3"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCancel();
          }}
        >
          <div className="border-b border-neutral-100 px-6 py-4">
            <h2 className="font-grotesk text-lg font-semibold text-neutral-900">
              Cancel this meeting?
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              It will be removed from everyone&apos;s calendar and{" "}
              {data.meeting.memberName} will be notified. This can&apos;t be
              undone, but you can always book a new time.
            </p>
          </div>
          <div className="space-y-2 px-6 py-4">
            <label
              htmlFor="cancel-reason"
              className="block text-sm font-medium text-neutral-900"
            >
              Reason for cancelling{" "}
              <span className="font-normal text-neutral-500">(optional)</span>
            </label>
            <Textarea
              id="cancel-reason"
              value={reason}
              maxLength={MAX_REASON_LENGTH}
              rows={3}
              placeholder="Let the team know why, e.g. a conflict came up"
              onChange={(event) => setReason(event.target.value)}
            />
            <p className="numeric text-right text-xs text-neutral-500">
              {reason.length}/{MAX_REASON_LENGTH}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 border-t border-neutral-100 px-6 py-4">
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? "Cancelling…" : "Cancel meeting"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => {
                setMode("view");
                setError(null);
              }}
            >
              Keep meeting
            </Button>
            <Button
              type="button"
              variant="link"
              disabled={submitting}
              onClick={() => {
                setError(null);
                setMode("reschedule");
              }}
            >
              Reschedule instead
            </Button>
          </div>
        </form>
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
