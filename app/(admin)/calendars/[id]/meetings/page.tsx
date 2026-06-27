import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { MeetingsList } from "@/components/booking/meetings-list";
import { loadCalendarBundle } from "@/components/calendar-admin/load-calendar-bundle";
import { Button, PageHeader } from "@/components/ui";
import { getSchedulerId } from "@/lib/auth";
import { listMeetingsForCalendar } from "@/lib/booking/list-meetings";
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

  const initialMeetings = (await listMeetingsForCalendar(id, schedulerId)) ?? [];
  const hasMeetings = initialMeetings.length > 0;

  return (
    <>
      <PageHeader
        title="Meetings"
        subtitle="Scheduled interviews and calls for this calendar."
        className="mb-8 [&>div:nth-child(2)]:flex-col [&>div:nth-child(2)]:items-stretch sm:[&>div:nth-child(2)]:flex-row sm:[&>div:nth-child(2)]:items-start"
        actions={
          hasMeetings ? (
            <Button asChild className="w-full sm:w-auto">
              <Link href={`/calendars/${id}/book`}>Book meeting</Link>
            </Button>
          ) : undefined
        }
      />

      <MeetingsList
        calendarId={id}
        memberNames={memberNames}
        initialMeetings={initialMeetings}
      />
    </>
  );
}
