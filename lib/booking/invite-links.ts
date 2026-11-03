import { applyManageLinks } from "@/lib/email/render-template";
import { buildManageLinks, type ManageLinks } from "@/lib/meeting-tokens/links";
import { generateManageToken } from "@/lib/meeting-tokens/tokens";
import type { ManageUrlInjection } from "@/lib/types/platform";

export type PreparedInvite = {
  /** Raw token to persist with `manageToken.createForMeeting(id, { token })`. */
  token: string;
  links: ManageLinks;
  /** Google Calendar event description: Meeting body + reschedule/cancel links. */
  description: string;
};

/**
 * Generates the manage token *before* the Google event is created so the
 * invite email Google sends already carries working Reschedule/Cancel links.
 * The stored Meeting body stays link-free; links are re-rendered (with a fresh
 * token) whenever a new invite goes out (reschedule, reassign).
 */
export function prepareInvite(body: string, mode: ManageUrlInjection): PreparedInvite {
  const token = generateManageToken();
  const links = buildManageLinks(token);
  return { token, links, description: applyManageLinks(body, links, mode) };
}
