export interface ManageTokenPort {
  createForMeeting(
    meetingId: string,
  ): Promise<{ token: string; manageUrl: string }>;
  validate(
    token: string,
  ): Promise<
    | { ok: true; meetingId: string }
    | { ok: false; code: "INVALID" | "EXPIRED" | "REVOKED" }
  >;
  revokeForMeeting(meetingId: string): Promise<void>;
}
