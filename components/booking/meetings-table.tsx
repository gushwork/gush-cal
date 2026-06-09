"use client";

import { ExternalLink } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/ui/cn";
import { formatBookedBy } from "@/lib/ui/format-booked-by";
import type { Meeting } from "@/lib/types";
import {
  formatInvitees,
  formatMeetingTime,
  formatRelativeMeetingTime,
} from "@/components/booking/meeting-card";

type MeetingsTableProps = {
  meetings: Meeting[];
  memberNames: Record<string, string>;
  onCancelRequest: (meetingId: string) => void;
  cancellingId: string | null;
};

type MeetingSectionProps = {
  title: string;
  meetings: Meeting[];
  memberNames: Record<string, string>;
  onCancelRequest: (meetingId: string) => void;
  cancellingId: string | null;
  showPastBadge?: boolean;
  canCancel?: boolean;
};

function MeetingRows({
  meetings,
  memberNames,
  onCancelRequest,
  cancellingId,
  showPastBadge = false,
  canCancel = true,
}: Omit<MeetingSectionProps, "title">) {
  const now = Date.now();

  return (
    <>
      {meetings.map((meeting) => {
        const isPast = new Date(meeting.startsAt).getTime() < now;
        const memberName =
          memberNames[meeting.assignedMemberId] ?? meeting.assignedMemberId;
        const relativeTime = formatRelativeMeetingTime(meeting.startsAt);

        return (
          <tr
            key={meeting.id}
            className={cn(
              "interactive-row border-b border-neutral-100 transition-colors last:border-0 hover:bg-neutral-25",
              isPast && "text-neutral-500",
            )}
          >
            <td className="px-4 py-3 whitespace-nowrap">
              <div className="flex flex-wrap items-center gap-2">
                <span className={isPast ? "text-neutral-500" : "text-neutral-900"}>
                  {formatMeetingTime(meeting.startsAt)}
                </span>
                {showPastBadge && isPast && (
                  <Badge variant="muted">Past</Badge>
                )}
              </div>
              {relativeTime && (
                <div className="text-xs text-neutral-500">{relativeTime}</div>
              )}
              <div className="text-xs text-neutral-500">
                {meeting.durationMinutes} min
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="text-neutral-900">{meeting.subject}</div>
              <div className="mt-0.5 text-xs text-neutral-500">
                {formatInvitees(meeting)}
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <Avatar name={memberName} size="sm" />
                <span>{memberName}</span>
              </div>
            </td>
            <td className="px-4 py-3">{formatBookedBy(meeting.bookedBy)}</td>
            <td className="px-4 py-3">
              {meeting.meetLink ? (
                <Button asChild variant="link" size="sm">
                  <a
                    href={meeting.meetLink}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Join ${meeting.subject}`}
                  >
                    Join
                    <Icon icon={ExternalLink} size="sm" className="ml-1" />
                  </a>
                </Button>
              ) : (
                <span className="text-neutral-500">—</span>
              )}
            </td>
            <td className="px-4 py-3 text-right">
              {canCancel ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={cancellingId === meeting.id}
                  onClick={() => onCancelRequest(meeting.id)}
                  aria-label={`Cancel ${meeting.subject}`}
                  className="px-2 py-1 text-neutral-500 hover:bg-status-error-100 hover:text-status-error-700"
                >
                  {cancellingId === meeting.id ? "Cancelling…" : "Cancel"}
                </Button>
              ) : (
                <span className="text-neutral-500">—</span>
              )}
            </td>
          </tr>
        );
      })}
    </>
  );
}

function MeetingsTableSection({
  title,
  meetings,
  memberNames,
  onCancelRequest,
  cancellingId,
  showPastBadge = false,
  canCancel = true,
}: MeetingSectionProps) {
  if (meetings.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h2 className="font-grotesk text-lg font-semibold text-neutral-900">{title}</h2>
      <Card padding="sm" className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-neutral-100 bg-neutral-25 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                <th scope="col" className="px-4 py-3 text-left">
                  When
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  Subject / invitees
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  Member
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  Booked by
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  Join
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <MeetingRows
                meetings={meetings}
                memberNames={memberNames}
                onCancelRequest={onCancelRequest}
                cancellingId={cancellingId}
                showPastBadge={showPastBadge}
                canCancel={canCancel}
              />
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}

export function MeetingsTable({
  meetings,
  memberNames,
  onCancelRequest,
  cancellingId,
}: MeetingsTableProps) {
  if (meetings.length === 0) {
    return null;
  }

  const now = Date.now();
  const upcoming = meetings
    .filter((m) => new Date(m.startsAt).getTime() >= now)
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  const past = meetings
    .filter((m) => new Date(m.startsAt).getTime() < now)
    .sort(
      (a, b) =>
        new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
    );

  if (past.length === 0) {
    return (
      <MeetingsTableSection
        title="Upcoming"
        meetings={upcoming}
        memberNames={memberNames}
        onCancelRequest={onCancelRequest}
        cancellingId={cancellingId}
        canCancel
      />
    );
  }

  if (upcoming.length === 0) {
    return (
      <MeetingsTableSection
        title="Past"
        meetings={past}
        memberNames={memberNames}
        onCancelRequest={onCancelRequest}
        cancellingId={cancellingId}
        showPastBadge
        canCancel={false}
      />
    );
  }

  return (
    <div className="space-y-8">
      <MeetingsTableSection
        title="Upcoming"
        meetings={upcoming}
        memberNames={memberNames}
        onCancelRequest={onCancelRequest}
        cancellingId={cancellingId}
        canCancel
      />
      <MeetingsTableSection
        title="Past"
        meetings={past}
        memberNames={memberNames}
        onCancelRequest={onCancelRequest}
        cancellingId={cancellingId}
        showPastBadge
        canCancel={false}
      />
    </div>
  );
}
