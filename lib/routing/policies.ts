import type {
  ResolveBookingTargetResult,
} from "@/lib/ports/routing";
import type { CalendarTeamPoolSettings } from "@/lib/types/platform";

export function applyTeamSelectionMode(
  calendarId: string,
  teamPool: CalendarTeamPoolSettings,
  teamIdFromForm?: string,
): ResolveBookingTargetResult {
  if (teamIdFromForm) {
    return {
      ok: true,
      target: { mode: "team", calendarId, teamId: teamIdFromForm },
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
