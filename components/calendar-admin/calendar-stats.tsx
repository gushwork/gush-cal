import { cn } from "@/lib/ui/cn";
import { ArrowUpRight, CalendarClock, ChartColumn, Users } from "lucide-react";
import Link from "next/link";

export type CalendarStatsProps = {
  calendarId: string;
  memberCount: number;
  upcomingMeetingCount: number;
  /** Meetings created in the last 30 days; links to the Analytics page. */
  bookedLast30Days: number;
  className?: string;
};

export function CalendarStats({
  calendarId,
  memberCount,
  upcomingMeetingCount,
  bookedLast30Days,
  className,
}: CalendarStatsProps) {
  return (
    <div
      className={cn(
        "flex flex-col divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-s3 sm:flex-row sm:divide-x sm:divide-y-0",
        className,
      )}
    >
      <Link
        href={`/calendars/${calendarId}?tab=members`}
        className="interactive flex flex-1 flex-col gap-1.5 px-6 py-6 transition-colors hover:bg-neutral-25"
      >
        <div className="flex items-center gap-1.5">
          <Users className="h-5 w-5 text-primary-500" aria-hidden />
          <span className="text-base font-normal text-neutral-900">Members</span>
        </div>
        <div className="font-grotesk text-[32px] leading-[140%] font-semibold text-neutral-900">
          {memberCount}
        </div>
      </Link>
      <Link
        href={`/calendars/${calendarId}/meetings`}
        className="interactive flex flex-1 flex-col gap-1.5 px-6 py-6 transition-colors hover:bg-neutral-25"
      >
        <div className="flex items-center gap-1.5">
          <CalendarClock className="h-5 w-5 text-primary-500" aria-hidden />
          <span className="text-base font-normal text-neutral-900">
            Upcoming meetings
          </span>
        </div>
        <div className="font-grotesk text-[32px] leading-[140%] font-semibold text-neutral-900">
          {upcomingMeetingCount}
        </div>
      </Link>
      <Link
        href={`/calendars/${calendarId}/analytics`}
        className="interactive group flex flex-1 flex-col gap-1.5 px-6 py-6 transition-colors hover:bg-neutral-25"
      >
        <div className="flex items-center gap-1.5">
          <ChartColumn className="h-5 w-5 text-primary-500" aria-hidden />
          <span className="text-base font-normal text-neutral-900">
            Booked · last 30 days
          </span>
          <ArrowUpRight
            className="ml-auto h-4 w-4 text-neutral-500 opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
        </div>
        <div className="font-grotesk text-[32px] leading-[140%] font-semibold text-neutral-900">
          {bookedLast30Days}
        </div>
      </Link>
    </div>
  );
}
