import { CalendarSidebar } from "@/components/calendar-admin/calendar-sidebar";
import { CopyLinkButton } from "@/components/calendar-admin/copy-link-button";
import { loadCalendarBundle } from "@/components/calendar-admin/load-calendar-bundle";
import { publicBookingUrl } from "@/components/calendar-admin/validation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui";
import { getSchedulerId } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function CalendarDetailLayout({
  children,
  params,
}: LayoutProps) {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) {
    redirect("/login");
  }

  const { id } = await params;
  const bundle = await loadCalendarBundle(id, schedulerId);
  if (!bundle) {
    notFound();
  }

  const bookingUrl = publicBookingUrl(bundle.slug);

  return (
    <PageContainer>
      <Breadcrumbs
        items={[
          { label: "Calendars", href: "/calendars" },
          { label: bundle.name },
        ]}
      />

      <PageHeader
        title={bundle.name}
        subtitle={`Public link: ${bookingUrl}`}
        actions={<CopyLinkButton url={bookingUrl} />}
      />

      <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <aside className="min-w-0 w-full shrink-0 border-b border-neutral-100 pb-6 lg:w-auto lg:border-0 lg:pb-0 lg:sticky lg:top-6 lg:self-start">
          <CalendarSidebar calendarId={id} />
        </aside>
        <div className="min-w-0 flex-1 overflow-x-hidden">{children}</div>
      </div>
    </PageContainer>
  );
}
