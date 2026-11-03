/**
 * App Admins can open the platform-wide usage dashboard (`/admin`).
 *
 * The allowlist comes from `ADMIN_EMAILS` (comma/space separated). When the
 * variable is unset, the default App Admin below is used so the dashboard works
 * without extra configuration. Matching is case-insensitive.
 */
export const DEFAULT_ADMIN_EMAILS = ["punit.pal@gushwork.ai"] as const;

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS;
  const list = raw?.trim()
    ? raw.split(/[\s,]+/)
    : [...DEFAULT_ADMIN_EMAILS];
  return list.map((email) => email.trim().toLowerCase()).filter(Boolean);
}

export function isAppAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}
