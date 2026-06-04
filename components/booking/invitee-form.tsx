"use client";

import { useMemo } from "react";
import { FormField } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui";
import { cn } from "@/lib/ui/cn";

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
  disabled?: boolean;
};

function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

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
  disabled = false,
}: InviteeFormProps) {
  const inviteeCount = useMemo(
    () => parseInviteeLines(invitees).length,
    [invitees],
  );

  const guestEmailError =
    showGuestEmail && guestEmail.trim() && !isValidEmail(guestEmail)
      ? "Enter a valid email address"
      : undefined;

  return (
    <div className={cn("space-y-4", disabled && "pointer-events-none opacity-60")}>
      {showGuestEmail && onGuestEmailChange ? (
        <FormField
          id="guest-email"
          label="Your email"
          hint="We'll send the calendar invite here."
          error={guestEmailError}
          required
        >
          <Input
            type="email"
            value={guestEmail}
            onChange={(e) => onGuestEmailChange(e.target.value)}
            placeholder="you@example.com"
            disabled={disabled}
          />
        </FormField>
      ) : null}

      <div className="space-y-1.5">
        <FormField
          id="invitees"
          label={showGuestEmail ? "Additional guests (optional)" : "Invitees"}
          hint={
            showGuestEmail
              ? "One email per line for anyone else joining."
              : "One email per line."
          }
        >
          <Textarea
            value={invitees}
            onChange={(e) => onInviteesChange(e.target.value)}
            rows={3}
            placeholder={
              showGuestEmail ? "colleague@example.com" : "candidate@example.com"
            }
            disabled={disabled}
          />
        </FormField>
        {inviteeCount > 0 ? (
          <p className="text-xs text-ink-muted">
            {inviteeCount} invitee{inviteeCount === 1 ? "" : "s"} added
          </p>
        ) : null}
      </div>

      <FormField id="subject" label="Subject" required>
        <Input
          type="text"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          required
          disabled={disabled}
        />
      </FormField>

      <FormField id="body" label="Message (optional)">
        <div className="space-y-1">
          <div className="flex justify-end">
            <span className="text-xs text-ink-muted">
              {body.length}/{BODY_MAX_LENGTH}
            </span>
          </div>
          <Textarea
            value={body}
            onChange={(e) =>
              onBodyChange(e.target.value.slice(0, BODY_MAX_LENGTH))
            }
            rows={4}
            disabled={disabled}
          />
        </div>
      </FormField>
    </div>
  );
}

export function parseInviteeLines(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function isGuestEmailValid(email: string): boolean {
  return isValidEmail(email);
}
