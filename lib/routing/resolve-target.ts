import { eq } from "drizzle-orm";
import {
  findBookingLinkBySlug,
  resolveBookingLink,
} from "@/lib/booking-links/links";
import { getDb } from "@/lib/db/client";
import type { AppDatabase } from "@/lib/db/client";
import { calendarMembers } from "@/lib/db/schema";
import type { EventsPort } from "@/lib/ports/events";
import type {
  ResolveBookingTargetInput,
  ResolveBookingTargetResult,
} from "@/lib/ports/routing";
import type { SalesforcePort } from "@/lib/ports/salesforce";
import { getTeamBySlug } from "@/lib/teams/teams";
import { loadCalendarSchedulingSettings } from "@/lib/scheduling/load-scheduling-settings";
import { loadCalendarRoutingSettings } from "./load-settings";
import {
  applyTeamSelectionMode,
  applyUnbookableOwnerFallback,
} from "./policies";

export type RoutingDeps = {
  salesforce: SalesforcePort;
  events: EventsPort;
};

let dbOverride: AppDatabase | null = null;

/** @internal test seam */
export function setRoutingDbForTest(db: AppDatabase | null): void {
  dbOverride = db;
}

function db() {
  return dbOverride ?? getDb();
}

async function findMemberIdByEmail(
  calendarId: string,
  email: string,
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  const rows = await db()
    .select({ id: calendarMembers.id, email: calendarMembers.email })
    .from(calendarMembers)
    .where(eq(calendarMembers.calendarId, calendarId));

  const match = rows.find((row) => row.email.toLowerCase() === normalized);
  return match?.id ?? null;
}

export async function resolveBookingTarget(
  input: ResolveBookingTargetInput,
  deps: RoutingDeps,
): Promise<ResolveBookingTargetResult> {
  const { calendarId, urlContext, guestEmail, teamIdFromForm } = input;
  const scheduling = await loadCalendarSchedulingSettings(calendarId);
  // BUG-036: load routing settings so the owner policies are actually applied.
  // ownerNoSlotsPolicy is honored at the slot layer (surfaced via /api/book/[slug])
  // since this resolver has no slot visibility.
  const routing = await loadCalendarRoutingSettings(calendarId);
  const teamPool = {
    teamSelectionMode: scheduling.teamSelectionMode,
    defaultTeamId: scheduling.defaultTeamId,
  };

  if (urlContext.memberSlug) {
    const resolved = await resolveBookingLink(
      calendarId,
      urlContext.memberSlug,
    );
    if (!resolved) {
      return { ok: false, code: "MEMBER_NOT_FOUND" };
    }
    if (resolved.memberId) {
      return {
        ok: true,
        target: {
          mode: "member",
          calendarId,
          memberId: resolved.memberId,
        },
      };
    }
    if (resolved.teamId) {
      return {
        ok: true,
        target: { mode: "team", calendarId, teamId: resolved.teamId },
      };
    }
    return { ok: false, code: "MEMBER_NOT_FOUND" };
  }

  if (guestEmail) {
    const sfResult = await deps.salesforce.lookupLeadOwner(
      calendarId,
      guestEmail,
    );
    if (sfResult.ok) {
      const memberId = await findMemberIdByEmail(
        calendarId,
        sfResult.ownerEmail,
      );
      if (memberId) {
        return {
          ok: true,
          target: { mode: "owner", calendarId, memberId },
        };
      }

      const fallback = applyUnbookableOwnerFallback(calendarId, teamPool);
      // BUG-036: only "...reassign" schedules a later reassignment to the owner;
      // plain fallback just routes to the pool with no overflow event.
      if (
        fallback.ok &&
        teamPool.defaultTeamId &&
        routing.unbookableOwnerPolicy === "fallback_team_pool_reassign"
      ) {
        await deps.events.emit({
          calendarId,
          eventType: "routing.owner_overflow",
          payload: {
            guestEmail,
            ownerEmail: sfResult.ownerEmail,
            teamId: teamPool.defaultTeamId,
          },
        });
      }
      return fallback;
    }
  }

  if (urlContext.teamSlug) {
    // BUG-013: resolve through booking_links so the `enabled` flag is honored
    // (a disabled team/calendar link is not bookable).
    const link = await findBookingLinkBySlug(calendarId, urlContext.teamSlug);
    if (link) {
      if (!link.enabled) {
        return { ok: false, code: "TEAM_REQUIRED" };
      }
      if (link.teamId) {
        return {
          ok: true,
          target: { mode: "team", calendarId, teamId: link.teamId },
        };
      }
      if (link.memberId) {
        return {
          ok: true,
          target: { mode: "member", calendarId, memberId: link.memberId },
        };
      }
      // calendar-kind link under /t/ — fall through to team selection.
    } else {
      // No booking link for this slug: fall back to a direct team lookup so
      // teams without an explicit link still resolve.
      const team = await getTeamBySlug(calendarId, urlContext.teamSlug);
      if (!team) {
        return { ok: false, code: "TEAM_REQUIRED" };
      }
      return {
        ok: true,
        target: { mode: "team", calendarId, teamId: team.id },
      };
    }
  }

  // BUG-039: teamIdFromForm is validated inside the helper.
  return applyTeamSelectionMode(calendarId, teamPool, teamIdFromForm);
}
