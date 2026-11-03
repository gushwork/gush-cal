import type { CalendarAnalytics } from "@/lib/analytics/calendar-analytics";
import {
  formatCount,
  formatHours,
  formatPercent,
  formatPointDelta,
} from "@/lib/analytics/format";
import { formatLeadTime, type AnalyticsRange } from "@/lib/analytics/time";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/ui/cn";
import {
  Ban,
  CalendarCheck2,
  CalendarClock,
  Hourglass,
  Repeat2,
  Shuffle,
  ShieldCheck,
  Timer,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { ColumnChart } from "./column-chart";
import { Heatmap, WEEKDAYS, formatHourShort } from "./heatmap";
import { BarList, SplitBar } from "./bars";
import { Delta, LegendItem, Panel, RangeTabs, Stat, StatStrip, stagger } from "./primitives";

export type CalendarAnalyticsDashboardProps = {
  calendarId: string;
  range: AnalyticsRange;
  analytics: CalendarAnalytics;
};

const BOOKING_SERIES = [
  { key: "guest", label: "Guest self-serve", className: "bg-primary-500" },
  { key: "scheduler", label: "Booked by Scheduler", className: "bg-primary-200" },
];

function plural(count: number, word: string): string {
  return `${formatCount(count)} ${word}${count === 1 ? "" : "s"}`;
}

/** Owner-facing analytics for one Calendar. Server component: no client JS beyond links. */
export function CalendarAnalyticsDashboard({
  calendarId,
  range,
  analytics,
}: CalendarAnalyticsDashboardProps) {
  const { kpis } = analytics;
  const base = `/calendars/${calendarId}`;
  const busiest = analytics.heatmap.busiest;
  const totalLoad = analytics.members.reduce((sum, m) => sum + m.meetings, 0);
  const fairShare = analytics.members.length ? 1 / analytics.members.length : 0;

  return (
    <div className="min-w-0 space-y-4">
      {/* Title row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-caption text-primary-500">Analytics</p>
          <h2 className="font-grotesk text-xl font-semibold tracking-tight text-neutral-900">
            How this Calendar is performing
          </h2>
          <p className="mt-0.5 text-[13px] text-neutral-500">
            Rolling {range} days vs the {range} days before · times in {analytics.timeZone}
          </p>
        </div>
        <RangeTabs basePath={`${base}/analytics`} active={range} />
      </div>

      {/* Hero: headline + daily bookings */}
      <section
        style={stagger(0)}
        className="animate-fade-up relative overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-s3"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(var(--colors-neutral-100)_1px,transparent_1px)] [background-size:14px_14px] [mask-image:linear-gradient(to_bottom,black,transparent_55%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-primary-100 opacity-50 blur-3xl"
        />
        <div className="relative grid gap-6 p-4 sm:p-6 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="numeric font-grotesk text-[56px] leading-none font-semibold tracking-tight text-neutral-900">
                {formatCount(kpis.booked.value)}
              </span>
              <Delta value={kpis.booked.deltaPct} />
            </div>
            <p className="mt-2 max-w-md text-sm text-neutral-600">
              meetings booked in the last {range} days
              {kpis.booked.previous > 0 && (
                <>
                  , compared with{" "}
                  <span className="numeric font-medium text-neutral-900">
                    {formatCount(kpis.booked.previous)}
                  </span>{" "}
                  in the period before
                </>
              )}
              .
            </p>
            <SplitBar
              className="mt-6 max-w-md"
              segments={[
                {
                  key: "guest",
                  label: "Guest self-serve",
                  value: analytics.sources.guest,
                  className: "bg-primary-500",
                },
                {
                  key: "scheduler",
                  label: "Booked by Scheduler",
                  value: analytics.sources.scheduler,
                  className: "bg-primary-200",
                },
              ]}
            />
          </div>
          <dl className="grid grid-cols-3 gap-4 self-start md:grid-cols-1 md:gap-3 md:border-l md:border-neutral-100 md:pl-6">
            {[
              { label: "Next 7 days", value: formatCount(kpis.upcomingNext7), icon: CalendarClock },
              { label: "Median lead", value: formatLeadTime(kpis.medianLeadHours), icon: Hourglass },
              { label: "Unique guests", value: formatCount(kpis.uniqueGuests), icon: UsersRound },
            ].map((item) => (
              <div key={item.label} className="min-w-0">
                <dt className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <item.icon className="hidden h-3.5 w-3.5 text-primary-500 sm:block" aria-hidden />
                  <span className="truncate">{item.label}</span>
                </dt>
                <dd className="numeric font-grotesk text-xl font-semibold text-neutral-900">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative border-t border-neutral-100 px-4 pt-4 pb-4 sm:px-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-neutral-900">Bookings per day</h3>
            <div className="flex flex-wrap gap-3 text-xs text-neutral-600">
              {BOOKING_SERIES.map((s) => (
                <LegendItem key={s.key} label={s.label} swatchClassName={s.className} />
              ))}
              <LegendItem label="Cancellations" swatchClassName="rounded-full bg-status-error-500" />
            </div>
          </div>
          <ColumnChart
            summary={`${kpis.booked.value} meetings booked over ${range} days.`}
            series={BOOKING_SERIES}
            markerLabel="Cancelled"
            data={analytics.daily.map((d) => ({
              key: d.key,
              label: d.label,
              weekday: d.weekday,
              values: { guest: d.guest, scheduler: d.scheduler },
              marker: d.cancelled,
            }))}
          />
        </div>
      </section>

      {/* KPI strip */}
      <StatStrip style={stagger(1)}>
        <Stat
          label="Meetings held"
          icon={CalendarCheck2}
          value={formatCount(kpis.held.value)}
          delta={<Delta value={kpis.held.deltaPct} />}
          hint={`${formatCount(kpis.held.previous)} in the previous ${range}d`}
        />
        <Stat
          label="Interview hours"
          icon={Timer}
          value={formatHours(kpis.hours.value)}
          delta={<Delta value={kpis.hours.deltaPct} />}
          hint="Time Members spent in held Meetings"
        />
        <Stat
          label="Cancellation rate"
          icon={Ban}
          value={formatPercent(kpis.cancellationRate.value)}
          delta={
            <Delta
              unit="pts"
              invert
              value={formatPointDelta(kpis.cancellationRate.value, kpis.cancellationRate.previous)}
            />
          }
          hint="Share of new bookings later cancelled"
        />
        <Stat
          label="Upcoming"
          icon={CalendarClock}
          value={formatCount(kpis.upcomingTotal)}
          hint={
            <Link href={`${base}/meetings`} className="interactive hover:text-primary">
              View meetings →
            </Link>
          }
        />
      </StatStrip>

      {/* When meetings happen */}
      <Panel
        style={stagger(2)}
        title="When meetings happen"
        subtitle={`Start times of active Meetings in ${analytics.timeZone}, last ${range} days and upcoming`}
        actions={
          busiest && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-25 px-2.5 py-1 text-xs font-medium text-primary-500">
              Peak: {WEEKDAYS[busiest.weekday]} {formatHourShort(busiest.hour)}
            </span>
          )
        }
      >
        {analytics.heatmap.total === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-500">
            No Meetings in this period yet. Share the booking link to start filling the grid.
          </p>
        ) : (
          <Heatmap
            cells={analytics.heatmap.cells}
            max={analytics.heatmap.max}
            hourStart={analytics.heatmap.hourStart}
            hourEnd={analytics.heatmap.hourEnd}
            summary={
              busiest
                ? `Busiest slot is ${WEEKDAYS[busiest.weekday]} at ${formatHourShort(busiest.hour)} with ${busiest.count} meetings.`
                : "No meetings."
            }
          />
        )}
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Member load */}
        <Panel
          style={stagger(3)}
          title="Member load"
          subtitle="Active Meetings per Member, last period + upcoming"
          footer={
            analytics.idleMembers > 0 ? (
              <span className="text-status-caution-700">
                {plural(analytics.idleMembers, "Member")} had no Meetings — check working hours,
                caps, or Google Calendar access.
              </span>
            ) : analytics.members.length > 0 ? (
              <span>Every Member took at least one Meeting.</span>
            ) : undefined
          }
        >
          <BarList
            emptyLabel="No Members on this Calendar yet"
            rows={analytics.members.slice(0, 8).map((member) => {
              const overloaded = totalLoad >= 4 && member.share > fairShare * 1.5;
              return {
                key: member.id,
                muted: member.meetings === 0,
                label: (
                  <span className="flex items-center gap-2">
                    <Avatar name={member.name} size="sm" className="h-6 w-6 text-[10px]" />
                    <span className="truncate">{member.name}</span>
                    {overloaded && (
                      <span className="rounded-full bg-status-warning-100 px-1.5 py-px text-[10px] font-medium text-status-warning-700">
                        Heavy
                      </span>
                    )}
                  </span>
                ),
                value: member.meetings,
                display: (
                  <span>
                    {formatCount(member.meetings)}
                    <span className="ml-1.5 text-xs font-normal text-neutral-500">
                      {formatPercent(member.share)}
                    </span>
                  </span>
                ),
              };
            })}
          />
          {analytics.members.length > 8 && (
            <Link
              href={`${base}/members`}
              className="interactive mt-3 inline-block text-xs text-neutral-500 hover:text-primary"
            >
              +{analytics.members.length - 8} more Members →
            </Link>
          )}
        </Panel>

        {/* Sources */}
        <Panel
          style={stagger(4)}
          title="Where bookings come from"
          subtitle={`New bookings in the last ${range} days`}
        >
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Booking links
          </h3>
          <BarList
            emptyLabel="No bookings yet"
            rows={analytics.sources.byLink.slice(0, 5).map((row) => ({
              key: row.label,
              label: row.label,
              value: row.count,
              display: (
                <span>
                  {formatCount(row.count)}
                  <span className="ml-1.5 text-xs font-normal text-neutral-500">
                    {formatPercent(row.share)}
                  </span>
                </span>
              ),
            }))}
          />
          {analytics.sources.byTeam.some((row) => row.label !== "No team") && (
            <>
              <h3 className="mt-4 mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Teams
              </h3>
              <BarList
                barClassName="bg-neutral-50"
                rows={analytics.sources.byTeam.slice(0, 5).map((row) => ({
                  key: row.label,
                  label: row.label,
                  value: row.count,
                }))}
              />
            </>
          )}
        </Panel>

        {/* Next 7 days */}
        <Panel
          style={stagger(5)}
          title="Next 7 days"
          subtitle={`${plural(kpis.upcomingNext7, "Meeting")} on the books`}
        >
          <ColumnChart
            height={120}
            summary={`${kpis.upcomingNext7} meetings scheduled in the next 7 days.`}
            series={[{ key: "count", label: "Meetings", className: "bg-primary-400" }]}
            data={analytics.upcomingByDay.map((d) => ({
              key: d.key,
              label: d.label,
              weekday: d.weekday,
              values: { count: d.count },
            }))}
          />
        </Panel>

        {/* Mix & operations */}
        <Panel style={stagger(6)} title="Mix & operations" subtitle={`Last ${range} days`}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Durations booked
          </h3>
          {analytics.durations.length === 0 ? (
            <p className="text-sm text-neutral-500">No bookings yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {analytics.durations.map((d) => (
                <span
                  key={d.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-neutral-100 bg-neutral-25 px-2.5 py-1 text-xs"
                >
                  <span className="font-medium text-neutral-900">{d.label}</span>
                  <span className="numeric text-neutral-500">{formatPercent(d.share)}</span>
                </span>
              ))}
            </div>
          )}
          <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-neutral-100 bg-neutral-100">
            {[
              { label: "Rescheduled", value: kpis.reschedules, icon: Repeat2 },
              { label: "Reassigned", value: kpis.reassignments, icon: Shuffle },
              { label: "Dupes blocked", value: kpis.duplicatesBlocked, icon: ShieldCheck },
            ].map((item) => (
              <div key={item.label} className="min-w-0 bg-white px-2.5 py-2.5">
                <dt className="flex items-start gap-1 text-[11px] leading-tight text-neutral-500">
                  <item.icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {item.label}
                </dt>
                <dd
                  className={cn(
                    "numeric font-grotesk text-lg font-semibold",
                    item.value === 0 ? "text-neutral-500" : "text-neutral-900",
                  )}
                >
                  {formatCount(item.value)}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
    </div>
  );
}
