import type { ManageUrlInjection } from "@/lib/types/platform";

export const EMAIL_FOOTER_LINE =
  "\n\nManage your booking: {{manageUrl}}";

export type TemplateVars = {
  manageUrl?: string;
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

export function applyManageUrlInjection(
  body: string,
  manageUrl: string,
  mode: ManageUrlInjection,
): string {
  const rendered = renderTemplate(body, { manageUrl });
  if (mode === "auto_inject" && !body.includes("{{manageUrl}}")) {
    return rendered + renderTemplate(EMAIL_FOOTER_LINE, { manageUrl });
  }
  return rendered;
}
