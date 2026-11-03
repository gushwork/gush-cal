import type { ManageLinks } from "@/lib/meeting-tokens/links";
import { manageLinksFromManageUrl } from "@/lib/meeting-tokens/links";
import type { ManageUrlInjection } from "@/lib/types/platform";

/**
 * Footer appended to guest emails and calendar invites when the Calendar's
 * "Reschedule & cancel links" setting is `auto_inject` and the template does
 * not place the links itself.
 */
export const MANAGE_LINKS_FOOTER =
  "Need to make a change?\nReschedule: {{rescheduleUrl}}\nCancel: {{cancelUrl}}";

/** @deprecated Kept for older imports; equals the leading-blank-line footer. */
export const EMAIL_FOOTER_LINE = `\n\n${MANAGE_LINKS_FOOTER}`;

const LINK_PLACEHOLDERS = ["{{manageUrl}}", "{{rescheduleUrl}}", "{{cancelUrl}}"];

export type TemplateVars = {
  manageUrl?: string;
  rescheduleUrl?: string;
  cancelUrl?: string;
  startsAt?: string;
  guestEmail?: string;
  memberEmail?: string;
};

export function renderTemplate(
  template: string,
  vars: TemplateVars,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = vars[key as keyof TemplateVars];
    return value ?? match;
  });
}

/** True when the template already places at least one manage link. */
export function templateHasManageLinks(template: string): boolean {
  return LINK_PLACEHOLDERS.some((placeholder) => template.includes(placeholder));
}

/**
 * Renders `{{manageUrl}}`, `{{rescheduleUrl}}` and `{{cancelUrl}}` in `body`
 * and, in `auto_inject` mode, appends the reschedule/cancel footer when the
 * body places none of them. Other placeholders are left untouched.
 */
export function applyManageLinks(
  body: string,
  links: ManageLinks,
  mode: ManageUrlInjection,
): string {
  const vars = {
    manageUrl: links.manageUrl,
    rescheduleUrl: links.rescheduleUrl,
    cancelUrl: links.cancelUrl,
  };
  const rendered = renderTemplate(body, vars);
  if (mode !== "auto_inject" || templateHasManageLinks(body)) {
    return rendered;
  }
  const footer = renderTemplate(MANAGE_LINKS_FOOTER, vars);
  return rendered.trim() ? `${rendered.trimEnd()}\n\n${footer}` : footer;
}

/** Back-compat wrapper: derives reschedule/cancel links from the manage URL. */
export function applyManageUrlInjection(
  body: string,
  manageUrl: string,
  mode: ManageUrlInjection,
): string {
  return applyManageLinks(body, manageLinksFromManageUrl(manageUrl), mode);
}
