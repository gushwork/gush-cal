import { CalendarActionBar } from "@/components/calendar-admin/calendar-action-bar";
import { CalendarStats } from "@/components/calendar-admin/calendar-stats";
import { CalendarForm } from "@/components/calendar-admin/calendar-form";
import { MemberList } from "@/components/calendar-admin/member-list";
import { PublicLinkEditor } from "@/components/calendar-admin/public-link-editor";
import { loadCalendarBundle } from "@/components/calendar-admin/load-calendar-bundle";
import { getAppUrl, publicBookingUrl } from "@/components/calendar-admin/validation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PageContainer } from "@/components/layout/page-container";
import { Card, EmptyState } from "@/components/ui";
import { getSchedulerId } from "@/lib/auth";
import { calendarPageTitle, pageTitle } from "@/lib/brand/metadata";
import type { Metadata } from "next";
import { listMeetingsForCalendar } from "@/lib/booking/list-meetings";
import { cn } from "@/lib/ui/cn";
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

function CalendarTabs({
  calendarId,
  activeTab,
}: {
  calendarId: string;
  activeTab: CalendarTab;
}) {
  const tabs: { id: CalendarTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "members", label: "Members" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <nav aria-label="Calendar sections" className="mb-6 border-b border-border">
      <ul className="-mb-px flex gap-6">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <li key={tab.id}>
              <Link
                href={`/calendars/${calendarId}?tab=${tab.id}`}
                className={cn(
                  "interactive inline-block border-b-2 pb-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-ink-muted hover:border-border hover:text-ink",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
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

  const bundle = await loadCalendarBundle(id, schedulerId);
  if (!bundle) {
    notFound();
  }

  const bookingUrl = publicBookingUrl(bundle.slug);
  const appOrigin = getAppUrl();
  const allMeetings = await listMeetingsForCalendar(id, schedulerId);
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

      <div className="mb-6">
        <h1 className="text-title font-display font-semibold tracking-tight text-ink sm:text-3xl">
          {bundle.name}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Public link:{" "}
          <a
            href={bookingUrl}
            className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
          >
            {bookingUrl}
          </a>
        </p>
      </div>

      <CalendarTabs calendarId={id} activeTab={tab} />

      {tab === "overview" && (
        <div className="space-y-6">
          <CalendarStats
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
            <Link
              href={`/calendars/${id}/members/new`}
              className="interactive inline-flex cursor-pointer items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            >
              Add Member
            </Link>
          </div>

          {bundle.members.length === 0 ? (
            <EmptyState
              title="No members yet"
              description="Add team members to pool their availability on this calendar."
              action={
                <Link
                  href={`/calendars/${id}/members/new`}
                  className="interactive inline-flex cursor-pointer items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                >
                  Add Member
                </Link>
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
        <section className="space-y-6">
          <Card>
            <PublicLinkEditor calendarId={id} slug={bundle.slug} />
          </Card>
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">
              Timezone and default working hours apply to all members unless a
              member sets a custom schedule.
            </p>
            <Card>
              <CalendarForm mode="edit" calendar={bundle} />
            </Card>
          </div>
        </section>
      )}
    </PageContainer>
  );
}
