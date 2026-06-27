import { CalendarStats } from "@/components/calendar-admin/calendar-stats";
import { loadCalendarBundle } from "@/components/calendar-admin/load-calendar-bundle";
import { getSchedulerId } from "@/lib/auth";
import { calendarPageTitle, pageTitle } from "@/lib/brand/metadata";
import type { Metadata } from "next";
import { listMeetingsForCalendar } from "@/lib/booking/list-meetings";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) {
    return pageTitle("Calendar");
  }

  const { id } = await params;
  const bundle = await loadCalendarBundle(id, schedulerId);
  if (!bundle) {
    return pageTitle("Calendar");
  }

  return pageTitle(bundle.name);
}

export default async function CalendarOverviewPage({
  params,
  searchParams,
}: PageProps) {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) {
    redirect("/login");
  }

  const { id } = await params;
  const { tab: tabParam } = await searchParams;

  if (tabParam === "members") {
    redirect(`/calendars/${id}/members`);
  }
  if (tabParam === "settings") {
    redirect(`/calendars/${id}/settings`);
  }

  const [bundle, allMeetings] = await Promise.all([
    loadCalendarBundle(id, schedulerId),
    listMeetingsForCalendar(id, schedulerId),
  ]);
  if (!bundle) {
    notFound();
  }

  const now = Date.now();
  const upcomingMeetingCount =
    allMeetings?.filter((m) => new Date(m.startsAt).getTime() >= now).length ??
    0;

  return (
    <CalendarStats
      calendarId={id}
      memberCount={bundle.members.length}
      upcomingMeetingCount={upcomingMeetingCount}
    />
  );
}
