import type {
  ResolveBookingTargetResult,
} from "@/lib/ports/routing";
import type { CalendarTeamPoolSettings } from "@/lib/types/platform";
import { getTeam } from "@/lib/teams/teams";

export async function applyTeamSelectionMode(
  calendarId: string,
  teamPool: CalendarTeamPoolSettings,
  teamIdFromForm?: string,
): Promise<ResolveBookingTargetResult> {
  if (teamIdFromForm) {
    // BUG-039: never trust a form-supplied team id; verify it belongs here.
    const team = await getTeam(calendarId, teamIdFromForm);
    if (!team) {
      return { ok: false, code: "TEAM_REQUIRED" };
    }
    return {
      ok: true,
      target: { mode: "team", calendarId, teamId: team.id },
    };
  }

  if (
    teamPool.teamSelectionMode === "url_with_default" &&
    teamPool.defaultTeamId
  ) {
    return {
      ok: true,
      target: {
        mode: "team",
        calendarId,
        teamId: teamPool.defaultTeamId,
      },
    };
  }

  return { ok: false, code: "TEAM_REQUIRED" };
}

export function applyUnbookableOwnerFallback(
  calendarId: string,
  teamPool: CalendarTeamPoolSettings,
): ResolveBookingTargetResult {
  if (!teamPool.defaultTeamId) {
    return { ok: false, code: "TEAM_REQUIRED" };
  }

  return {
    ok: true,
    target: {
      mode: "team",
      calendarId,
      teamId: teamPool.defaultTeamId,
    },
  };
}
