import Link from "next/link";
import { CopyLinkButton } from "@/components/calendar-admin/copy-link-button";
import { Button } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import { CalendarClock, Clock, Video } from "lucide-react";

export type CalendarActionBarProps = {
  calendarId: string;
  publicSlug: string;
  appOrigin: string;
  className?: string;
};

export function CalendarActionBar({
  calendarId,
  publicSlug,
  appOrigin,
  className,
}: CalendarActionBarProps) {
  const bookingUrl = `${appOrigin.replace(/\/$/, "")}/book/${publicSlug}`;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4",
        className,
      )}
    >
      <CopyLinkButton url={bookingUrl} variant="primary" size="sm" />
      <Button asChild variant="secondary" size="sm" className="gap-1.5">
        <Link href={`/calendars/${calendarId}/book`}>
          <Video className="h-4 w-4" aria-hidden />
          Book
        </Link>
      </Button>
      <Button asChild variant="secondary" size="sm" className="gap-1.5">
        <Link href={`/calendars/${calendarId}/availability`}>
          <Clock className="h-4 w-4" aria-hidden />
          Availability
        </Link>
      </Button>
      <Button asChild variant="secondary" size="sm" className="gap-1.5">
        <Link href={`/calendars/${calendarId}/meetings`}>
          <CalendarClock className="h-4 w-4" aria-hidden />
          Meetings
        </Link>
      </Button>
    </div>
  );
}
