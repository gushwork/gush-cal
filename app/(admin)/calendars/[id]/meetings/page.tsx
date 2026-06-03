import { notFound, redirect } from "next/navigation";
import { MeetingsList } from "@/components/booking/meetings-list";
import { loadCalendarBundle } from "@/components/calendar-admin/load-calendar-bundle";
import { PageContainer } from "@/components/layout/page-container";
import { Button, PageHeader } from "@/components/ui";
import { getSchedulerId } from "@/lib/auth";
import { calendarPageTitle, pageTitle } from "@/lib/brand/metadata";
import type { Metadata } from "next";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) {
    return pageTitle("Meetings");
  }

  const { id } = await params;
  const bundle = await loadCalendarBundle(id, schedulerId);
  if (!bundle) {
    return pageTitle("Meetings");
  }

  return pageTitle(calendarPageTitle(bundle.name, "Meetings"));
}

export default async function AdminMeetingsPage({ params }: PageProps) {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) {
    redirect("/login");
  }

  const { id } = await params;
  const bundle = await loadCalendarBundle(id, schedulerId);
  if (!bundle) {
    notFound();
  }

  const memberNames = Object.fromEntries(
    bundle.members.map((m) => [m.id, m.displayName ?? m.email]),
  );

  return (
    <PageContainer variant="default">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Meetings"
          subtitle="Scheduled interviews and calls for this calendar."
          backHref={`/calendars/${id}`}
          backLabel={`Back to ${bundle.name}`}
          className="mb-0 flex-1"
        />
        <form action={`/calendars/${id}/book`} className="shrink-0">
          <Button type="submit" variant="primary">
            Book meeting
          </Button>
        </form>
      </div>

      <MeetingsList calendarId={id} memberNames={memberNames} />
    </PageContainer>
  );
}
