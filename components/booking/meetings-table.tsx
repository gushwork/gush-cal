"use client";

import { Badge, Button, Card } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import type { Meeting } from "@/lib/types";
import {
  formatInvitees,
  formatMeetingTime,
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
        return (
          <tr
            key={meeting.id}
            className={cn(
              "bg-paper/60 transition-colors hover:bg-paper",
              isPast && "text-ink-muted",
            )}
          >
            <td className="px-4 py-3 whitespace-nowrap">
              <div className="flex flex-wrap items-center gap-2">
                <span className={isPast ? "text-ink-muted" : "text-ink"}>
                  {formatMeetingTime(meeting.startsAt)}
                </span>
                {showPastBadge && isPast && (
                  <Badge variant="muted">Past</Badge>
                )}
              </div>
              <div className="text-xs text-ink-muted">
                {meeting.durationMinutes} min
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="text-ink">{meeting.subject}</div>
              <div className="mt-0.5 text-xs text-ink-muted">
                {formatInvitees(meeting)}
              </div>
            </td>
            <td className="px-4 py-3">
              {memberNames[meeting.assignedMemberId] ?? meeting.assignedMemberId}
            </td>
            <td className="px-4 py-3 capitalize">{meeting.bookedBy}</td>
            <td className="px-4 py-3">
              {meeting.meetLink ? (
                <a
                  href={meeting.meetLink}
                  className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
                  target="_blank"
                  rel="noreferrer"
                >
                  Join
                </a>
              ) : (
                <span className="text-ink-muted">—</span>
              )}
            </td>
            <td className="px-4 py-3 text-right">
              {canCancel ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={cancellingId === meeting.id}
                  onClick={() => onCancelRequest(meeting.id)}
                  className="px-2 py-1 text-primary hover:bg-primary-soft hover:text-primary"
                >
                  {cancellingId === meeting.id ? "Cancelling…" : "Cancel"}
                </Button>
              ) : (
                <span className="text-ink-muted">—</span>
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
      <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      <Card padding="sm" className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-paper text-left text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Subject / invitees</th>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Booked by</th>
                <th className="px-4 py-3 font-medium">Meet</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
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
  const upcoming = meetings.filter(
    (m) => new Date(m.startsAt).getTime() >= now,
  );
  const past = meetings.filter((m) => new Date(m.startsAt).getTime() < now);

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
