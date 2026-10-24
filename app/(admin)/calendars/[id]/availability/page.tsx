import { notFound, redirect } from "next/navigation";
import {
  AvailabilityGrid,
  AvailabilityGridSkeleton,
} from "@/components/availability-grid";
import { ClientOnly } from "@/components/ui";
import { loadCalendarBundle } from "@/components/calendar-admin/load-calendar-bundle";
import { getSchedulerId } from "@/lib/auth";
import { calendarPageTitle, pageTitle } from "@/lib/brand/metadata";
import type { Metadata } from "next";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) {
    return pageTitle("Availability");
  }

  const { id } = await params;
  const bundle = await loadCalendarBundle(id, schedulerId);
  if (!bundle) {
    return pageTitle("Availability");
  }

  return pageTitle(calendarPageTitle(bundle.name, "Availability"));
}

export default async function AvailabilityPage({ params }: PageProps) {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) {
    redirect("/login");
  }

  const { id } = await params;
  const bundle = await loadCalendarBundle(id, schedulerId);
  if (!bundle) {
    notFound();
  }

  return (
    <div className="flex h-[calc(100dvh-14rem)] flex-col overflow-hidden">
      {/* Date range, labels and the "now" line use the viewer's timezone. */}
      <ClientOnly fallback={<AvailabilityGridSkeleton viewMode="day" />}>
        <AvailabilityGrid calendarId={id} bundle={bundle} />
      </ClientOnly>
    </div>
  );
}
