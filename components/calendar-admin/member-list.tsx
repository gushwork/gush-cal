import Link from "next/link";
import { DeleteMemberButton } from "@/components/calendar-admin/delete-member-button";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import type { CalendarMember } from "@/lib/types";

type MemberListProps = {
  calendarId: string;
  members: CalendarMember[];
  className?: string;
};

function memberInitial(member: CalendarMember): string {
  const source = member.displayName?.trim() || member.email;
  return source.charAt(0).toUpperCase();
}

export function MemberList({ calendarId, members, className }: MemberListProps) {
  return (
    <ul className={cn("divide-y divide-border", className)}>
      {members.map((member) => (
        <li key={member.id} className="group flex items-stretch">
          <Link
            href={`/calendars/${calendarId}/members/${member.id}`}
            className="interactive flex min-w-0 flex-1 items-center gap-3 px-4 py-3"
          >
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
            >
              {memberInitial(member)}
            </span>
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
          </Link>
          <div className="flex items-center pr-2">
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
