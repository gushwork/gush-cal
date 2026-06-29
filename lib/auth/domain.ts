/** Returns true when email belongs to the allowed Workspace domain. */
export function isAllowedEmail(email: string, allowedDomain: string): boolean {
  if (typeof email !== "string") {
    return false;
  }
  const normalizedDomain = allowedDomain.toLowerCase().replace(/^@/, "");
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) {
    return false;
  }
  const domain = email.slice(atIndex + 1).toLowerCase();
  return domain === normalizedDomain;
}

export function getAllowedDomain(): string | undefined {
  return process.env.ALLOWED_DOMAIN ?? process.env.GOOGLE_WORKSPACE_DOMAIN;
}
