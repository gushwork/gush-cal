import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import type { AppDatabase } from "@/lib/db/client";
import { bookingLinks, calendarMembers, calendars, teams } from "@/lib/db/schema";
import type { BookingLinkRow } from "@/lib/db/schema";
import { buildMemberPath, buildTeamPath } from "@/lib/routing/paths";
import type { BookingLink, BookingLinkKind } from "@/lib/types/platform";
import { deriveMemberSlugBase, ensureUniqueSlug } from "./slug";

/** Typed conflict so routes can map slug collisions to 409. */
export class BookingLinkSlugTakenError extends Error {
  constructor(slug: string) {
    super(`Slug "${slug}" is already taken`);
    this.name = "BookingLinkSlugTakenError";
  }
}

/** BUG-059: Postgres unique-violation (23505) — a real slug/race conflict. */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "23505"
  );
}

type AppTransaction = Parameters<Parameters<AppDatabase["transaction"]>[0]>[0];

/**
 * Run `fn` in a DB transaction. Falls back to the plain connection when the
 * driver has no `transaction` (the unit-test mock) so tests stay simple.
 */
async function withTransaction<T>(
  fn: (tx: AppTransaction) => Promise<T>,
): Promise<T> {
  const conn = getDb();
  return typeof conn.transaction === "function"
    ? conn.transaction(fn)
    : fn(conn as unknown as AppTransaction);
}

export type CreateBookingLinkInput = {
  kind: BookingLinkKind;
  slug?: string;
  teamId?: string | null;
  memberId?: string | null;
  redirectOverride?: string | null;
  enabled?: boolean;
};

export type UpdateBookingLinkInput = {
  slug?: string;
  redirectOverride?: string | null;
  enabled?: boolean;
};

export type ResolvedBookingLink = {
  link: BookingLink;
  memberId?: string;
  teamId?: string;
};

export function buildPublicUrl(
  calendarSlug: string,
  link: Pick<BookingLink, "kind" | "slug">,
): string {
  if (link.kind === "team") {
    return buildTeamPath(calendarSlug, link.slug);
  }
  if (link.kind === "member") {
    return buildMemberPath(calendarSlug, link.slug);
  }
  // BUG-060: ponytail: calendar-kind links require a slug at the API boundary
  // but the public URL ignores it. Upgrade path: drop the required slug for
  // calendar kind, or honor it as a path alias.
  return `/book/${calendarSlug}`;
}

function toBookingLink(row: BookingLinkRow, calendarSlug: string): BookingLink {
  return {
    id: row.id,
    calendarId: row.calendarId,
    kind: row.kind,
    slug: row.slug,
    teamId: row.teamId,
    memberId: row.memberId,
    redirectOverride: row.redirectOverride,
    enabled: row.enabled,
    publicUrl: buildPublicUrl(calendarSlug, row),
  };
}

async function getCalendarSlug(calendarId: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ slug: calendars.slug })
    .from(calendars)
    .where(eq(calendars.id, calendarId))
    .limit(1);
  return row?.slug ?? null;
}

async function existingSlugs(calendarId: string): Promise<Set<string>> {
  const rows = await getDb()
    .select({ slug: bookingLinks.slug })
    .from(bookingLinks)
    .where(eq(bookingLinks.calendarId, calendarId));
  return new Set(rows.map((r) => r.slug));
}

async function getTeamForCalendar(
  calendarId: string,
  teamId: string,
): Promise<{ slug: string } | null> {
  const [row] = await getDb()
    .select({ slug: teams.slug })
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.calendarId, calendarId)))
    .limit(1);
  return row ?? null;
}

async function getMemberForCalendar(
  calendarId: string,
  memberId: string,
): Promise<{ email: string; displayName: string | null } | null> {
  const [row] = await getDb()
    .select({
      email: calendarMembers.email,
      displayName: calendarMembers.displayName,
    })
    .from(calendarMembers)
    .where(
      and(
        eq(calendarMembers.id, memberId),
        eq(calendarMembers.calendarId, calendarId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** BUG-002/016b: is `slug` used by another booking link in this calendar? */
async function bookingLinkSlugConflict(
  calendarId: string,
  slug: string,
  excludeLinkId: string,
): Promise<boolean> {
  const rows = await getDb()
    .select({ id: bookingLinks.id })
    .from(bookingLinks)
    .where(
      and(eq(bookingLinks.calendarId, calendarId), eq(bookingLinks.slug, slug)),
    );
  return rows.some((row) => row.id !== excludeLinkId);
}

/** BUG-002/016b: is `slug` used by another team in this calendar? */
async function teamSlugConflict(
  calendarId: string,
  slug: string,
  excludeTeamId: string,
): Promise<boolean> {
  const rows = await getDb()
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.calendarId, calendarId), eq(teams.slug, slug)));
  return rows.some((row) => row.id !== excludeTeamId);
}

async function resolveSlugForCreate(
  calendarId: string,
  input: CreateBookingLinkInput,
  taken: Set<string>,
): Promise<string> {
  if (input.kind === "team") {
    // BUG-014 + BUG-015: the team must belong to this calendar and the link
    // slug is forced to the team slug so /t/{slug} can never 404.
    const team = input.teamId
      ? await getTeamForCalendar(calendarId, input.teamId)
      : null;
    if (!team) {
      throw new Error("Team not found");
    }
    return team.slug;
  }

  if (input.kind === "member") {
    // BUG-015: the member must belong to this calendar.
    const member = input.memberId
      ? await getMemberForCalendar(calendarId, input.memberId)
      : null;
    if (!member) {
      throw new Error("Member not found");
    }
    if (input.slug) {
      return input.slug;
    }
    const base = deriveMemberSlugBase(member.displayName, member.email);
    return ensureUniqueSlug(base, taken);
  }

  if (!input.slug) {
    throw new Error("slug is required");
  }
  return input.slug;
}

export async function listBookingLinks(calendarId: string): Promise<BookingLink[]> {
  const rows = await getDb()
    .select()
    .from(bookingLinks)
    .where(eq(bookingLinks.calendarId, calendarId))
    .orderBy(asc(bookingLinks.slug));

  const calendarSlug = await getCalendarSlug(calendarId);
  if (!calendarSlug) {
    return [];
  }
  return rows.map((row) => toBookingLink(row, calendarSlug));
}

export async function createBookingLink(
  calendarId: string,
  input: CreateBookingLinkInput,
): Promise<BookingLink> {
  const taken = await existingSlugs(calendarId);
  const slug = await resolveSlugForCreate(calendarId, input, taken);
  if (taken.has(slug)) {
    throw new BookingLinkSlugTakenError(slug);
  }

  const [row] = await getDb()
    .insert(bookingLinks)
    .values({
      calendarId,
      kind: input.kind,
      slug,
      teamId: input.kind === "team" ? (input.teamId ?? null) : null,
      memberId: input.kind === "member" ? (input.memberId ?? null) : null,
      // BUG-057: ponytail: redirectOverride is stored but not yet consumed by
      // the resolve/page layer. Wire into post-book redirect when that lands.
      redirectOverride: input.redirectOverride ?? null,
      enabled: input.enabled ?? true,
    })
    .returning();

  const calendarSlug = await getCalendarSlug(calendarId);
  if (!row || !calendarSlug) {
    throw new Error("Failed to create booking link");
  }
  return toBookingLink(row, calendarSlug);
}

export async function updateBookingLink(
  calendarId: string,
  linkId: string,
  input: UpdateBookingLinkInput,
): Promise<BookingLink | null> {
  const [current] = await getDb()
    .select({
      slug: bookingLinks.slug,
      kind: bookingLinks.kind,
      teamId: bookingLinks.teamId,
    })
    .from(bookingLinks)
    .where(
      and(eq(bookingLinks.id, linkId), eq(bookingLinks.calendarId, calendarId)),
    )
    .limit(1);
  if (!current) {
    return null;
  }

  const slugChanged = input.slug != null && input.slug !== current.slug;
  if (slugChanged) {
    const slug = input.slug as string;
    // BUG-002/016b: a slug change must be free across booking_links AND teams,
    // since it is mirrored onto the linked team.
    if (await bookingLinkSlugConflict(calendarId, slug, linkId)) {
      throw new BookingLinkSlugTakenError(slug);
    }
    if (
      current.kind === "team" &&
      current.teamId &&
      (await teamSlugConflict(calendarId, slug, current.teamId))
    ) {
      throw new BookingLinkSlugTakenError(slug);
    }
  }

  // BUG-002/016b: update link and mirror the team slug atomically.
  const row = await withTransaction(async (tx) => {
    const [updated] = await tx
      .update(bookingLinks)
      .set({
        ...(input.slug != null ? { slug: input.slug } : {}),
        ...(input.redirectOverride !== undefined
          ? { redirectOverride: input.redirectOverride }
          : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      })
      .where(
        and(
          eq(bookingLinks.id, linkId),
          eq(bookingLinks.calendarId, calendarId),
        ),
      )
      .returning();

    if (updated && slugChanged && updated.kind === "team" && updated.teamId) {
      await tx
        .update(teams)
        .set({ slug: updated.slug })
        .where(and(eq(teams.id, updated.teamId), eq(teams.calendarId, calendarId)));
    }
    return updated ?? null;
  });

  if (!row) {
    return null;
  }

  const calendarSlug = await getCalendarSlug(calendarId);
  if (!calendarSlug) {
    return null;
  }
  return toBookingLink(row, calendarSlug);
}

export async function deleteBookingLink(
  calendarId: string,
  linkId: string,
): Promise<boolean> {
  const deleted = await getDb()
    .delete(bookingLinks)
    .where(
      and(eq(bookingLinks.id, linkId), eq(bookingLinks.calendarId, calendarId)),
    )
    .returning({ id: bookingLinks.id });
  return deleted.length > 0;
}

export async function resolveBookingLink(
  calendarId: string,
  slug: string,
): Promise<ResolvedBookingLink | null> {
  const [row] = await getDb()
    .select()
    .from(bookingLinks)
    .where(
      and(eq(bookingLinks.calendarId, calendarId), eq(bookingLinks.slug, slug)),
    )
    .limit(1);

  if (!row || !row.enabled) {
    return null;
  }

  const calendarSlug = await getCalendarSlug(calendarId);
  if (!calendarSlug) {
    return null;
  }

  // BUG-058: ponytail: a team-kind link whose teamId went null (FK set-null on a
  // raw/legacy team delete) resolves to neither team nor member here and is
  // simply not bookable — fails safe. deleteTeam now removes these proactively.
  const link = toBookingLink(row, calendarSlug);
  return {
    link,
    ...(link.memberId ? { memberId: link.memberId } : {}),
    ...(link.teamId ? { teamId: link.teamId } : {}),
  };
}

/**
 * BUG-013: load the raw link row by slug (enabled or not) so routing can honor
 * the `enabled` flag instead of bypassing booking_links via getTeamBySlug.
 */
export async function findBookingLinkBySlug(
  calendarId: string,
  slug: string,
): Promise<BookingLinkRow | null> {
  const [row] = await getDb()
    .select()
    .from(bookingLinks)
    .where(
      and(eq(bookingLinks.calendarId, calendarId), eq(bookingLinks.slug, slug)),
    )
    .limit(1);
  return row ?? null;
}
