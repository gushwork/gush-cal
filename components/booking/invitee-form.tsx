"use client";

import { Input, Label, Textarea } from "@/components/ui";

const BODY_MAX_LENGTH = 2000;

type InviteeFormProps = {
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

export function InviteeForm({
  invitees,
  subject,
  body,
  guestEmail = "",
  showGuestEmail = false,
  onInviteesChange,
  onSubjectChange,
  onBodyChange,
  onGuestEmailChange,
}: InviteeFormProps) {
  return (
    <div className="space-y-4">
      {showGuestEmail && onGuestEmailChange ? (
        <div>
          <Label htmlFor="guest-email">Your email</Label>
          <p className="mt-0.5 text-xs text-ink-muted">
            We&apos;ll send the calendar invite here.
          </p>
          <Input
            id="guest-email"
            type="email"
            value={guestEmail}
            onChange={(e) => onGuestEmailChange(e.target.value)}
            placeholder="you@example.com"
            required
            className="mt-1"
          />
        </div>
      ) : null}

      <div>
        <Label htmlFor="invitees">
          {showGuestEmail ? "Additional guests (optional)" : "Invitees"}
        </Label>
        <p className="mt-0.5 text-xs text-ink-muted">
          {showGuestEmail
            ? "One email per line for anyone else joining."
            : "One email per line."}
        </p>
        <Textarea
          id="invitees"
          value={invitees}
          onChange={(e) => onInviteesChange(e.target.value)}
          rows={3}
          placeholder={
            showGuestEmail ? "colleague@example.com" : "candidate@example.com"
          }
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          type="text"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          required
          className="mt-1"
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="body">Message (optional)</Label>
          <span className="text-xs text-ink-muted">
            {body.length}/{BODY_MAX_LENGTH}
          </span>
        </div>
        <Textarea
          id="body"
          value={body}
          onChange={(e) =>
            onBodyChange(e.target.value.slice(0, BODY_MAX_LENGTH))
          }
          rows={4}
          className="mt-1"
        />
      </div>
    </div>
  );
}

export function parseInviteeLines(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((line) => line.trim())
    .filter(Boolean);
}
