import type {
  CalendarSettings,
  CalendarTeamPoolSettings,
} from "@/lib/types/platform";

export function teamPoolFromSettings(
  settings: CalendarSettings,
): CalendarTeamPoolSettings {
  return {
    teamSelectionMode: settings.scheduling.teamSelectionMode,
    defaultTeamId: settings.scheduling.defaultTeamId,
  };
}
