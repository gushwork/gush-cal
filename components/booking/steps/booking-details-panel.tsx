"use client";

import { BookingSummary } from "@/components/booking/booking-summary";
import { InviteeForm } from "@/components/booking/invitee-form";
import type { DateKey } from "@/components/booking/types";
import type { IanaTimezone } from "@/lib/types";
import { cn } from "@/lib/ui/cn";
import type { StepPanelBaseProps } from "./types";

export type InviteeDetails = {
  invitees: string;
  subject: string;
  body: string;
  guestEmail?: string;
};

export type BookingDetailsPanelProps = StepPanelBaseProps & {
  calendarName: string;
  dateKey: DateKey;
  startsAt: string;
  durationMinutes: number;
  viewerTimezone: IanaTimezone;
  invitees: string;
  subject: string;
  body: string;
  guestEmail?: string;
  showGuestEmail?: boolean;
  onInviteesChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onGuestEmailChange?: (value: string) => void;
};

export function BookingDetailsPanel({
  calendarName,
  dateKey,
  startsAt,
  durationMinutes,
  viewerTimezone,
  invitees,
  subject,
  body,
  guestEmail = "",
  showGuestEmail = false,
  onInviteesChange,
  onSubjectChange,
  onBodyChange,
  onGuestEmailChange,
  loading = false,
  className,
}: BookingDetailsPanelProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <BookingSummary
        dateKey={dateKey}
        startsAt={startsAt}
        durationMinutes={durationMinutes}
        viewerTimezone={viewerTimezone}
        calendarName={calendarName}
      />
      <InviteeForm
        invitees={invitees}
        subject={subject}
        body={body}
        guestEmail={guestEmail}
        showGuestEmail={showGuestEmail}
        onInviteesChange={onInviteesChange}
        onSubjectChange={onSubjectChange}
        onBodyChange={onBodyChange}
        onGuestEmailChange={onGuestEmailChange}
        disabled={loading}
      />
    </div>
  );
}
