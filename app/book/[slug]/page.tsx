import { notFound } from "next/navigation";
import { BookingFlow } from "@/components/booking/booking-flow";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui";
import { loadCalendarBundleBySlug } from "@/lib/booking/load-calendar-by-slug";
import { toPublicCalendar } from "@/lib/booking/to-public-meeting";
import { pageTitle } from "@/lib/brand/metadata";
import type { Metadata } from "next";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await loadCalendarBundleBySlug(slug);
  if (!bundle) {
    return pageTitle("Book");
  }

  return pageTitle(bundle.name);
}

export default async function PublicBookPage({ params }: PageProps) {
  const { slug } = await params;
  const bundle = await loadCalendarBundleBySlug(slug);

  if (!bundle) {
    notFound();
  }

  const calendar = toPublicCalendar(bundle);

  return (
    <PageContainer variant="booking">
      <PageHeader
        title={calendar.name}
        subtitle="Pick a time that works for you."
      />

      <BookingFlow
        calendarName={calendar.name}
        durations={calendar.durations}
        bookingWindowDays={calendar.bookingWindowDays}
        slotsApiPath={`/api/book/${slug}/slots`}
        confirmApiPath={`/api/book/${slug}/confirm`}
        isPublic
        showPanelistCount={false}
      />
    </PageContainer>
  );
}
