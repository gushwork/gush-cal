import { CalendarAnalyticsDashboard } from "@/components/analytics/calendar-analytics-dashboard";
import { loadCalendarBundle } from "@/components/calendar-admin/load-calendar-bundle";
import { computeCalendarAnalytics } from "@/lib/analytics/calendar-analytics";
import { loadCalendarAnalyticsData } from "@/lib/analytics/load-calendar-analytics";
import { parseAnalyticsRange } from "@/lib/analytics/time";
import { getSchedulerId } from "@/lib/auth";
import { calendarPageTitle, pageTitle } from "@/lib/brand/metadata";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string | string[] }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) return pageTitle("Analytics");
  const { id } = await params;
  const bundle = await loadCalendarBundle(id, schedulerId);
  return pageTitle(bundle ? calendarPageTitle(bundle.name, "Analytics") : "Analytics");
}

export default async function CalendarAnalyticsPage({ params, searchParams }: PageProps) {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) {
    redirect("/login");
  }

  const [{ id }, { range: rangeParam }] = await Promise.all([params, searchParams]);
  const range = parseAnalyticsRange(rangeParam);
  const now = new Date();

  // Ownership check and analytics rows load in parallel; nothing renders
  // unless the Scheduler owns the Calendar.
  const [bundle, data] = await Promise.all([
    loadCalendarBundle(id, schedulerId),
    loadCalendarAnalyticsData(id, range, now),
  ]);
  if (!bundle) {
    notFound();
  }

  const analytics = computeCalendarAnalytics({
    ...data,
    members: bundle.members,
    timeZone: bundle.timezone,
    now,
    rangeDays: range,
  });

  return <CalendarAnalyticsDashboard calendarId={id} range={range} analytics={analytics} />;
}
