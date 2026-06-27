const TEAM_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeTeamSlug(input: string): string {
  return input.trim().toLowerCase();
}

export function validateTeamSlug(slug: string): string | null {
  const normalized = normalizeTeamSlug(slug);
  if (!normalized) {
    return "Slug is required";
  }
  if (normalized.length > 64) {
    return "Slug must be at most 64 characters";
  }
  if (!TEAM_SLUG_RE.test(normalized)) {
    return "Slug must use lowercase letters, numbers, and hyphens only";
  }
  return null;
}
