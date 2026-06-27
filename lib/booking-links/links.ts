import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { bookingLinks, calendarMembers, calendars, teams } from "@/lib/db/schema";
import type { BookingLinkRow } from "@/lib/db/schema";
import { buildMemberPath, buildTeamPath } from "@/lib/routing/paths";
import type { BookingLink, BookingLinkKind } from "@/lib/types/platform";
import { deriveMemberSlugBase, ensureUniqueSlug } from "./slug";

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

async function resolveSlugForCreate(
  calendarId: string,
  input: CreateBookingLinkInput,
): Promise<string> {
  if (input.slug) {
    return input.slug;
  }
  if (input.kind === "member" && input.memberId) {
    const [member] = await getDb()
      .select({
        email: calendarMembers.email,
        displayName: calendarMembers.displayName,
      })
      .from(calendarMembers)
      .where(
        and(
          eq(calendarMembers.id, input.memberId),
          eq(calendarMembers.calendarId, calendarId),
        ),
      )
      .limit(1);
    if (!member) {
      throw new Error("Member not found");
    }
    const base = deriveMemberSlugBase(member.displayName, member.email);
    return ensureUniqueSlug(base, await existingSlugs(calendarId));
  }
  throw new Error("slug is required");
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
  const slug = await resolveSlugForCreate(calendarId, input);
  const taken = await existingSlugs(calendarId);
  if (taken.has(slug)) {
    throw new Error(`Slug "${slug}" is already taken`);
  }

  const [row] = await getDb()
    .insert(bookingLinks)
    .values({
      calendarId,
      kind: input.kind,
      slug,
      teamId: input.kind === "team" ? (input.teamId ?? null) : null,
      memberId: input.kind === "member" ? (input.memberId ?? null) : null,
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
  if (input.slug) {
    const taken = await existingSlugs(calendarId);
    const [current] = await getDb()
      .select({ slug: bookingLinks.slug })
      .from(bookingLinks)
      .where(
        and(eq(bookingLinks.id, linkId), eq(bookingLinks.calendarId, calendarId)),
      )
      .limit(1);
    if (current && input.slug !== current.slug && taken.has(input.slug)) {
      throw new Error(`Slug "${input.slug}" is already taken`);
    }
  }

  const [row] = await getDb()
    .update(bookingLinks)
    .set({
      ...(input.slug != null ? { slug: input.slug } : {}),
      ...(input.redirectOverride !== undefined
        ? { redirectOverride: input.redirectOverride }
        : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
    })
    .where(
      and(eq(bookingLinks.id, linkId), eq(bookingLinks.calendarId, calendarId)),
    )
    .returning();

  if (!row) {
    return null;
  }

  if (input.slug != null && row.kind === "team" && row.teamId) {
    await getDb()
      .update(teams)
      .set({ slug: input.slug })
      .where(
        and(eq(teams.id, row.teamId), eq(teams.calendarId, calendarId)),
      );
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

  const link = toBookingLink(row, calendarSlug);
  return {
    link,
    ...(link.memberId ? { memberId: link.memberId } : {}),
    ...(link.teamId ? { teamId: link.teamId } : {}),
  };
}
