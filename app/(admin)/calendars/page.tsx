import { pageTitle } from "@/lib/brand/metadata";
import { PageContainer } from "@/components/layout/page-container";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { getSchedulerId } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { toCalendar } from "@/lib/db/mappers";
import { calendarMembers, calendars, meetings } from "@/lib/db/schema";
import { cn } from "@/lib/ui/cn";
import { and, count, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import { Calendar, CalendarDays, ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = pageTitle("Calendars");

export default async function CalendarsListPage() {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) {
    redirect("/login");
  }

  const rows = await getDb()
    .select({
      calendar: calendars,
      memberCount: count(calendarMembers.id),
    })
    .from(calendars)
    .leftJoin(calendarMembers, eq(calendars.id, calendarMembers.calendarId))
    .where(eq(calendars.schedulerId, schedulerId))
    .groupBy(calendars.id)
    .orderBy(desc(calendars.createdAt));

  const items = rows.map((row) => toCalendar(row.calendar));
  const memberCountByCalendar = new Map(
    rows.map((row) => [row.calendar.id, row.memberCount]),
  );

  const calendarIds = items.map((cal) => cal.id);
  const upcomingByCalendar = new Map<string, number>();
  if (calendarIds.length > 0) {
    const nowIso = new Date().toISOString();
    const upcomingRows = await getDb()
      .select({
        calendarId: meetings.calendarId,
        upcoming: count(),
      })
      .from(meetings)
      .where(
        and(
          inArray(meetings.calendarId, calendarIds),
          gte(meetings.startsAt, nowIso),
          isNull(meetings.cancelledAt),
        ),
      )
      .groupBy(meetings.calendarId);

    for (const row of upcomingRows) {
      upcomingByCalendar.set(row.calendarId, row.upcoming);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Calendars"
        subtitle="Manage shared calendars and member availability."
        actions={
          <Button asChild size="md">
            <Link href="/calendars/new">New Calendar</Link>
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No calendars yet"
          description="Create a calendar to start pooling member availability and sharing a booking link."
          action={
            <Button asChild>
              <Link href="/calendars/new">Create Calendar</Link>
            </Button>
          }
        />
      ) : (
        <Card padding="sm" className="divide-y divide-border overflow-hidden p-0">
          <ul>
            {items.map((cal) => {
              const memberCount = memberCountByCalendar.get(cal.id) ?? 0;
              const upcomingCount = upcomingByCalendar.get(cal.id) ?? 0;
              return (
                <li key={cal.id}>
                  <Link
                    href={`/calendars/${cal.id}`}
                    className={cn(
                      "interactive-row interactive flex min-h-11 items-center gap-4 px-6 py-4",
                      "hover:bg-primary-soft/40",
                    )}
                  >
                    <span
                      aria-hidden
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary-soft text-primary"
                    >
                      <Calendar className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-ink">{cal.name}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="muted">
                          {memberCount} member{memberCount === 1 ? "" : "s"}
                        </Badge>
                        <Badge variant="muted">{cal.durations.join(", ")} min</Badge>
                        {upcomingCount > 0 && (
                          <Badge variant="muted">
                            {upcomingCount} upcoming
                          </Badge>
                        )}
                      </span>
                    </span>
                    <ChevronRight
                      className="h-5 w-5 shrink-0 text-ink-muted"
                      aria-hidden
                    />
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
