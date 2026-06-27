import { CalendarForm } from "@/components/calendar-admin/calendar-form";
import { loadCalendarBundle } from "@/components/calendar-admin/load-calendar-bundle";
import { PublicLinkEditor } from "@/components/calendar-admin/public-link-editor";
import { Card } from "@/components/ui";
import { getSchedulerId } from "@/lib/auth";
import { calendarPageTitle, pageTitle } from "@/lib/brand/metadata";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) {
    return pageTitle("Settings");
  }

  const { id } = await params;
  const bundle = await loadCalendarBundle(id, schedulerId);
  if (!bundle) {
    return pageTitle("Settings");
  }

  return pageTitle(calendarPageTitle(bundle.name, "Settings"));
}

export default async function CalendarSettingsPage({ params }: PageProps) {
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
    <div className="space-y-8">
      <section>
        <h2 className="text-heading font-semibold text-ink">
          Public Booking Link
        </h2>
        <Card className="mt-4">
          <PublicLinkEditor
            calendarId={id}
            slug={bundle.slug}
            showHeading={false}
          />
        </Card>
      </section>
      <section>
        <h2 className="text-heading font-semibold text-ink">
          Calendar Settings
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Timezone and default working hours apply to all members unless a member
          sets a custom schedule.
        </p>
        <Card className="mt-4">
          <CalendarForm mode="edit" calendar={bundle} />
        </Card>
      </section>
    </div>
  );
}
