import { pageTitle } from "@/lib/brand/metadata";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PageContainer } from "@/components/layout/page-container";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { getSchedulerId } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { toCalendar } from "@/lib/db/mappers";
import { calendarMembers, calendars } from "@/lib/db/schema";
import { cn } from "@/lib/ui/cn";
import { count, desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = pageTitle("Calendars");

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 0 1 .02-1.06L10.94 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.24 4.25a.75.75 0 0 1 0 1.06l-4.24 4.25a.75.75 0 0 1-1.06-.02Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default async function CalendarsListPage() {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) {
    redirect("/login");
  }

  const rows = await getDb()
    .select()
    .from(calendars)
    .where(eq(calendars.schedulerId, schedulerId))
    .orderBy(desc(calendars.createdAt));

  const items = rows.map(toCalendar);
  const calendarIds = items.map((cal) => cal.id);

  const memberCountRows =
    calendarIds.length > 0
      ? await getDb()
          .select({
            calendarId: calendarMembers.calendarId,
            memberCount: count(),
          })
          .from(calendarMembers)
          .where(inArray(calendarMembers.calendarId, calendarIds))
          .groupBy(calendarMembers.calendarId)
      : [];

  const memberCountByCalendar = new Map(
    memberCountRows.map((row) => [row.calendarId, row.memberCount]),
  );

  return (
    <PageContainer>
      <div className="mb-8 flex items-start justify-between gap-4">
        <PageHeader
          title="Calendars"
          subtitle="Manage shared calendars and member availability."
          className="mb-0"
        />
        <Link
          href="/calendars/new"
          className="interactive inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
        >
          New Calendar
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No calendars yet"
          description="Create a calendar to start pooling member availability and sharing a booking link."
          action={
            <Link
              href="/calendars/new"
              className="interactive inline-flex cursor-pointer items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            >
              Create Calendar
            </Link>
          }
        />
      ) : (
        <Card padding="sm" className="divide-y divide-border overflow-hidden p-0">
          <ul>
            {items.map((cal) => {
              const memberCount = memberCountByCalendar.get(cal.id) ?? 0;
              return (
                <li key={cal.id}>
                  <Link
                    href={`/calendars/${cal.id}`}
                    className={cn(
                      "interactive flex items-center gap-4 px-5 py-4",
                      "hover:bg-primary-soft/50",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-ink">{cal.name}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="muted">
                          {memberCount} member{memberCount === 1 ? "" : "s"}
                        </Badge>
                        <Badge variant="muted">{cal.durations.join(", ")} min</Badge>
                      </span>
                    </span>
                    <ChevronIcon className="h-5 w-5 shrink-0 text-ink-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </PageContainer>
  );
}
