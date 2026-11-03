import type { AdoptionFeature, PlatformAnalytics } from "@/lib/analytics/platform-analytics";
import {
  formatCount,
  formatDecimal,
  formatHours,
  formatPercent,
  formatPointDelta,
} from "@/lib/analytics/format";
import { formatRelative, type AnalyticsRange } from "@/lib/analytics/time";
import { Avatar } from "@/components/ui/avatar";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { cn } from "@/lib/ui/cn";
import {
  Ban,
  Building2,
  CalendarCheck2,
  Inbox,
  KeyRound,
  Radio,
  Sparkles,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { ColumnChart } from "./column-chart";
import { BarList } from "./bars";
import { Delta, LegendItem, Panel, RangeTabs, Stat, StatStrip, stagger } from "./primitives";

const FEATURE_LABELS: Record<AdoptionFeature, string> = {
  teams: "Teams",
  bookingLinks: "Booking links",
  webhooks: "Webhooks",
  apiKeys: "API keys",
  sequences: "Email sequences",
  salesforce: "Salesforce",
};

const STATUS_STYLES = {
  active: "bg-status-success-100 text-status-success-700",
  new: "bg-status-info-100 text-status-info-700",
  idle: "bg-neutral-50 text-neutral-600",
} as const;

export type PlatformAnalyticsDashboardProps = {
  range: AnalyticsRange;
  analytics: PlatformAnalytics;
  now: Date;
};

function PulseFigure({
  label,
  value,
  detail,
  delta,
}: {
  label: string;
  value: string;
  detail?: string;
  delta?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-white/60">{label}</dt>
      <dd className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="numeric font-grotesk text-[34px] leading-none font-semibold tracking-tight text-white sm:text-[40px]">
          {value}
        </span>
        {detail && <span className="numeric text-sm text-white/50">{detail}</span>}
        {delta}
      </dd>
    </div>
  );
}

/** App Admin view of platform-wide usage. Server component. */
export function PlatformAnalyticsDashboard({ range, analytics, now }: PlatformAnalyticsDashboardProps) {
  const { kpis, health } = analytics;
  const healthy = health.failed === 0;

  return (
    <div className="min-w-0 space-y-4">
      {/* Pulse slab */}
      <section
        style={stagger(0)}
        className="animate-fade-up relative overflow-hidden rounded-2xl bg-neutral-900 text-white shadow-s4"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.05)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-primary-500 opacity-30 blur-3xl"
        />
        <div className="relative p-4 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-white/70 uppercase">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-success-500 opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-status-success-500" />
              </span>
              Platform pulse · last {range} days
            </div>
            <RangeTabs basePath="/admin" active={range} tone="dark" />
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
            <PulseFigure
              label="Meetings booked"
              value={formatCount(kpis.booked.value)}
              delta={<Delta tone="dark" value={kpis.booked.deltaPct} />}
            />
            <PulseFigure
              label="Active Schedulers"
              value={formatCount(kpis.schedulers.active)}
              detail={`/ ${formatCount(kpis.schedulers.total)}`}
            />
            <PulseFigure
              label="Active Calendars"
              value={formatCount(kpis.calendars.active)}
              detail={`/ ${formatCount(kpis.calendars.total)}`}
            />
            <PulseFigure
              label="Interview hours held"
              value={formatHours(kpis.hours.value)}
              delta={<Delta tone="dark" value={kpis.hours.deltaPct} />}
            />
          </dl>

          <div className="mt-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-white/90">Bookings per day (UTC)</h2>
              <div className="flex flex-wrap gap-3 text-xs text-white/60">
                <LegendItem label="Guest self-serve" swatchClassName="bg-primary-400" />
                <LegendItem label="Scheduler" swatchClassName="bg-white/40" />
                <LegendItem label="Cancellations" swatchClassName="rounded-full bg-status-error-500" />
              </div>
            </div>
            <ColumnChart
              tone="dark"
              height={150}
              summary={`${kpis.booked.value} meetings booked platform-wide over ${range} days.`}
              markerLabel="Cancelled"
              series={[
                { key: "guest", label: "Guest self-serve", className: "bg-primary-400" },
                { key: "scheduler", label: "Scheduler", className: "bg-white/40" },
              ]}
              data={analytics.daily.map((d) => ({
                key: d.key,
                label: d.label,
                weekday: d.weekday,
                values: { guest: d.guest, scheduler: d.scheduler },
                marker: d.cancelled,
              }))}
            />
          </div>
        </div>
      </section>

      {/* KPI strip */}
      <StatStrip cols={6} style={stagger(1)}>
        <Stat
          label="New Schedulers"
          icon={UserPlus}
          value={formatCount(kpis.schedulers.new.value)}
          delta={<Delta value={kpis.schedulers.new.deltaPct} />}
        />
        <Stat
          label="New Calendars"
          icon={Building2}
          value={formatCount(kpis.calendars.new.value)}
          delta={<Delta value={kpis.calendars.new.deltaPct} />}
        />
        <Stat
          label="Members"
          icon={UsersRound}
          value={formatCount(kpis.members)}
          hint={
            kpis.avgMembersPerCalendar === null
              ? undefined
              : `${formatDecimal(kpis.avgMembersPerCalendar)} per Calendar`
          }
        />
        <Stat
          label="Meetings held"
          icon={CalendarCheck2}
          value={formatCount(kpis.held.value)}
          delta={<Delta value={kpis.held.deltaPct} />}
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
        />
        <Stat
          label="Guest self-serve"
          icon={Sparkles}
          value={formatPercent(kpis.guestShare)}
          hint={`${formatCount(kpis.totalMeetingsAllTime)} Meetings all-time`}
        />
      </StatStrip>

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        {/* Top calendars */}
        <Panel
          style={stagger(2)}
          className="lg:col-span-2"
          title="Most active Calendars"
          subtitle={`By new bookings in the last ${range} days`}
          bodyClassName="px-0 py-0"
          footer={
            analytics.dormantCalendars > 0
              ? `${formatCount(analytics.dormantCalendars)} Calendar${analytics.dormantCalendars === 1 ? "" : "s"} had no bookings in this period.`
              : "Every Calendar took bookings in this period."
          }
        >
          {analytics.topCalendars.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-neutral-500">
              No bookings across the platform in this period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-25 text-left text-[11px] tracking-wide text-neutral-600 uppercase">
                    <th className="px-4 py-2 font-medium">Calendar</th>
                    <th className="px-3 py-2 text-right font-medium">Members</th>
                    <th className="px-3 py-2 text-right font-medium">Booked</th>
                    <th className="px-3 py-2 text-right font-medium">Cancelled</th>
                    <th className="px-3 py-2 text-right font-medium">Self-serve</th>
                    <th className="px-4 py-2 text-right font-medium">Last booking</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topCalendars.map((calendar, index) => (
                    <tr
                      key={calendar.id}
                      className="interactive-row border-b border-neutral-100 last:border-b-0"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <span className="numeric w-4 shrink-0 text-xs text-neutral-500">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-neutral-900">
                              {calendar.name}
                            </div>
                            <div className="truncate text-xs text-neutral-500">
                              {calendar.ownerName} · /{calendar.slug}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="numeric px-3 py-2.5 text-right text-neutral-600">
                        {formatCount(calendar.members)}
                      </td>
                      <td className="numeric px-3 py-2.5 text-right font-semibold text-neutral-900">
                        {formatCount(calendar.booked)}
                      </td>
                      <td className="numeric px-3 py-2.5 text-right text-neutral-600">
                        {formatCount(calendar.cancelled)}
                      </td>
                      <td className="numeric px-3 py-2.5 text-right text-neutral-600">
                        {formatPercent(calendar.guestShare)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs whitespace-nowrap text-neutral-500">
                        {formatRelative(calendar.lastBookedAt, now)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="flex min-w-0 flex-col gap-4">
          {/* Adoption */}
          <Panel
            style={stagger(3)}
            title="Feature adoption"
            subtitle="Share of Calendars using each feature"
          >
            <BarList
              rows={[...analytics.adoption]
                .sort((a, b) => b.share - a.share)
                .map((row) => ({
                  key: row.feature,
                  label: FEATURE_LABELS[row.feature],
                  value: row.share,
                  muted: row.calendars === 0,
                  display: (
                    <span>
                      {formatPercent(row.share)}
                      <span className="ml-1.5 text-xs font-normal text-neutral-500">
                        {formatCount(row.calendars)}
                      </span>
                    </span>
                  ),
                }))}
            />
          </Panel>

          {/* Health */}
          <Panel
            style={stagger(4)}
            title="System health"
            subtitle={`Event outbox and API, last ${range} days`}
            actions={
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                  healthy
                    ? "bg-status-success-100 text-status-success-700"
                    : "bg-status-error-100 text-status-error-700",
                )}
              >
                {healthy ? "Healthy" : "Needs attention"}
              </span>
            }
          >
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-neutral-100 bg-neutral-100">
              {[
                { label: "Events delivered", value: health.delivered, icon: Radio },
                { label: "Pending", value: health.pending, icon: Inbox },
                {
                  label: "Failed deliveries",
                  value: health.failed,
                  icon: Ban,
                  bad: health.failed > 0,
                },
                {
                  label: "API keys used",
                  value: health.usedInWindow,
                  icon: KeyRound,
                  detail: `of ${formatCount(health.active)} active`,
                },
              ].map((item) => (
                <div key={item.label} className="bg-white px-3 py-2.5">
                  <dt className="flex items-center gap-1 truncate text-[11px] text-neutral-500">
                    <item.icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {item.label}
                  </dt>
                  <dd
                    className={cn(
                      "numeric font-grotesk text-lg font-semibold",
                      item.bad ? "text-status-error-700" : "text-neutral-900",
                    )}
                  >
                    {formatCount(item.value)}
                    {item.detail && (
                      <span className="ml-1 font-sans text-[11px] font-normal text-neutral-500">
                        {item.detail}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Schedulers */}
        <Panel
          style={stagger(5)}
          className="lg:col-span-2"
          title="Schedulers"
          subtitle={`${formatCount(kpis.schedulers.total)} signed up · sorted by bookings in the last ${range} days`}
          bodyClassName="px-0 py-0"
        >
          {analytics.schedulers.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-neutral-500">No Schedulers yet.</p>
          ) : (
            <div className="max-h-[28rem] overflow-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="sticky top-0 z-[1]">
                  <tr className="border-b border-neutral-100 bg-neutral-25 text-left text-[11px] tracking-wide text-neutral-600 uppercase">
                    <th className="px-4 py-2 font-medium">Scheduler</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Calendars</th>
                    <th className="px-3 py-2 text-right font-medium">Booked</th>
                    <th className="px-3 py-2 text-right font-medium">Last booking</th>
                    <th className="px-4 py-2 text-right font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.schedulers.map((scheduler) => (
                    <tr
                      key={scheduler.id}
                      className="interactive-row border-b border-neutral-100 last:border-b-0"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={scheduler.name} size="sm" />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-neutral-900">
                              {scheduler.name}
                            </div>
                            <div className="truncate text-xs text-neutral-500">
                              {scheduler.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                            STATUS_STYLES[scheduler.status],
                          )}
                        >
                          {scheduler.status}
                        </span>
                      </td>
                      <td className="numeric px-3 py-2.5 text-right text-neutral-600">
                        {formatCount(scheduler.calendars)}
                        <span className="ml-1 text-xs text-neutral-500">
                          · {formatCount(scheduler.members)} mbr
                        </span>
                      </td>
                      <td className="numeric px-3 py-2.5 text-right font-semibold text-neutral-900">
                        {formatCount(scheduler.booked)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs whitespace-nowrap text-neutral-500">
                        {formatRelative(scheduler.lastActiveAt, now)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs whitespace-nowrap text-neutral-500">
                        <LocalDateTime
                          value={scheduler.joinedAt}
                          options={{ dateStyle: "medium" }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* Sign-ups */}
        <Panel
          style={stagger(6)}
          title="Sign-ups"
          subtitle={`${formatCount(kpis.schedulers.new.value)} new Schedulers · UTC days`}
        >
          <ColumnChart
            height={140}
            summary={`${kpis.schedulers.new.value} Schedulers signed up over ${range} days.`}
            series={[{ key: "signups", label: "New Schedulers", className: "bg-primary-400" }]}
            data={analytics.daily.map((d) => ({
              key: d.key,
              label: d.label,
              weekday: d.weekday,
              values: { signups: d.signups },
            }))}
          />
        </Panel>
      </div>
    </div>
  );
}
