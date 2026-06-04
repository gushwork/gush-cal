import { cn } from "@/lib/ui/cn";
import { CalendarClock, Users } from "lucide-react";
import Link from "next/link";

export type CalendarStatsProps = {
  calendarId: string;
  memberCount: number;
  upcomingMeetingCount: number;
  className?: string;
};

export function CalendarStats({
  calendarId,
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
      <Link
        href={`/calendars/${calendarId}?tab=members`}
        className="interactive-lift interactive rounded-xl border border-border bg-surface px-4 py-3 hover:border-primary/30"
      >
        <dt className="label-secondary flex items-center gap-2">
          <Users className="h-4 w-4" aria-hidden />
          Members
        </dt>
        <dd className="numeric mt-1 text-2xl font-semibold text-ink">
          {memberCount}
        </dd>
      </Link>
      <Link
        href={`/calendars/${calendarId}/meetings`}
        className="interactive-lift interactive rounded-xl border border-border bg-surface px-4 py-3 hover:border-primary/30"
      >
        <dt className="label-secondary flex items-center gap-2">
          <CalendarClock className="h-4 w-4" aria-hidden />
          Upcoming meetings
        </dt>
        <dd className="numeric mt-1 text-2xl font-semibold text-ink">
          {upcomingMeetingCount}
        </dd>
      </Link>
    </dl>
  );
}
