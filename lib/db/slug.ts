import { randomBytes } from "crypto";

const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 64;
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const RESERVED_SLUGS = new Set(["api", "login", "calendars", "book"]);

/** URL-safe slug for public booking links (≥16 chars). */
export function generateCalendarSlug(): string {
  return randomBytes(12).toString("base64url");
}

export function normalizeCalendarSlug(input: string): string {
  return input.trim().toLowerCase();
}

export function validateCalendarSlug(slug: string): string | null {
  if (slug.length < SLUG_MIN_LENGTH || slug.length > SLUG_MAX_LENGTH) {
    return `Slug must be ${SLUG_MIN_LENGTH}–${SLUG_MAX_LENGTH} characters`;
  }

  if (!SLUG_PATTERN.test(slug)) {
    return "Slug may only contain lowercase letters, numbers, and hyphens (no leading or trailing hyphen)";
  }

  if (RESERVED_SLUGS.has(slug)) {
    return "That slug is reserved";
  }

  return null;
}
