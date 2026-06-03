import type { IanaTimezone, PublicMeeting } from "@/lib/types";

export type BookingSuccessPanelProps = {
  meeting: PublicMeeting;
  viewerTimezone: IanaTimezone;
  calendarName?: string;
};

function formatMeetingTime(startsAt: string, timezone: IanaTimezone): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(startsAt));
}

function googleCalendarUrl(meeting: PublicMeeting): string {
  const start = new Date(meeting.startsAt);
  const end = new Date(start.getTime() + meeting.durationMinutes * 60 * 1000);
  const format = (date: Date) =>
    `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: meeting.subject,
    dates: `${format(start)}/${format(end)}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function BookingSuccessPanel({
  meeting,
  viewerTimezone,
  calendarName,
}: BookingSuccessPanelProps) {
  return (
    <div
      className="animate-step-in rounded-xl bg-primary-soft px-6 py-8 sm:px-8"
      role="status"
    >
      <p className="text-sm font-medium uppercase tracking-wide text-primary">
        You&apos;re all set
      </p>
      <h2 className="mt-2 font-display text-2xl font-semibold text-ink">
        Meeting booked
      </h2>
      {calendarName ? (
        <p className="mt-1 text-sm text-ink-muted">with {calendarName}</p>
      ) : null}

      <div className="mt-6 space-y-2">
        <p className="text-lg font-medium text-ink">{meeting.subject}</p>
        <p className="text-sm text-ink-muted">
          {formatMeetingTime(meeting.startsAt, viewerTimezone)}
          <span className="text-ink-muted/80">
            {" "}
            · {meeting.durationMinutes} min
          </span>
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {meeting.meetLink ? (
          <a
            href={meeting.meetLink}
            className="interactive inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            target="_blank"
            rel="noreferrer"
          >
            Join Google Meet
          </a>
        ) : null}
        <a
          href={googleCalendarUrl(meeting)}
          className="interactive inline-flex items-center rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-primary hover:bg-paper"
          target="_blank"
          rel="noreferrer"
        >
          Add to Google Calendar
        </a>
      </div>
    </div>
  );
}
