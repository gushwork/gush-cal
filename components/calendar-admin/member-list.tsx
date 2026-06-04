import Link from "next/link";
import { DeleteMemberButton } from "@/components/calendar-admin/delete-member-button";
import { Badge } from "@/components/ui";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/ui/cn";
import type { CalendarMember } from "@/lib/types";
import { ChevronRight } from "lucide-react";

type MemberListProps = {
  calendarId: string;
  members: CalendarMember[];
  className?: string;
};

export function MemberList({ calendarId, members, className }: MemberListProps) {
  return (
    <ul className={cn("divide-y divide-border", className)}>
      {members.map((member) => (
        <li key={member.id} className="group flex min-h-14 items-stretch">
          <Link
            href={`/calendars/${calendarId}/members/${member.id}`}
            className="interactive-row interactive flex min-w-0 flex-1 items-center gap-3 px-4 py-3"
          >
            <Avatar
              name={member.displayName ?? member.email}
              size="sm"
            />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-ink">
                {member.displayName ?? member.email}
              </span>
              {member.displayName && (
                <span className="block truncate text-sm text-ink-muted">
                  {member.email}
                </span>
              )}
              <span className="mt-1 flex flex-wrap gap-1.5">
                {member.maxPerDayOverride != null && (
                  <Badge variant="muted">{member.maxPerDayOverride}/day cap</Badge>
                )}
                {member.maxPerWeekOverride != null && (
                  <Badge variant="muted">{member.maxPerWeekOverride}/week cap</Badge>
                )}
              </span>
            </span>
            <ChevronRight
              className="h-5 w-5 shrink-0 text-ink-muted"
              aria-hidden
            />
          </Link>
          <div className="flex items-center pr-2 md:opacity-100">
            <DeleteMemberButton
              calendarId={calendarId}
              memberId={member.id}
              memberName={member.displayName ?? member.email}
              compact
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
