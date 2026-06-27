import type { EmailPort } from "@/lib/ports/email";

export function createEmailStub(): EmailPort {
  return {
    async enqueueSequenceForMeeting() {},
    async cancelPendingEmailSteps() {},
    async reenqueueMeetingAnchoredSteps() {},
    async renderManageUrl() {
      return "/manage/stub";
    },
  };
}
