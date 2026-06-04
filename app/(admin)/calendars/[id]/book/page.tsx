import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { BookingFlow } from "@/components/booking/booking-flow";
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
        actions={
          <Button asChild variant="secondary" size="sm" className="w-full sm:w-auto">
            <Link href={`/calendars/${id}/meetings`}>View meetings</Link>
          </Button>
        }
      />

      <Suspense
        fallback={
          <div className="py-12 text-sm text-ink-muted">Loading booking…</div>
        }
      >
        <BookingFlow
          calendarName={bundle.name}
          durations={bundle.durations}
          bookingWindowDays={bundle.bookingWindowDays}
          slotsApiPath={`/api/calendars/${id}/slots`}
          confirmApiPath={`/api/calendars/${id}/book`}
          showPanelistCount
        />
      </Suspense>
    </PageContainer>
  );
}
