import { IntegrationsPanel } from "@/components/calendar-admin/integrations/integrations-panel";
import { loadCalendarBundle } from "@/components/calendar-admin/load-calendar-bundle";
import { getSchedulerId } from "@/lib/auth";
import { listWebhookEndpoints } from "@/lib/events/webhooks";
import { getConnectionStatus } from "@/lib/salesforce/connections";
import { listFieldMaps } from "@/lib/salesforce/field-map";
import { calendarPageTitle, pageTitle } from "@/lib/brand/metadata";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) {
    return pageTitle("Integrations");
  }
  const { id } = await params;
  const bundle = await loadCalendarBundle(id, schedulerId);
  if (!bundle) {
    return pageTitle("Integrations");
  }
  return pageTitle(calendarPageTitle(bundle.name, "Integrations"));
}

export default async function CalendarIntegrationsPage({ params }: PageProps) {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) {
    redirect("/login");
  }

  const { id } = await params;
  const [bundle, salesforce, fieldMaps, webhooks] = await Promise.all([
    loadCalendarBundle(id, schedulerId),
    getConnectionStatus(id),
    listFieldMaps(id),
    listWebhookEndpoints(id),
  ]);
  if (!bundle) {
    notFound();
  }

  return (
    <IntegrationsPanel
      calendarId={id}
      calendarName={bundle.name}
      initialData={{ salesforce, fieldMaps, webhooks }}
    />
  );
}
