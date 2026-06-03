"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookingCalendar } from "@/components/booking/booking-calendar";
import { BookingStepper } from "@/components/booking/booking-stepper";
import { BookingSuccessPanel } from "@/components/booking/booking-success";
import {
  countSlotsByDate,
  getMonthBounds,
  groupSlotsByDate,
  intersectRange,
} from "@/components/booking/group-slots-by-date";
import {
  InviteeForm,
  parseInviteeLines,
} from "@/components/booking/invitee-form";
import { SlotPicker } from "@/components/booking/slot-picker";
import {
  defaultViewerTimezone,
  TimezoneSelector,
} from "@/components/booking/timezone-selector";
import type {
  BookingFlowProps,
  BookingWizardStep,
  DateKey,
  MonthSlotsCacheKey,
} from "@/components/booking/types";
import { Button, DurationChipGroup } from "@/components/ui";
import type { BookingStepId } from "@/components/ui/stepper";
import type { ConfirmBookingBody, PublicMeeting, Slot } from "@/lib/types";

function monthCacheKey(
  year: number,
  month: number,
  durationMinutes: number,
  timezone: string,
): MonthSlotsCacheKey {
  return `${year}-${month}|${durationMinutes}|${timezone}`;
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

function monthFetchIsoRange(
  year: number,
  month: number,
  minDate: Date,
  maxDate: Date,
): { from: string; to: string } | null {
  const { start: monthStart, end: monthEnd } = getMonthBounds(year, month);
  const intersected = intersectRange(monthStart, monthEnd, minDate, maxDate);
  if (!intersected) {
    return null;
  }
  return {
    from: intersected.start.toISOString(),
    to: intersected.end.toISOString(),
  };
}

function initialVisibleMonth(minDate: Date, timezone: string): {
  year: number;
  month: number;
} {
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
}

function stepperStep(step: BookingWizardStep): BookingStepId | null {
  if (step === "done") return null;
  return step;
}

function stepTitle(
  step: BookingWizardStep,
  selectedDate: DateKey | null,
  viewerTimezone: string,
): string {
  switch (step) {
    case "duration":
      return "Choose duration";
    case "date":
      return "Pick a date";
    case "time":
      if (selectedDate) {
        const dateLabel = new Intl.DateTimeFormat(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
          timeZone: viewerTimezone,
        }).format(new Date(`${selectedDate}T12:00:00Z`));
        return `Pick a time · ${dateLabel}`;
      }
      return "Pick a time";
    case "details":
      return "Meeting details";
    default:
      return "";
  }
}

const PREVIOUS_STEP: Partial<Record<BookingWizardStep, BookingWizardStep>> = {
  date: "duration",
  time: "date",
  details: "time",
};

export function BookingFlow({
  calendarName,
  durations,
  bookingWindowDays,
  slotsApiPath,
  confirmApiPath,
  isPublic = false,
  showPanelistCount = !isPublic,
  onConfirmed,
}: BookingFlowProps) {
  const [step, setStep] = useState<BookingWizardStep>("duration");
  const [durationMinutes, setDurationMinutes] = useState<number | null>(
    durations.length === 1 ? durations[0] : null,
  );
  const [viewerTimezone, setViewerTimezone] = useState(defaultViewerTimezone);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const { minDate } = computeBookingWindow(bookingWindowDays);
    return initialVisibleMonth(minDate, defaultViewerTimezone());
  });
  const [monthSlots, setMonthSlots] = useState<Slot[]>([]);
  const slotsCacheRef = useRef<Map<MonthSlotsCacheKey, Slot[]>>(new Map());
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<DateKey | null>(null);
  const [selectedStartsAt, setSelectedStartsAt] = useState<string | null>(null);
  const [invitees, setInvitees] = useState("");
  const [subject, setSubject] = useState(`Meeting with ${calendarName}`);
  const [body, setBody] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedMeeting, setConfirmedMeeting] = useState<PublicMeeting | null>(
    null,
  );

  const { minDate, maxDate } = useMemo(
    () => computeBookingWindow(bookingWindowDays),
    [bookingWindowDays],
  );

  const groupedMonthSlots = useMemo(
    () => groupSlotsByDate(monthSlots, viewerTimezone),
    [monthSlots, viewerTimezone],
  );

  const slotCountsByDate = useMemo(
    () => countSlotsByDate(groupedMonthSlots),
    [groupedMonthSlots],
  );

  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return groupedMonthSlots.get(selectedDate) ?? [];
  }, [groupedMonthSlots, selectedDate]);

  const loadMonthSlots = useCallback(async () => {
    if (!durationMinutes) return;

    const { year, month } = visibleMonth;
    const cacheKey = monthCacheKey(
      year,
      month,
      durationMinutes,
      viewerTimezone,
    );
    const cached = slotsCacheRef.current.get(cacheKey);
    if (cached) {
      setMonthSlots(cached);
      return;
    }

    const range = monthFetchIsoRange(year, month, minDate, maxDate);
    if (!range) {
      setMonthSlots([]);
      return;
    }

    setSlotsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        duration: String(durationMinutes),
        from: range.from,
        to: range.to,
        tz: viewerTimezone,
      });
      const res = await fetch(`${slotsApiPath}?${params}`);
      const data = (await res.json()) as { slots?: Slot[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load slots");
      }
      const slots = data.slots ?? [];
      slotsCacheRef.current.set(cacheKey, slots);
      setMonthSlots(slots);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load slots");
      setMonthSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [
    durationMinutes,
    visibleMonth,
    viewerTimezone,
    minDate,
    maxDate,
    slotsApiPath,
  ]);

  useEffect(() => {
    if (step === "date" && durationMinutes) {
      void loadMonthSlots();
    }
  }, [step, durationMinutes, loadMonthSlots]);

  function handleTimezoneChange(tz: string) {
    setViewerTimezone(tz);
    slotsCacheRef.current = new Map();
    setMonthSlots([]);
    setSelectedDate(null);
    setSelectedStartsAt(null);
    const window = computeBookingWindow(bookingWindowDays);
    setVisibleMonth(initialVisibleMonth(window.minDate, tz));
  }

  function handleStepClick(targetStep: BookingStepId) {
    setError(null);
    setStep(targetStep);
    if (targetStep === "duration" || targetStep === "date") {
      setSelectedStartsAt(null);
    }
    if (targetStep === "duration") {
      setSelectedDate(null);
    }
  }

  function handleBack() {
    const previous = PREVIOUS_STEP[step];
    if (previous) {
      setError(null);
      setStep(previous);
    }
  }

  function handleContinue() {
    switch (step) {
      case "duration":
        if (durationMinutes) {
          setVisibleMonth(initialVisibleMonth(minDate, viewerTimezone));
          setStep("date");
        }
        break;
      case "date":
        if (selectedDate) {
          setSelectedStartsAt(null);
          setStep("time");
        }
        break;
      case "time":
        if (selectedStartsAt) {
          setStep("details");
        }
        break;
      case "details":
        void handleConfirm();
        break;
    }
  }

  async function handleConfirm() {
    if (!durationMinutes || !selectedStartsAt) {
      return;
    }

    const inviteeList = parseInviteeLines(invitees);
    const payload: ConfirmBookingBody = {
      startsAt: selectedStartsAt,
      durationMinutes,
      subject: subject.trim(),
      body: body.trim(),
      invitees: inviteeList,
      viewerTimezone,
      ...(isPublic && guestEmail.trim()
        ? { guestEmail: guestEmail.trim() }
        : {}),
    };

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(confirmApiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        meeting?: PublicMeeting;
        error?: string;
      };

      if (res.status === 409) {
        setStep("time");
        setSelectedStartsAt(null);
        slotsCacheRef.current = new Map();
        await loadMonthSlots();
        setError("That time was just taken. Please pick another slot.");
        return;
      }

      if (!res.ok) {
        throw new Error(data.error ?? "Booking failed");
      }

      if (data.meeting) {
        setConfirmedMeeting(data.meeting);
        onConfirmed?.(data.meeting);
        setStep("done");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  }

  const currentStepperStep = stepperStep(step);
  const canContinue =
    (step === "duration" && durationMinutes !== null) ||
    (step === "date" && selectedDate !== null) ||
    (step === "time" && selectedStartsAt !== null) ||
    (step === "details" && subject.trim().length > 0 && !submitting);

  if (step === "done" && confirmedMeeting) {
    return (
      <BookingSuccessPanel
        meeting={confirmedMeeting}
        viewerTimezone={viewerTimezone}
        calendarName={calendarName}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-10">
      {currentStepperStep ? (
        <aside className="md:sticky md:top-4 md:w-44 md:shrink-0 lg:w-52">
          <BookingStepper
            currentStep={currentStepperStep}
            onStepClick={handleStepClick}
          />
        </aside>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {error ? (
          <div className="mb-4 rounded-lg border border-primary/30 bg-primary-soft px-4 py-3 text-sm text-primary">
            {error}
          </div>
        ) : null}

        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="min-w-0 font-display text-lg font-medium text-ink">
            {stepTitle(step, selectedDate, viewerTimezone)}
          </h2>
          <TimezoneSelector
            value={viewerTimezone}
            onChange={handleTimezoneChange}
          />
        </div>

        <div key={step} className="flex-1 animate-step-in pb-4">
          {step === "duration" ? (
            <DurationChipGroup
              values={durations}
              selected={durationMinutes ?? -1}
              onChange={(value) => {
                if (typeof value === "number" && value >= 0) {
                  setDurationMinutes(value);
                }
              }}
            />
          ) : null}

          {step === "date" ? (
            <BookingCalendar
              visibleMonth={visibleMonth}
              onMonthChange={(year, month) => setVisibleMonth({ year, month })}
              slotCountsByDate={slotCountsByDate}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              minDate={minDate}
              maxDate={maxDate}
              loading={slotsLoading}
              viewerTimezone={viewerTimezone}
            />
          ) : null}

          {step === "time" ? (
            <SlotPicker
              slots={slotsForSelectedDate}
              selectedStartsAt={selectedStartsAt}
              onSelect={setSelectedStartsAt}
              loading={slotsLoading}
              viewerTimezone={viewerTimezone}
              showPanelistCount={showPanelistCount}
            />
          ) : null}

          {step === "details" ? (
            <InviteeForm
              invitees={invitees}
              subject={subject}
              body={body}
              guestEmail={guestEmail}
              showGuestEmail={isPublic}
              onInviteesChange={setInvitees}
              onSubjectChange={setSubject}
              onBodyChange={setBody}
              onGuestEmailChange={setGuestEmail}
            />
          ) : null}
        </div>

        <footer className="sticky bottom-0 -mx-[var(--page-px)] border-t border-border bg-paper/95 px-[var(--page-px)] py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-paper/80">
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              disabled={step === "duration"}
              onClick={handleBack}
            >
              Back
            </Button>
            <Button
              type="button"
              disabled={!canContinue}
              loading={step === "details" && submitting}
              onClick={handleContinue}
            >
              {step === "details" ? "Confirm booking" : "Continue"}
            </Button>
          </div>
          {isPublic && step === "details" ? (
            <p className="mt-2 text-center text-xs text-ink-muted">
              You&apos;ll receive a calendar invite with Google Meet.
            </p>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
