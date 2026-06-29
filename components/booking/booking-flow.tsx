"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookingStepper } from "@/components/booking/booking-stepper";
import { BookingSuccessPanel } from "@/components/booking/booking-success";
import { DuplicatePrompt } from "@/components/booking/duplicate-prompt";
import {
  countSlotsByDate,
  getMonthBounds,
  groupSlotsByDate,
  intersectRange,
} from "@/components/booking/group-slots-by-date";
import { parseInviteeLines } from "@/components/booking/invitee-form";
import {
  findSlotForDeepLink,
  monthFromDateKey,
  parseBookingDeepLink,
} from "@/components/booking/parse-booking-deep-link";
import { BookingDatePanel } from "@/components/booking/steps/booking-date-panel";
import { BookingDetailsPanel } from "@/components/booking/steps/booking-details-panel";
import { BookingDurationPanel } from "@/components/booking/steps/booking-duration-panel";
import { SlotPicker } from "@/components/booking/slot-picker";
import { TeamPicker, type TeamOption } from "@/components/booking/team-picker";
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
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import type { BookingStepId } from "@/components/ui/stepper";
import type { ConfirmBookingBody, PublicMeeting, Slot } from "@/lib/types";
import { parseBookingUrlContext } from "@/lib/routing/parse-request-path";

function slugFromApiPath(apiPath: string): string | null {
  const match = apiPath.match(/\/api\/book\/([^/]+)\//);
  return match?.[1] ?? null;
}

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

function timezoneAbbreviation(timezone: string): string {
  try {
    const part = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName");
    return part?.value ?? timezone;
  } catch {
    return timezone;
  }
}

function stepTitle(
  step: BookingWizardStep,
  selectedDate: DateKey | null,
  viewerTimezone: string,
): string {
  switch (step) {
    case "duration":
      return "Duration";
    case "date":
      return "Date";
    case "time": {
      const abbr = timezoneAbbreviation(viewerTimezone);
      if (selectedDate) {
        const dateLabel = new Intl.DateTimeFormat(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: viewerTimezone,
        }).format(new Date(`${selectedDate}T12:00:00Z`));
        return `Time · ${dateLabel} (${abbr})`;
      }
      return `Time (${abbr})`;
    }
    case "details":
      return "Details";
    default:
      return "";
  }
}

function stepAnnouncement(step: BookingWizardStep): string {
  switch (step) {
    case "duration":
      return "Duration step";
    case "date":
      return "Date step";
    case "time":
      return "Time step";
    case "details":
      return "Details step";
    case "done":
      return "Booking complete";
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
  calendarSlug: calendarSlugProp,
  onConfirmed,
}: BookingFlowProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const calendarSlug =
    calendarSlugProp ?? slugFromApiPath(slotsApiPath) ?? slugFromApiPath(confirmApiPath);
  const urlContext = useMemo(() => {
    if (!calendarSlug) {
      return null;
    }
    return parseBookingUrlContext(calendarSlug, pathname, searchParams);
  }, [calendarSlug, pathname, searchParams]);
  const deepLink = useMemo(
    () => parseBookingDeepLink(searchParams, durations),
    [searchParams, durations],
  );
  const skipDurationStep = durations.length === 1;
  const [step, setStep] = useState<BookingWizardStep>(
    skipDurationStep ? "date" : "duration",
  );
  const [durationMinutes, setDurationMinutes] = useState<number | null>(() => {
    if (skipDurationStep) {
      return durations[0] ?? null;
    }
    return deepLink?.durationMinutes ?? null;
  });
  const [viewerTimezone, setViewerTimezone] = useState(defaultViewerTimezone);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const { minDate } = computeBookingWindow(bookingWindowDays);
    const tz = defaultViewerTimezone();
    if (deepLink?.date) {
      return monthFromDateKey(deepLink.date);
    }
    return initialVisibleMonth(minDate, tz);
  });
  const [deepLinkResolving, setDeepLinkResolving] = useState(() => {
    if (!deepLink) {
      return false;
    }
    return skipDurationStep || deepLink.durationMinutes != null;
  });
  const deepLinkAttemptedRef = useRef(false);
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
  const [metadataTeams, setMetadataTeams] = useState<TeamOption[]>([]);
  const [teamSelectionMode, setTeamSelectionMode] = useState<string | null>(
    null,
  );
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [memberIdForBooking, setMemberIdForBooking] = useState<string | null>(
    null,
  );
  const [teamPickerResolved, setTeamPickerResolved] = useState(!isPublic);
  const [metadataLoading, setMetadataLoading] = useState(isPublic);
  const [duplicatePrompt, setDuplicatePrompt] = useState<{
    manageUrl: string;
    meeting: PublicMeeting;
    redirectUrl?: string;
  } | null>(null);

  const teamIdForBooking = useMemo(() => {
    if (urlContext?.teamSlug && metadataTeams.length > 0) {
      const fromUrl = metadataTeams.find((team) => team.slug === urlContext.teamSlug);
      if (fromUrl) {
        return fromUrl.id;
      }
    }
    return selectedTeamId;
  }, [metadataTeams, selectedTeamId, urlContext?.teamSlug]);

  const needsTeamPicker =
    isPublic &&
    metadataTeams.length > 1 &&
    teamSelectionMode === "url_only" &&
    !urlContext?.teamSlug &&
    !teamIdForBooking;

  useEffect(() => {
    if (!isPublic || !calendarSlug) {
      setMetadataLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setMetadataLoading(true);
      try {
        const metaRes = await fetch(`/api/book/${calendarSlug}`);
        const meta = (await metaRes.json()) as {
          teams?: TeamOption[];
          settings?: { teamSelectionMode?: string };
        };
        if (!cancelled) {
          setMetadataTeams(meta.teams ?? []);
          setTeamSelectionMode(meta.settings?.teamSelectionMode ?? null);
        }
      } catch {
        if (!cancelled) {
          setMetadataTeams([]);
        }
      } finally {
        if (!cancelled) {
          setMetadataLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [calendarSlug, isPublic]);

  useEffect(() => {
    if (!needsTeamPicker && !metadataLoading) {
      setTeamPickerResolved(true);
    }
  }, [needsTeamPicker, metadataLoading]);

  // BUG-037: member-mode deep links (/book/:slug/m/<member>) must scope slots and
  // booking to that member. Resolve the slug → memberId via the resolve route.
  useEffect(() => {
    const memberSlug = urlContext?.memberSlug;
    if (!isPublic || !calendarSlug || !memberSlug) {
      setMemberIdForBooking(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/book/${calendarSlug}/resolve?memberSlug=${encodeURIComponent(memberSlug)}`,
        );
        const data = (await res.json()) as {
          target?: { memberId?: string };
        };
        if (!cancelled) {
          setMemberIdForBooking(data.target?.memberId ?? null);
        }
      } catch {
        if (!cancelled) {
          setMemberIdForBooking(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [calendarSlug, isPublic, urlContext?.memberSlug]);

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
      if (teamIdForBooking) {
        params.set("teamId", teamIdForBooking);
      }
      if (memberIdForBooking) {
        params.set("memberId", memberIdForBooking);
      }
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
    teamIdForBooking,
    memberIdForBooking,
  ]);

  useEffect(() => {
    if (skipDurationStep && step === "duration") {
      setDurationMinutes(durations[0]);
      setStep("date");
    }
  }, [skipDurationStep, step, durations]);

  useEffect(() => {
    if (step === "date" && durationMinutes) {
      void loadMonthSlots();
    }
  }, [step, durationMinutes, loadMonthSlots]);

  useEffect(() => {
    const link = deepLink;
    if (!link || deepLinkAttemptedRef.current || !durationMinutes) {
      if (!link) {
        setDeepLinkResolving(false);
      }
      return;
    }

    deepLinkAttemptedRef.current = true;
    let cancelled = false;

    (async () => {
      setDeepLinkResolving(true);
      setError(null);
      setSelectedDate(link.date);
      const { year, month } = monthFromDateKey(link.date);
      setVisibleMonth({ year, month });

      const range = monthFetchIsoRange(year, month, minDate, maxDate);
      if (!range) {
        if (!cancelled) {
          setStep("date");
          setError("That date is outside the booking window.");
          setDeepLinkResolving(false);
        }
        return;
      }

      try {
        const params = new URLSearchParams({
          duration: String(durationMinutes),
          from: range.from,
          to: range.to,
          tz: viewerTimezone,
        });
        if (teamIdForBooking) {
          params.set("teamId", teamIdForBooking);
        }
        if (memberIdForBooking) {
          params.set("memberId", memberIdForBooking);
        }
        const res = await fetch(`${slotsApiPath}?${params}`);
        const data = (await res.json()) as { slots?: Slot[]; error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load slots");
        }

        const slots = data.slots ?? [];
        const cacheKey = monthCacheKey(
          year,
          month,
          durationMinutes,
          viewerTimezone,
        );
        slotsCacheRef.current.set(cacheKey, slots);
        setMonthSlots(slots);

        const match = findSlotForDeepLink(slots, link, viewerTimezone);
        if (cancelled) {
          return;
        }

        if (match) {
          setSelectedStartsAt(match.startsAt);
          setStep("details");
        } else {
          setSelectedStartsAt(null);
          setStep("time");
          setError("That time is no longer available. Choose another slot.");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load slots");
          setStep("date");
        }
      } finally {
        if (!cancelled) {
          setDeepLinkResolving(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    deepLink,
    durationMinutes,
    viewerTimezone,
    slotsApiPath,
    minDate,
    maxDate,
    teamIdForBooking,
    memberIdForBooking,
  ]);

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
      if (skipDurationStep && previous === "duration") {
        return;
      }
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

  async function completeBookingSuccess(
    meeting: PublicMeeting,
    options?: {
      duplicateWarning?: { manageUrl: string };
      redirectUrl?: string;
    },
  ) {
    if (options?.duplicateWarning) {
      setDuplicatePrompt({
        manageUrl: options.duplicateWarning.manageUrl,
        meeting,
        redirectUrl: options.redirectUrl,
      });
      return;
    }

    if (options?.redirectUrl) {
      window.location.href = options.redirectUrl;
      return;
    }

    setConfirmedMeeting(meeting);
    onConfirmed?.(meeting);
    setStep("done");
  }

  async function handleConfirm(forceDuplicate = false) {
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
      ...(teamIdForBooking ? { teamId: teamIdForBooking } : {}),
      ...(memberIdForBooking ? { memberId: memberIdForBooking } : {}),
      ...(forceDuplicate ? { forceDuplicate: true } : {}),
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
        message?: string;
        manageUrl?: string;
        duplicateWarning?: { existingMeetingId: string; manageUrl: string };
        redirectUrl?: string;
      };

      if (data.error === "DUPLICATE_MEETING") {
        setError(
          data.manageUrl
            ? "You already have a meeting. Use the manage link in your email or pick another time."
            : "You already have a meeting scheduled with this email.",
        );
        return;
      }

      if (res.status === 409) {
        setStep("time");
        setSelectedStartsAt(null);
        slotsCacheRef.current = new Map();
        await loadMonthSlots();
        const message = "That time was just taken. Please pick another slot.";
        toast(message, { variant: "error" });
        setError(message);
        return;
      }

      if (data.error === "MIN_NOTICE_VIOLATION") {
        setStep("time");
        setSelectedStartsAt(null);
        slotsCacheRef.current = new Map();
        await loadMonthSlots();
        const message =
          data.message ??
          "This time is too soon. Pick a slot further in the future.";
        toast(message, { variant: "error" });
        setError(message);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error ?? "Booking failed");
      }

      if (data.meeting) {
        await completeBookingSuccess(data.meeting, {
          duplicateWarning: data.duplicateWarning,
          redirectUrl: data.redirectUrl,
        });
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
    (step === "details" &&
      subject.trim().length > 0 &&
      !submitting &&
      (!isPublic || guestEmail.trim().length > 0));

  const showBack = step !== "duration" && !(skipDurationStep && step === "date");

  if (duplicatePrompt) {
    return (
      <DuplicatePrompt
        manageUrl={duplicatePrompt.manageUrl}
        loading={submitting}
        onCancel={() => {
          setDuplicatePrompt(null);
          setStep("time");
          setSelectedStartsAt(null);
        }}
        onContinue={() => {
          void (async () => {
            const pending = duplicatePrompt;
            setDuplicatePrompt(null);
            await handleConfirm(true);
            if (pending?.redirectUrl) {
              window.location.href = pending.redirectUrl;
            }
          })();
        }}
      />
    );
  }

  if (metadataLoading || (needsTeamPicker && !teamPickerResolved)) {
    if (needsTeamPicker && !metadataLoading) {
      return (
        <div className="rounded-xl border border-neutral-100 bg-white p-4 shadow-s3">
          <h2 className="mb-4 font-grotesk text-lg font-medium text-neutral-900">
            Choose a team
          </h2>
          <TeamPicker
            teams={metadataTeams}
            selectedTeamId={selectedTeamId}
            onSelect={setSelectedTeamId}
          />
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              disabled={!selectedTeamId}
              onClick={() => setTeamPickerResolved(true)}
            >
              Continue
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div
        className="flex flex-col gap-4 py-12"
        data-testid="booking-metadata-loading"
        aria-busy
      >
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full max-w-lg" />
      </div>
    );
  }

  if (step === "done" && confirmedMeeting) {
    return (
      <BookingSuccessPanel
        meeting={confirmedMeeting}
        viewerTimezone={viewerTimezone}
        calendarName={calendarName}
      />
    );
  }

  if (deepLinkResolving) {
    return (
      <div
        className="flex flex-col gap-4 py-12"
        data-testid="booking-deep-link-loading"
        aria-busy
        aria-label="Loading selected time slot"
      >
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full max-w-lg" />
        <Skeleton className="h-10 w-32" />
      </div>
    );
  }

  const noopContinue = () => {};

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-10">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {stepAnnouncement(step)}
      </div>

      {currentStepperStep ? (
        <aside className="md:sticky md:top-4 md:w-44 md:shrink-0 lg:w-52">
          <BookingStepper
            currentStep={currentStepperStep}
            onStepClick={handleStepClick}
          />
        </aside>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:max-w-3xl">
        {error ? (
          <AlertBanner variant="error" className="mb-4">
            {error}
          </AlertBanner>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-s3">
          <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
            <h2 className="min-w-0 font-grotesk text-lg font-medium text-neutral-900">
              {stepTitle(step, selectedDate, viewerTimezone)}
            </h2>
            <TimezoneSelector
              value={viewerTimezone}
              onChange={handleTimezoneChange}
            />
          </div>

          <div key={step} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="animate-step-in">
              {step === "duration" ? (
                <BookingDurationPanel
                  durations={durations}
                  selectedMinutes={durationMinutes}
                  onSelectMinutes={setDurationMinutes}
                  onContinue={noopContinue}
                />
              ) : null}

              {step === "date" && durationMinutes ? (
                <BookingDatePanel
                  visibleMonth={visibleMonth}
                  onMonthChange={(year, month) =>
                    setVisibleMonth({ year, month })
                  }
                  slotCountsByDate={slotCountsByDate}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  minDate={minDate}
                  maxDate={maxDate}
                  slotsLoading={slotsLoading}
                  viewerTimezone={viewerTimezone}
                  onContinue={noopContinue}
                />
              ) : null}

              {step === "time" ? (
                <SlotPicker
                  slots={slotsForSelectedDate}
                  selectedStartsAt={selectedStartsAt}
                  onSelect={setSelectedStartsAt}
                  loading={slotsLoading}
                  viewerTimezone={viewerTimezone}
                  showMemberCount={showPanelistCount}
                  onBackToDate={() => handleStepClick("date")}
                />
              ) : null}

              {step === "details" &&
              selectedDate &&
              selectedStartsAt &&
              durationMinutes ? (
                <BookingDetailsPanel
                  calendarName={calendarName}
                  dateKey={selectedDate}
                  startsAt={selectedStartsAt}
                  durationMinutes={durationMinutes}
                  viewerTimezone={viewerTimezone}
                  invitees={invitees}
                  subject={subject}
                  body={body}
                  guestEmail={guestEmail}
                  showGuestEmail={isPublic}
                  onInviteesChange={setInvitees}
                  onSubjectChange={setSubject}
                  onBodyChange={setBody}
                  onGuestEmailChange={setGuestEmail}
                  loading={submitting}
                  onContinue={noopContinue}
                />
              ) : null}
            </div>
          </div>

          <footer className="sticky bottom-0 shrink-0 border-t border-neutral-100 bg-neutral-25 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={!showBack}
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
              <p className="mt-2 text-center text-xs text-neutral-500">
                You&apos;ll receive a calendar invite with Google Meet.
              </p>
            ) : null}
          </footer>
        </div>
      </div>
    </div>
  );
}
