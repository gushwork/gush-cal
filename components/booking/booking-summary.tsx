import type { DateKey } from "@/components/booking/types";
import type { IanaTimezone } from "@/lib/types";
import { cn } from "@/lib/ui/cn";

export type BookingSummaryProps = {
  dateKey: DateKey;
  startsAt: string;
  durationMinutes: number;
  viewerTimezone: IanaTimezone;
  calendarName: string;
  className?: string;
};

function formatDate(dateKey: DateKey, timezone: IanaTimezone): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

function formatTime(startsAt: string, timezone: IanaTimezone): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(startsAt));
}

function formatTimezoneLabel(timezone: IanaTimezone): string {
  return timezone.replace(/_/g, " ");
}

export function BookingSummary({
  dateKey,
  startsAt,
  durationMinutes,
  viewerTimezone,
  calendarName,
  className,
}: BookingSummaryProps) {
  return (
    <aside
      className={cn(
        "rounded-[var(--radius-control)] border border-border bg-surface px-4 py-3 text-sm",
        className,
      )}
      aria-label="Meeting summary"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        Your meeting
      </p>
      <p className="mt-2 font-medium text-ink">{calendarName}</p>
      <dl className="mt-3 space-y-1.5 text-ink-muted">
        <div className="flex justify-between gap-3">
          <dt>Date</dt>
          <dd className="text-right text-ink">
            {formatDate(dateKey, viewerTimezone)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Time</dt>
          <dd className="text-right text-ink">
            {formatTime(startsAt, viewerTimezone)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Duration</dt>
          <dd className="text-right text-ink">{durationMinutes} min</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Timezone</dt>
          <dd className="text-right text-ink">
            {formatTimezoneLabel(viewerTimezone)}
          </dd>
        </div>
      </dl>
    </aside>
  );
}
