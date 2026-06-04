"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MeetingCard } from "@/components/booking/meeting-card";
import { MeetingsTable } from "@/components/booking/meetings-table";
import { Button, Card, Dialog, EmptyState, Skeleton } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import type { Meeting } from "@/lib/types";

type MeetingsListProps = {
  calendarId: string;
  memberNames: Record<string, string>;
  initialMeetings?: Meeting[];
};

const SKELETON_COUNT = 4;

function MeetingsListSkeleton() {
  return (
    <div role="status" aria-label="Loading meetings">
      <div className="space-y-3 md:hidden">
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))}
      </div>
      <div className="hidden space-y-3 md:block">
        <Skeleton className="h-6 w-24" />
        <div className="overflow-hidden rounded-xl border border-border">
          <Skeleton className="h-10 w-full rounded-none" />
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-none border-t border-border" />
          ))}
        </div>
      </div>
    </div>
  );
}

type MeetingCardsSectionProps = {
  title: string;
  meetings: Meeting[];
  memberNames: Record<string, string>;
  onCancelRequest: (meetingId: string) => void;
  cancellingId: string | null;
  showPastBadge?: boolean;
  canCancel?: boolean;
};

function MeetingCardsSection({
  title,
  meetings,
  memberNames,
  onCancelRequest,
  cancellingId,
  showPastBadge = false,
  canCancel = true,
}: MeetingCardsSectionProps) {
  if (meetings.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      <div className="space-y-3">
        {meetings.map((meeting) => (
          <MeetingCard
            key={meeting.id}
            meeting={meeting}
            memberName={
              memberNames[meeting.assignedMemberId] ?? meeting.assignedMemberId
            }
            onCancelRequest={onCancelRequest}
            cancellingId={cancellingId}
            showPastBadge={showPastBadge}
            canCancel={canCancel}
          />
        ))}
      </div>
    </section>
  );
}

function MeetingsCards({
  meetings,
  memberNames,
  onCancelRequest,
  cancellingId,
}: {
  meetings: Meeting[];
  memberNames: Record<string, string>;
  onCancelRequest: (meetingId: string) => void;
  cancellingId: string | null;
}) {
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
      <MeetingCardsSection
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
      <MeetingCardsSection
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
      <MeetingCardsSection
        title="Upcoming"
        meetings={upcoming}
        memberNames={memberNames}
        onCancelRequest={onCancelRequest}
        cancellingId={cancellingId}
        canCancel
      />
      <MeetingCardsSection
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

export function MeetingsList({
  calendarId,
  memberNames,
  initialMeetings = [],
}: MeetingsListProps) {
  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings);
  const [loading, setLoading] = useState(initialMeetings.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const loadMeetings = useCallback(
    async (background = false) => {
      if (!background) {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await fetch(`/api/calendars/${calendarId}/meetings`);
        const data = (await res.json()) as {
          meetings?: Meeting[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load meetings");
        }
        setMeetings(data.meetings ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load meetings");
      } finally {
        if (!background) {
          setLoading(false);
        }
      }
    },
    [calendarId],
  );

  useEffect(() => {
    void loadMeetings(initialMeetings.length > 0);
  }, [initialMeetings.length, loadMeetings]);

  function handleCancelRequest(meetingId: string) {
    setError(null);
    setConfirmCancelId(meetingId);
  }

  async function handleConfirmCancel() {
    if (!confirmCancelId) {
      return;
    }

    const meetingId = confirmCancelId;
    setConfirmCancelId(null);
    setCancellingId(meetingId);
    setError(null);

    try {
      const res = await fetch(`/api/meetings/${meetingId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to cancel meeting");
      }
      setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
      toast(
        "Meeting cancelled. Attendees were notified and the member slot is available again.",
        { variant: "success" },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel meeting");
    } finally {
      setCancellingId(null);
    }
  }

  const pendingMeeting = confirmCancelId
    ? meetings.find((m) => m.id === confirmCancelId)
    : null;

  if (loading) {
    return <MeetingsListSkeleton />;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert">
          <Card
            padding="sm"
            className="border-destructive/30 bg-destructive-soft text-sm text-ink"
          >
            {error}
          </Card>
        </div>
      )}
      <Dialog
        open={confirmCancelId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmCancelId(null);
          }
        }}
        title="Cancel meeting?"
        description={
          pendingMeeting
            ? `Cancel ${pendingMeeting.subject} for all attendees? This removes it from everyone's calendar and frees the member's slot.`
            : undefined
        }
        confirmLabel="Yes, cancel meeting"
        cancelLabel="Keep meeting"
        variant="destructive"
        onConfirm={() => void handleConfirmCancel()}
      />
      {meetings.length === 0 ? (
        <EmptyState
          title="No meetings yet"
          description="Book a meeting to see it listed here."
          action={
            <Button asChild className="w-full sm:w-auto">
              <Link href={`/calendars/${calendarId}/book`}>Book meeting</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="md:hidden">
            <MeetingsCards
              meetings={meetings}
              memberNames={memberNames}
              onCancelRequest={handleCancelRequest}
              cancellingId={cancellingId}
            />
          </div>
          <div className="hidden md:block">
            <MeetingsTable
              meetings={meetings}
              memberNames={memberNames}
              onCancelRequest={handleCancelRequest}
              cancellingId={cancellingId}
            />
          </div>
        </>
      )}
    </div>
  );
}
