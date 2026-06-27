import type { RedirectVars } from "@/lib/types/platform";

export function applyRedirectTemplate(
  template: string,
  vars: RedirectVars,
): string {
  return template
    .replace(/\{\{meetingId\}\}/g, vars.meetingId)
    .replace(/\{\{guestEmail\}\}/g, vars.guestEmail ?? "")
    .replace(/\{\{memberEmail\}\}/g, vars.memberEmail ?? "")
    .replace(/\{\{startsAt\}\}/g, vars.startsAt)
    .replace(/\{\{calendarSlug\}\}/g, vars.calendarSlug)
    .replace(/\{\{teamSlug\}\}/g, vars.teamSlug ?? "");
}
