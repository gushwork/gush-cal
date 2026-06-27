import type { EmailPort } from "@/lib/ports/email";
import {
  cancelPendingEmailSteps,
  enqueueSequenceForMeeting,
  reenqueueMeetingAnchoredSteps,
  renderManageUrl,
} from "./sequences";

export function createEmailPort(): EmailPort {
  return {
    enqueueSequenceForMeeting,
    cancelPendingEmailSteps,
    reenqueueMeetingAnchoredSteps,
    renderManageUrl,
  };
}

export { processDueEmailSteps } from "./executor";
export { sendEmail, setEmailSendForTest } from "./send";
export {
  applyManageUrlInjection,
  EMAIL_FOOTER_LINE,
  renderTemplate,
} from "./render-template";
export {
  cancelPendingEmailSteps,
  computeStepFireAt,
  createSequence,
  createSequenceStep,
  deleteSequence,
  deleteSequenceStep,
  EMAIL_STEP_TRIGGER_TYPE,
  enqueueSequenceForMeeting,
  getSequence,
  listSequenceSteps,
  listSequences,
  reenqueueMeetingAnchoredSteps,
  replaceSequenceSteps,
  renderManageUrl,
  setEmailDbForTest,
  setEmailManageTokenForTest,
  updateSequence,
  updateSequenceStep,
} from "./sequences";
export {
  executeEmailStep,
  processDueEmailSteps as processEmailSteps,
  setEmailExecutorDbForTest,
  setEmailExecutorEventsForTest,
} from "./executor";
