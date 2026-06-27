export const TEAM_ALIASES = ["team", "t"] as const;
export const MEMBER_ALIASES = ["member", "m", "p"] as const;

export type ParsedBookingPath = {
  calendarSlug: string;
  teamSlug?: string;
  memberSlug?: string;
};

/** Parse `/book/{slug}/t/{team}` or `/book/{slug}/m/{member}` segments. */
export function parseBookingPath(segments: string[]): ParsedBookingPath | null {
  if (segments.length === 0) {
    return null;
  }

  const [calendarSlug, kind, slug, ...rest] = segments;
  if (!calendarSlug || rest.length > 0) {
    return null;
  }

  if (!kind) {
    return { calendarSlug };
  }

  if ((TEAM_ALIASES as readonly string[]).includes(kind) && slug) {
    return { calendarSlug, teamSlug: slug };
  }

  if ((MEMBER_ALIASES as readonly string[]).includes(kind) && slug) {
    return { calendarSlug, memberSlug: slug };
  }

  return { calendarSlug };
}

export function buildTeamPath(calendarSlug: string, teamSlug: string): string {
  return `/book/${calendarSlug}/t/${teamSlug}`;
}

export function buildMemberPath(
  calendarSlug: string,
  memberSlug: string,
): string {
  return `/book/${calendarSlug}/m/${memberSlug}`;
}
