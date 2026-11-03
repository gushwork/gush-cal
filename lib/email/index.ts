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
  applyManageLinks,
  applyManageUrlInjection,
  EMAIL_FOOTER_LINE,
  MANAGE_LINKS_FOOTER,
  renderTemplate,
  templateHasManageLinks,
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
