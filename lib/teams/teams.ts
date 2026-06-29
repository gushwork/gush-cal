import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import type { AppDatabase } from "@/lib/db/client";
import {
  bookingLinks,
  calendarMembers,
  calendarSettings,
  teamMembers,
  teams,
} from "@/lib/db/schema";
import type { Team } from "@/lib/types";
import { normalizeCalendarSettings } from "@/lib/scheduling/normalize-settings";
import { normalizeTeamSlug, validateTeamSlug } from "./validate-team-slug";

let dbOverride: AppDatabase | null = null;

/** @internal test seam */
export function setTeamsDbForTest(db: AppDatabase | null) {
  dbOverride = db;
}

function db() {
  return dbOverride ?? getDb();
}

type AppTransaction = Parameters<Parameters<AppDatabase["transaction"]>[0]>[0];

/**
 * Run `fn` inside a DB transaction. Falls back to the plain connection when the
 * driver has no `transaction` (the lightweight test seam) so units stay simple.
 */
async function withTransaction<T>(
  fn: (tx: AppTransaction) => Promise<T>,
): Promise<T> {
  const conn = db();
  return typeof conn.transaction === "function"
    ? conn.transaction(fn)
    : fn(conn as unknown as AppTransaction);
}

export type CreateTeamInput = {
  name: string;
  slug: string;
  memberIds?: string[];
};

export type UpdateTeamInput = {
  name?: string;
  slug?: string;
  sortOrder?: number;
};

export type TeamMutationResult =
  | { ok: true; team: Team }
  | { ok: false; code: "NOT_FOUND" | "SLUG_TAKEN" | "INVALID_SLUG" | "INVALID_MEMBERS" };

export type TeamDeleteResult =
  | { ok: true }
  | { ok: false; code: "NOT_FOUND" | "DEFAULT_TEAM" };

export type TeamMembersResult =
  | { ok: true; memberIds: string[] }
  | { ok: false; code: "NOT_FOUND" | "INVALID_MEMBERS" };

function toTeam(row: typeof teams.$inferSelect): Team {
  return {
    id: row.id,
    calendarId: row.calendarId,
    name: row.name,
    slug: row.slug,
    sortOrder: row.sortOrder,
  };
}

async function slugTaken(
  calendarId: string,
  slug: string,
  excludeTeamId?: string,
): Promise<boolean> {
  const [row] = await db()
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.calendarId, calendarId), eq(teams.slug, slug)))
    .limit(1);
  return row != null && row.id !== excludeTeamId;
}

/**
 * BUG-002: a team slug is mirrored onto its booking link, so a rename must also
 * be free across `booking_links` (excluding the team's own synced link).
 */
async function bookingLinkSlugTaken(
  calendarId: string,
  slug: string,
  excludeTeamId: string,
): Promise<boolean> {
  const rows = await db()
    .select({ teamId: bookingLinks.teamId })
    .from(bookingLinks)
    .where(
      and(eq(bookingLinks.calendarId, calendarId), eq(bookingLinks.slug, slug)),
    );
  return rows.some((row) => row.teamId !== excludeTeamId);
}

async function membersOnCalendar(
  calendarId: string,
  memberIds: string[],
): Promise<boolean> {
  if (memberIds.length === 0) {
    return true;
  }
  const rows = await db()
    .select({ id: calendarMembers.id })
    .from(calendarMembers)
    .where(eq(calendarMembers.calendarId, calendarId));
  const valid = new Set(rows.map((row) => row.id));
  return memberIds.every((id) => valid.has(id));
}

export async function listTeams(calendarId: string): Promise<Team[]> {
  const rows = await db()
    .select()
    .from(teams)
    .where(eq(teams.calendarId, calendarId))
    .orderBy(asc(teams.sortOrder));
  return rows.map(toTeam);
}

export async function getTeam(
  calendarId: string,
  teamId: string,
): Promise<Team | null> {
  const [row] = await db()
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.calendarId, calendarId)))
    .limit(1);
  return row ? toTeam(row) : null;
}

export async function getTeamBySlug(
  calendarId: string,
  slug: string,
): Promise<Team | null> {
  const normalized = normalizeTeamSlug(slug);
  const [row] = await db()
    .select()
    .from(teams)
    .where(and(eq(teams.calendarId, calendarId), eq(teams.slug, normalized)))
    .limit(1);
  return row ? toTeam(row) : null;
}

export async function getTeamMemberIds(
  teamId: string,
  calendarId?: string,
): Promise<string[]> {
  // BUG-056: when the calendar is known, confirm the team belongs to it.
  if (calendarId && !(await getTeam(calendarId, teamId))) {
    return [];
  }
  const rows = await db()
    .select({ memberId: teamMembers.memberId })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));
  return rows.map((row) => row.memberId);
}

export async function createTeam(
  calendarId: string,
  input: CreateTeamInput,
): Promise<TeamMutationResult> {
  const slug = normalizeTeamSlug(input.slug);
  const slugError = validateTeamSlug(slug);
  if (slugError) {
    return { ok: false, code: "INVALID_SLUG" };
  }

  const memberIds = input.memberIds ?? [];
  if (!(await membersOnCalendar(calendarId, memberIds))) {
    return { ok: false, code: "INVALID_MEMBERS" };
  }

  if (await slugTaken(calendarId, slug)) {
    return { ok: false, code: "SLUG_TAKEN" };
  }

  const existingTeams = await listTeams(calendarId);
  const nextSortOrder =
    existingTeams.length > 0
      ? Math.max(...existingTeams.map((team) => team.sortOrder)) + 1
      : 1;

  const [row] = await db()
    .insert(teams)
    .values({
      calendarId,
      name: input.name.trim(),
      slug,
      sortOrder: nextSortOrder,
    })
    .returning();

  if (!row) {
    return { ok: false, code: "NOT_FOUND" };
  }

  if (memberIds.length > 0) {
    await db()
      .insert(teamMembers)
      .values(memberIds.map((memberId) => ({ teamId: row.id, memberId })));
  }

  return { ok: true, team: toTeam(row) };
}

export async function updateTeam(
  calendarId: string,
  teamId: string,
  input: UpdateTeamInput,
): Promise<TeamMutationResult> {
  const existing = await getTeam(calendarId, teamId);
  if (!existing) {
    return { ok: false, code: "NOT_FOUND" };
  }

  let slug = existing.slug;
  if (input.slug !== undefined) {
    slug = normalizeTeamSlug(input.slug);
    const slugError = validateTeamSlug(slug);
    if (slugError) {
      return { ok: false, code: "INVALID_SLUG" };
    }
    if (slug !== existing.slug) {
      if (
        (await slugTaken(calendarId, slug, teamId)) ||
        (await bookingLinkSlugTaken(calendarId, slug, teamId))
      ) {
        return { ok: false, code: "SLUG_TAKEN" };
      }
    }
  }

  const slugChanged = input.slug !== undefined && slug !== existing.slug;

  // BUG-002: update team and mirror its booking link slug atomically.
  const row = await withTransaction(async (tx) => {
    const [updated] = await tx
      .update(teams)
      .set({
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.slug !== undefined ? { slug } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      })
      .where(and(eq(teams.id, teamId), eq(teams.calendarId, calendarId)))
      .returning();

    if (updated && slugChanged) {
      await tx
        .update(bookingLinks)
        .set({ slug })
        .where(
          and(
            eq(bookingLinks.calendarId, calendarId),
            eq(bookingLinks.teamId, teamId),
            eq(bookingLinks.kind, "team"),
          ),
        );
    }
    return updated ?? null;
  });

  if (!row) {
    return { ok: false, code: "NOT_FOUND" };
  }

  return { ok: true, team: toTeam(row) };
}

export async function deleteTeam(
  calendarId: string,
  teamId: string,
): Promise<TeamDeleteResult> {
  const existing = await getTeam(calendarId, teamId);
  if (!existing) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const [settingsRow] = await db()
    .select()
    .from(calendarSettings)
    .where(eq(calendarSettings.calendarId, calendarId))
    .limit(1);

  const settings = settingsRow
    ? normalizeCalendarSettings(settingsRow.settings)
    : null;

  if (settings?.scheduling.defaultTeamId === teamId) {
    return { ok: false, code: "DEFAULT_TEAM" };
  }

  // BUG-012: delete the team's booking links first (FK is set-null, which would
  // otherwise leave an orphaned, still-listed /t/{slug} link), then the team.
  await withTransaction(async (tx) => {
    await tx
      .delete(bookingLinks)
      .where(
        and(
          eq(bookingLinks.calendarId, calendarId),
          eq(bookingLinks.teamId, teamId),
        ),
      );
    await tx
      .delete(teams)
      .where(and(eq(teams.id, teamId), eq(teams.calendarId, calendarId)));
  });

  return { ok: true };
}

export async function replaceTeamMembers(
  calendarId: string,
  teamId: string,
  memberIds: string[],
): Promise<TeamMembersResult> {
  const existing = await getTeam(calendarId, teamId);
  if (!existing) {
    return { ok: false, code: "NOT_FOUND" };
  }

  if (!(await membersOnCalendar(calendarId, memberIds))) {
    return { ok: false, code: "INVALID_MEMBERS" };
  }

  await db().delete(teamMembers).where(eq(teamMembers.teamId, teamId));

  if (memberIds.length > 0) {
    await db()
      .insert(teamMembers)
      .values(memberIds.map((memberId) => ({ teamId, memberId })));
  }

  return { ok: true, memberIds };
}
