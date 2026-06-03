import { ALLOWED_DURATIONS, getDefaultAppUrl } from "@/lib/constants";
import { getAllowedDomain, isAllowedEmail } from "@/lib/auth/domain";
import type { WorkingHours } from "@/lib/types";

export const DEFAULT_WORKING_HOURS: WorkingHours = [
  { day: 1, start: 540, end: 1020 },
  { day: 2, start: 540, end: 1020 },
  { day: 3, start: 540, end: 1020 },
  { day: 4, start: 540, end: 1020 },
  { day: 5, start: 540, end: 1020 },
];

export function validateDurations(durations: number[]): string | null {
  if (durations.length === 0) {
    return "At least one duration is required";
  }
  const invalid = durations.filter(
    (d) => !(ALLOWED_DURATIONS as readonly number[]).includes(d),
  );
  if (invalid.length > 0) {
    return `Invalid durations: ${invalid.join(", ")}`;
  }
  return null;
}

export function validateMemberEmail(email: string): string | null {
  const domain = getAllowedDomain();
  if (!domain) {
    return "ALLOWED_DOMAIN is not configured";
  }
  if (!isAllowedEmail(email, domain)) {
    return `Email must be on @${domain.replace(/^@/, "")}`;
  }
  return null;
}

export function getAppUrl(): string {
  return process.env.APP_URL ?? getDefaultAppUrl();
}

export function publicBookingUrl(slug: string): string {
  return `${getAppUrl()}/book/${slug}`;
}
