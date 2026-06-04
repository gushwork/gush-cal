import Link from "next/link";
import { CheckCircle2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/ui/cn";
import type { IanaTimezone, PublicMeeting } from "@/lib/types";

export type BookingSuccessPanelProps = {
  meeting: PublicMeeting;
  viewerTimezone: IanaTimezone;
  calendarName?: string;
  bookAnotherHref?: string;
  meetingsHref?: string;
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
  bookAnotherHref,
  meetingsHref,
}: BookingSuccessPanelProps) {
  const showAdminLinks = Boolean(bookAnotherHref || meetingsHref);

  return (
    <div
      className={cn(
        "rounded-[var(--radius-control)] bg-primary-soft px-6 py-8 sm:px-8 print:bg-white print:shadow-none",
      )}
      role="status"
    >
      <div
        className="animate-pop-in flex justify-center"
        style={{ animationDelay: "0ms" }}
      >
        <Icon
          icon={CheckCircle2}
          size="lg"
          className="text-primary"
          label="Booking confirmed"
        />
      </div>

      <div
        className="animate-fade-up mt-4 text-center"
        style={{ animationDelay: "80ms" }}
      >
        <p className="label-secondary text-primary">You&apos;re all set</p>
        <h2 className="text-display leading-display mt-1 font-display font-semibold text-ink">
          Meeting booked
        </h2>
        {calendarName ? (
          <p className="prose-measure mx-auto mt-1 text-sm leading-body text-ink-muted">
            with {calendarName}
          </p>
        ) : null}
      </div>

      <div
        className="animate-fade-up mt-6 space-y-2 text-center"
        style={{ animationDelay: "160ms" }}
      >
        <p className="text-lg font-medium text-ink">{meeting.subject}</p>
        <p className="prose-measure mx-auto text-sm leading-body text-ink-muted">
          {formatMeetingTime(meeting.startsAt, viewerTimezone)}
          <span className="text-ink-muted/80">
            {" "}
            · {meeting.durationMinutes} min
          </span>
        </p>
      </div>

      <div
        className="animate-fade-up mt-6 flex flex-wrap justify-center gap-3 print:hidden"
        style={{ animationDelay: "240ms" }}
      >
        {meeting.meetLink ? (
          <Button asChild variant="primary" size="md">
            <a href={meeting.meetLink} target="_blank" rel="noreferrer">
              <Icon icon={Video} size="sm" className="mr-2 text-white" />
              Join Google Meet
            </a>
          </Button>
        ) : null}
        <Button asChild variant="secondary" size="md">
          <a
            href={googleCalendarUrl(meeting)}
            target="_blank"
            rel="noreferrer"
          >
            Add to Google Calendar
          </a>
        </Button>
      </div>

      {showAdminLinks ? (
        <div
          className="animate-fade-up mt-6 flex flex-wrap justify-center gap-3 border-t border-border/60 pt-4 print:hidden"
          style={{ animationDelay: "320ms" }}
        >
          {bookAnotherHref ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={bookAnotherHref}>Book another meeting</Link>
            </Button>
          ) : null}
          {meetingsHref ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={meetingsHref}>View meetings</Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
