import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookingFlow } from "@/components/booking/booking-flow";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui";
import { publicBookingUrl } from "@/components/calendar-admin/validation";
import { loadCalendarBundleBySlug } from "@/lib/booking/load-calendar-by-slug";
import { toPublicCalendar } from "@/lib/booking/to-public-meeting";
import { getSiteName, pageTitle } from "@/lib/brand/metadata";
import type { PublicCalendar } from "@/lib/types";
import type { Metadata } from "next";

function publicBookPageSubtitle(calendar: PublicCalendar): string {
  const windowLabel =
    calendar.bookingWindowDays === 1
      ? "the next day"
      : `the next ${calendar.bookingWindowDays} days`;
  const durationLabel =
    calendar.durations.length === 1
      ? `${calendar.durations[0]} minutes`
      : `${calendar.durations.join(" or ")} minutes`;
  return `Pick a time in ${windowLabel}. Meetings are ${durationLabel}.`;
}

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await loadCalendarBundleBySlug(slug);
  if (!bundle) {
    return pageTitle("Book");
  }

  const title = bundle.name;
  const description = `Pick a time that works for you. Book with ${bundle.name} on ${getSiteName()}.`;
  const url = publicBookingUrl(slug);

  return {
    ...pageTitle(title),
    description,
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: getSiteName(),
    },
  };
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
        subtitle={publicBookPageSubtitle(calendar)}
      />

      <Suspense
        fallback={
          <div className="py-12 text-sm text-ink-muted">Loading booking…</div>
        }
      >
        <BookingFlow
          calendarName={calendar.name}
          durations={calendar.durations}
          bookingWindowDays={calendar.bookingWindowDays}
          slotsApiPath={`/api/book/${slug}/slots`}
          confirmApiPath={`/api/book/${slug}/confirm`}
          isPublic
          showPanelistCount={false}
        />
      </Suspense>
    </PageContainer>
  );
}
