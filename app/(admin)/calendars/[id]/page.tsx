import { CalendarActionBar } from "@/components/calendar-admin/calendar-action-bar";
import { CalendarStats } from "@/components/calendar-admin/calendar-stats";
import { CalendarForm } from "@/components/calendar-admin/calendar-form";
import { MemberList } from "@/components/calendar-admin/member-list";
import { PublicLinkEditor } from "@/components/calendar-admin/public-link-editor";
import { loadCalendarBundle } from "@/components/calendar-admin/load-calendar-bundle";
import {
  CopyLinkButton,
  CalendarTabsNav,
} from "@/components/calendar-admin/copy-link-button";
import { getAppUrl, publicBookingUrl } from "@/components/calendar-admin/validation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PageContainer } from "@/components/layout/page-container";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { Users } from "lucide-react";
import { getSchedulerId } from "@/lib/auth";
import { calendarPageTitle, pageTitle } from "@/lib/brand/metadata";
import type { Metadata } from "next";
import { listMeetingsForCalendar } from "@/lib/booking/list-meetings";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type CalendarTab = "overview" | "members" | "settings";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

function resolveTab(tab: string | undefined): CalendarTab {
  if (tab === "members" || tab === "settings") {
    return tab;
  }
  return "overview";
}

const TAB_PAGE_TITLES: Record<Exclude<CalendarTab, "overview">, string> = {
  members: "Members",
  settings: "Settings",
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) {
    return pageTitle("Calendar");
  }

  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = resolveTab(tabParam);
  const bundle = await loadCalendarBundle(id, schedulerId);
  if (!bundle) {
    return pageTitle("Calendar");
  }

  if (tab === "overview") {
    return pageTitle(bundle.name);
  }

  return pageTitle(
    calendarPageTitle(bundle.name, TAB_PAGE_TITLES[tab]),
  );
}

export default async function CalendarDetailPage({
  params,
  searchParams,
}: PageProps) {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) {
    redirect("/login");
  }

  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = resolveTab(tabParam);

  const [bundle, allMeetings] = await Promise.all([
    loadCalendarBundle(id, schedulerId),
    listMeetingsForCalendar(id, schedulerId),
  ]);
  if (!bundle) {
    notFound();
  }

  const bookingUrl = publicBookingUrl(bundle.slug);
  const appOrigin = getAppUrl();
  const now = Date.now();
  const upcomingMeetingCount =
    allMeetings?.filter((m) => new Date(m.startsAt).getTime() >= now).length ??
    0;

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

      <CalendarTabsNav calendarId={id} activeTab={tab} />

      {tab === "overview" && (
        <div className="space-y-6">
          <CalendarStats
            calendarId={id}
            memberCount={bundle.members.length}
            upcomingMeetingCount={upcomingMeetingCount}
          />
          <CalendarActionBar
            calendarId={id}
            publicSlug={bundle.slug}
            appOrigin={appOrigin}
          />
        </div>
      )}

      {tab === "members" && (
        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-sm text-ink-muted">
              {bundle.members.length === 0
                ? "No members yet."
                : `${bundle.members.length} member${bundle.members.length === 1 ? "" : "s"}`}
            </p>
            <Button asChild>
              <Link href={`/calendars/${id}/members/new`}>Add Member</Link>
            </Button>
          </div>

          {bundle.members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No members yet"
              description="Add team members to pool their availability on this calendar."
              action={
                <Button asChild>
                  <Link href={`/calendars/${id}/members/new`}>Add Member</Link>
                </Button>
              }
            />
          ) : (
            <Card padding="sm" className="overflow-hidden p-0">
              <MemberList calendarId={id} members={bundle.members} />
            </Card>
          )}
        </section>
      )}

      {tab === "settings" && (
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
              Timezone and default working hours apply to all members unless a
              member sets a custom schedule.
            </p>
            <Card className="mt-4">
              <CalendarForm mode="edit" calendar={bundle} />
            </Card>
          </section>
        </div>
      )}
    </PageContainer>
  );
}
