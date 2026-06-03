import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookingFlow } from "@/components/booking/booking-flow";
import { loadCalendarBundle } from "@/components/calendar-admin/load-calendar-bundle";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui";
import { getSchedulerId } from "@/lib/auth";
import { calendarPageTitle, pageTitle } from "@/lib/brand/metadata";
import type { Metadata } from "next";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) {
    return pageTitle("Book a meeting");
  }

  const { id } = await params;
  const bundle = await loadCalendarBundle(id, schedulerId);
  if (!bundle) {
    return pageTitle("Book a meeting");
  }

  return pageTitle(calendarPageTitle(bundle.name, "Book a meeting"));
}

export default async function AdminBookPage({ params }: PageProps) {
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
    <PageContainer variant="booking">
      <PageHeader
        title="Book a meeting"
        subtitle="Schedule on behalf of a candidate or internal guest."
        backHref={`/calendars/${id}`}
        backLabel={bundle.name}
      />

      <BookingFlow
        calendarName={bundle.name}
        durations={bundle.durations}
        bookingWindowDays={bundle.bookingWindowDays}
        slotsApiPath={`/api/calendars/${id}/slots`}
        confirmApiPath={`/api/calendars/${id}/book`}
        showPanelistCount
      />

      <p className="mt-6 text-sm">
        <Link
          href={`/calendars/${id}/meetings`}
          className="text-ink-muted underline decoration-border underline-offset-2 hover:text-primary"
        >
          View all meetings
        </Link>
      </p>
    </PageContainer>
  );
}
