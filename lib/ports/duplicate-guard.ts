import type { CalendarDuplicateSettings } from "@/lib/types/platform";

export type DuplicateCheckInput = {
  calendarId: string;
  guestEmail: string;
  settings: CalendarDuplicateSettings;
  salesforceConnectionId?: string;
};

export type DuplicateCheckResult =
  | { ok: true; allowed: true }
  | {
      ok: true;
      allowed: false;
      existingMeetingId: string;
      manageUrl: string;
      mode: CalendarDuplicateSettings["uxMode"];
    }
  | { ok: false; code: "INVALID_EMAIL" };

export interface DuplicateGuardPort {
  check(input: DuplicateCheckInput): Promise<DuplicateCheckResult>;
}
