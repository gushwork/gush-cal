import { loadCalendarRoutingSettings } from "@/lib/routing/load-settings";
import { loadCalendarSchedulingSettings } from "@/lib/scheduling/load-scheduling-settings";
import { listTeams } from "@/lib/teams/teams";

export type PublicBookingTeam = { id: string; name: string; slug: string };

export type PublicBookingMetadata = {
  teams: PublicBookingTeam[];
  settings: {
    teamSelectionMode: string;
    ownerNoSlotsPolicy: string;
  } | null;
};

/** Teams and routing settings the public booking flow needs (no Member data). */
export async function loadPublicBookingMetadata(
  calendarId: string,
): Promise<PublicBookingMetadata> {
  try {
    const [teamRows, routing, scheduling] = await Promise.all([
      listTeams(calendarId),
      loadCalendarRoutingSettings(calendarId),
      loadCalendarSchedulingSettings(calendarId),
    ]);
    return {
      teams: teamRows.map((team) => ({
        id: team.id,
        name: team.name,
        slug: team.slug,
      })),
      settings: {
        teamSelectionMode: scheduling.teamSelectionMode,
        ownerNoSlotsPolicy: routing.ownerNoSlotsPolicy,
      },
    };
  } catch {
    // DB unavailable in stub/test environments
    return { teams: [], settings: null };
  }
}
