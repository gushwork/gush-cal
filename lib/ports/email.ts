import type { MeetingSequenceTrigger } from "@/lib/email/sequences";

export interface EmailPort {
  enqueueSequenceForMeeting(
    meetingId: string,
    triggerEvent: MeetingSequenceTrigger,
  ): Promise<void>;
  cancelPendingEmailSteps(meetingId: string): Promise<void>;
  reenqueueMeetingAnchoredSteps(meetingId: string): Promise<void>;
  renderManageUrl(meetingId: string): Promise<string>;
}
