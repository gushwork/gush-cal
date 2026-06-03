"use client";

import { Badge, Button, Card } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import type { Meeting } from "@/lib/types";

export type MeetingCardProps = {
  meeting: Meeting;
  memberName: string;
  onCancelRequest: (meetingId: string) => void;
  cancellingId: string | null;
  canCancel?: boolean;
  showPastBadge?: boolean;
};

export function formatMeetingTime(startsAt: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(startsAt));
}

export function formatInvitees(meeting: Meeting): string {
  const emails = [...meeting.invitees];
  if (meeting.guestEmail) {
    const guest = meeting.guestEmail.trim();
    if (guest && !emails.includes(guest)) {
      emails.push(guest);
    }
  }
  return emails.length > 0 ? emails.join(", ") : "—";
}

export function MeetingCard({
  meeting,
  memberName,
  onCancelRequest,
  cancellingId,
  canCancel = true,
  showPastBadge = false,
}: MeetingCardProps) {
  const isPast = new Date(meeting.startsAt).getTime() < Date.now();

  return (
    <Card
      padding="sm"
      className={cn(
        "space-y-3",
        isPast && "text-ink-muted",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <time
              dateTime={meeting.startsAt}
              className={cn(
                "text-sm font-medium",
                isPast ? "text-ink-muted" : "text-ink",
              )}
            >
              {formatMeetingTime(meeting.startsAt)}
            </time>
            {showPastBadge && isPast && <Badge variant="muted">Past</Badge>}
          </div>
          <p className="text-xs text-ink-muted">{meeting.durationMinutes} min</p>
        </div>
        {meeting.meetLink ? (
          <a
            href={meeting.meetLink}
            className="interactive shrink-0 text-sm text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
            target="_blank"
            rel="noreferrer"
          >
            Join
          </a>
        ) : null}
      </div>

      <div>
        <p className={cn("font-medium", isPast ? "text-ink-muted" : "text-ink")}>
          {meeting.subject}
        </p>
        <p className="mt-0.5 text-xs text-ink-muted">{formatInvitees(meeting)}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-ink-muted">
        <div className="space-y-0.5">
          <p>
            <span className="text-ink-muted">Panelist:</span>{" "}
            <span className={isPast ? "text-ink-muted" : "text-ink"}>
              {memberName}
            </span>
          </p>
          <p className="capitalize">
            <span className="text-ink-muted">Booked by:</span>{" "}
            <span className={isPast ? "text-ink-muted" : "text-ink"}>
              {meeting.bookedBy}
            </span>
          </p>
        </div>
        {canCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={cancellingId === meeting.id}
            onClick={() => onCancelRequest(meeting.id)}
            className="text-primary hover:bg-primary-soft hover:text-primary"
          >
            {cancellingId === meeting.id ? "Cancelling…" : "Cancel"}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
