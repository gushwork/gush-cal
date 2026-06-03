import Link from "next/link";
import { CopyLinkButton } from "@/components/calendar-admin/copy-link-button";
import { cn } from "@/lib/ui/cn";

const linkButtonClassName =
  "interactive inline-flex cursor-pointer items-center justify-center rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2";

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
      <Link href={`/calendars/${calendarId}/book`} className={linkButtonClassName}>
        Book
      </Link>
      <Link
        href={`/calendars/${calendarId}/availability`}
        className={linkButtonClassName}
      >
        Availability
      </Link>
      <Link
        href={`/calendars/${calendarId}/meetings`}
        className={linkButtonClassName}
      >
        Meetings
      </Link>
    </div>
  );
}
