import type { ManageLinks } from "@/lib/meeting-tokens/links";

export type IssuedManageToken = { token: string } & ManageLinks;

export interface ManageTokenPort {
  /**
   * Persists a manage token for the Meeting and returns its links. Earlier
   * tokens stay valid (links already emailed keep working); call
   * `revokeForMeeting` first to rotate. Pass `token` to persist one that was
   * generated up front and already embedded in a calendar invite.
   */
  createForMeeting(
    meetingId: string,
    options?: { token?: string; startsAt?: string },
  ): Promise<IssuedManageToken>;
  validate(
    token: string,
  ): Promise<
    | { ok: true; meetingId: string }
    | { ok: false; code: "INVALID" | "EXPIRED" | "REVOKED" }
  >;
  revokeForMeeting(meetingId: string): Promise<void>;
}
