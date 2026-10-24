import { SchedulingPanel } from "@/components/calendar-admin/scheduling/scheduling-panel";
import { loadCalendarBundle } from "@/components/calendar-admin/load-calendar-bundle";
import { getSchedulerId } from "@/lib/auth";
import { loadClientCalendarSettings } from "@/lib/scheduling/load-scheduling-settings";
import { calendarPageTitle, pageTitle } from "@/lib/brand/metadata";
import { listTeams } from "@/lib/teams/teams";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) {
    return pageTitle("Scheduling");
  }
  const { id } = await params;
  const bundle = await loadCalendarBundle(id, schedulerId);
  if (!bundle) {
    return pageTitle("Scheduling");
  }
  return pageTitle(calendarPageTitle(bundle.name, "Scheduling"));
}

export default async function CalendarSchedulingPage({ params }: PageProps) {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) {
    redirect("/login");
  }

  const { id } = await params;
  const [bundle, teams, settings] = await Promise.all([
    loadCalendarBundle(id, schedulerId),
    listTeams(id),
    loadClientCalendarSettings(id),
  ]);
  if (!bundle) {
    notFound();
  }

  return (
    <SchedulingPanel
      calendarId={id}
      calendarName={bundle.name}
      teams={teams}
      members={bundle.members}
      initialSettings={settings}
    />
  );
}
