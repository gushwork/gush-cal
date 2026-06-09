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
    </div>
  );
}
