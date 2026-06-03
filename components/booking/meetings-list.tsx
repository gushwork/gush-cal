"use client";

import { useCallback, useEffect, useState } from "react";
import { MeetingCard } from "@/components/booking/meeting-card";
import { MeetingsTable } from "@/components/booking/meetings-table";
import { Button, Card, EmptyState, Skeleton } from "@/components/ui";
import type { Meeting } from "@/lib/types";

type MeetingsListProps = {
  calendarId: string;
  memberNames: Record<string, string>;
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
  const upcoming = meetings.filter(
    (m) => new Date(m.startsAt).getTime() >= now,
  );
  const past = meetings.filter((m) => new Date(m.startsAt).getTime() < now);

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

export function MeetingsList({ calendarId, memberNames }: MeetingsListProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const loadMeetings = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [calendarId]);

  useEffect(() => {
    void loadMeetings();
  }, [loadMeetings]);

  function handleCancelRequest(meetingId: string) {
    setSuccess(null);
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
    setSuccess(null);

    try {
      const res = await fetch(`/api/meetings/${meetingId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to cancel meeting");
      }
      setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
      setSuccess(
        "Meeting cancelled. Attendees were notified and the panelist slot is available again.",
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
      {success && (
        <div role="status">
          <Card
            padding="sm"
            className="border-success-soft bg-success-soft text-sm text-success-ink"
          >
            {success}
          </Card>
        </div>
      )}
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
      {pendingMeeting && (
        <Card padding="md" className="border-primary/30 bg-primary-soft/40">
          <p className="text-sm text-ink">
            Cancel <strong>{pendingMeeting.subject}</strong> for all attendees?
            This removes it from everyone&apos;s calendar and frees the
            panelist&apos;s slot.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirmCancel()}
              disabled={cancellingId !== null}
              loading={cancellingId !== null}
            >
              Yes, cancel meeting
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmCancelId(null)}
              disabled={cancellingId !== null}
            >
              Keep meeting
            </Button>
          </div>
        </Card>
      )}
      {meetings.length === 0 ? (
        <EmptyState
          title="No meetings yet"
          description="Book a meeting to see it listed here."
          action={
            <form action={`/calendars/${calendarId}/book`}>
              <Button type="submit" variant="primary">
                Book meeting
              </Button>
            </form>
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
