import { NextResponse } from "next/server";
import { loadCalendarBundleBySlug } from "@/lib/booking/load-calendar-by-slug";
import { toPublicCalendar } from "@/lib/booking/to-public-meeting";
import { loadCalendarRoutingSettings } from "@/lib/routing/load-settings";
import { loadCalendarSchedulingSettings } from "@/lib/scheduling/load-scheduling-settings";
import { listTeams } from "@/lib/teams/teams";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { slug } = await params;
  const bundle = await loadCalendarBundleBySlug(slug);

  if (!bundle) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }

  let teams: { id: string; name: string; slug: string }[] = [];
  let settings: {
    teamSelectionMode: string;
    ownerNoSlotsPolicy: string;
  } | null = null;

  try {
    const [teamRows, routing, scheduling] = await Promise.all([
      listTeams(bundle.id),
      loadCalendarRoutingSettings(bundle.id),
      loadCalendarSchedulingSettings(bundle.id),
    ]);
    teams = teamRows.map((team) => ({
      id: team.id,
      name: team.name,
      slug: team.slug,
    }));
    settings = {
      teamSelectionMode: scheduling.teamSelectionMode,
      ownerNoSlotsPolicy: routing.ownerNoSlotsPolicy,
    };
  } catch {
    // DB unavailable in stub/test environments
  }

  return NextResponse.json({
    calendar: toPublicCalendar(bundle),
    ...(teams.length > 0 ? { teams } : {}),
    ...(settings ? { settings } : {}),
  });
}
