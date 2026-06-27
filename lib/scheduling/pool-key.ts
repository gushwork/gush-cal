import type { CalendarSchedulingSettings } from "@/lib/types/platform";

/** team:{teamId} when teamId set, else calendar:{calendarId} */
export function schedulingPoolKey(
  calendarId: string,
  teamId?: string,
): string {
  return teamId ? `team:${teamId}` : `calendar:${calendarId}`;
}

export function defaultSchedulingSettings(): CalendarSchedulingSettings {
  return {
    assignmentMode: "load_balanced_round_robin",
    teamSelectionMode: "url_with_default",
    defaultTeamId: null,
    rescheduleAssignment: "keep_member",
    strictRotation: {},
    weightedDeficits: {},
  };
}
