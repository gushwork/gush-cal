"use client";

import { ExternalLink } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/ui/cn";
import { formatBookedBy } from "@/lib/ui/format-booked-by";
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

export function formatRelativeMeetingTime(startsAt: string): string | null {
  const target = new Date(startsAt).getTime();
  const diffMs = target - Date.now();
  const absMs = Math.abs(diffMs);

  if (absMs > 7 * 24 * 60 * 60 * 1000) {
    return null;
  }

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (absMs < 60 * 60 * 1000) {
    const minutes = Math.round(diffMs / (1000 * 60));
    return rtf.format(minutes, "minute");
  }

  if (absMs < 24 * 60 * 60 * 1000) {
    const hours = Math.round(diffMs / (1000 * 60 * 60));
    return rtf.format(hours, "hour");
  }

  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return rtf.format(days, "day");
}

export function formatInvitees(meeting: Meeting): string {
  const emails = [...meeting.invitees];
  if (meeting.guestEmail) {
    const guest = meeting.guestEmail.trim();
    if (guest && !emails.includes(guest)) {
      emails.push(guest);
    }
  }
  return emails.length > 0 ? emails.join(", ") : "No invitees";
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
  const relativeTime = formatRelativeMeetingTime(meeting.startsAt);

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
          {relativeTime && (
            <p className="text-xs text-ink-muted">{relativeTime}</p>
          )}
          <p className="text-xs text-ink-muted">{meeting.durationMinutes} min</p>
        </div>
      </div>

      <div>
        <p className={cn("font-medium", isPast ? "text-ink-muted" : "text-ink")}>
          {meeting.subject}
        </p>
        <p className="mt-0.5 text-xs text-ink-muted">{formatInvitees(meeting)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        <Avatar name={memberName} size="sm" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <p>
            <span className="text-ink-muted">Member:</span>{" "}
            <span className={isPast ? "text-ink-muted" : "text-ink"}>
              {memberName}
            </span>
          </p>
          <p>
            <span className="text-ink-muted">Booked by:</span>{" "}
            <span className={isPast ? "text-ink-muted" : "text-ink"}>
              {formatBookedBy(meeting.bookedBy)}
            </span>
          </p>
        </div>
      </div>

      {(meeting.meetLink || canCancel) && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
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
          ) : null}
          {canCancel ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={cancellingId === meeting.id}
              onClick={() => onCancelRequest(meeting.id)}
              aria-label={`Cancel ${meeting.subject}`}
              className="text-ink-muted hover:bg-destructive-soft hover:text-destructive"
            >
              {cancellingId === meeting.id ? "Cancelling…" : "Cancel"}
            </Button>
          ) : null}
        </div>
      )}
    </Card>
  );
}
