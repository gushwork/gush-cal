import { cn } from "@/lib/ui/cn";

export type CalendarStatsProps = {
  memberCount: number;
  upcomingMeetingCount: number;
  className?: string;
};

export function CalendarStats({
  memberCount,
  upcomingMeetingCount,
  className,
}: CalendarStatsProps) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-4 sm:grid-cols-2",
        className,
      )}
    >
      <div className="rounded-xl border border-border bg-surface px-4 py-3">
        <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          Members
        </dt>
        <dd className="mt-1 text-2xl font-semibold tabular-nums text-ink">
          {memberCount}
        </dd>
      </div>
      <div className="rounded-xl border border-border bg-surface px-4 py-3">
        <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          Upcoming meetings
        </dt>
        <dd className="mt-1 text-2xl font-semibold tabular-nums text-ink">
          {upcomingMeetingCount}
        </dd>
      </div>
    </dl>
  );
}
