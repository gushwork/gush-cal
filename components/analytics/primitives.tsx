import { ANALYTICS_RANGES, type AnalyticsRange } from "@/lib/analytics/time";
import { cn } from "@/lib/ui/cn";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/** Staggered entrance: pass the index of the block within the page. */
export function stagger(index: number): CSSProperties {
  return { animationDelay: `${index * 60}ms` };
}

export type PanelProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  style?: CSSProperties;
};

/** Canonical analytics surface: header · hairline · body · optional footer. */
export function Panel({
  title,
  subtitle,
  actions,
  footer,
  children,
  className,
  bodyClassName,
  style,
}: PanelProps) {
  return (
    <section
      style={style}
      className={cn(
        "animate-fade-up flex min-w-0 flex-col rounded-xl border border-neutral-100 bg-white shadow-s3",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div className="min-w-0">
          <h2 className="font-grotesk text-base font-semibold text-neutral-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-neutral-500">{subtitle}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>
      <div className="border-t border-neutral-100" />
      <div className={cn("min-w-0 flex-1 px-4 py-4", bodyClassName)}>{children}</div>
      {footer && (
        <footer className="rounded-b-xl border-t border-neutral-100 bg-neutral-25 px-4 py-2.5 text-xs text-neutral-600">
          {footer}
        </footer>
      )}
    </section>
  );
}

export type DeltaProps = {
  /** Percent (or percentage points when `unit="pts"`); null = no baseline. */
  value: number | null;
  /** When true, a decrease is good (e.g. cancellation rate). */
  invert?: boolean;
  unit?: "%" | "pts";
  tone?: "light" | "dark";
  className?: string;
};

/** ▲/▼ change pill vs the previous window. */
export function Delta({ value, invert = false, unit = "%", tone = "light", className }: DeltaProps) {
  if (value === null) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
          tone === "dark" ? "bg-white/10 text-white/70" : "bg-neutral-50 text-neutral-600",
          className,
        )}
      >
        New
      </span>
    );
  }
  const rounded = Math.abs(value) < 0.05 ? 0 : value;
  const good = invert ? rounded < 0 : rounded > 0;
  const Icon = rounded === 0 ? Minus : rounded > 0 ? ArrowUpRight : ArrowDownRight;
  const palette =
    rounded === 0
      ? tone === "dark"
        ? "bg-white/10 text-white/70"
        : "bg-neutral-50 text-neutral-600"
      : good
        ? tone === "dark"
          ? "bg-status-success-500/20 text-status-success-100"
          : "bg-status-success-100 text-status-success-700"
        : tone === "dark"
          ? "bg-status-error-500/20 text-status-error-100"
          : "bg-status-error-100 text-status-error-700";
  const magnitude = Math.abs(rounded);
  const text =
    unit === "pts"
      ? `${magnitude.toFixed(1)} pts`
      : `${magnitude >= 100 ? Math.round(magnitude) : magnitude.toFixed(magnitude < 10 ? 1 : 0)}%`;
  return (
    <span
      className={cn(
        "numeric inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
        palette,
        className,
      )}
      title="Change vs the previous period"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">{rounded > 0 ? "Up" : rounded < 0 ? "Down" : "Flat"} </span>
      {text}
    </span>
  );
}

export type StatProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  delta?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
};

/** One figure inside a divided KPI strip. */
export function Stat({ label, value, hint, delta, icon: Icon, className }: StatProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 px-4 py-4", className)}>
      <div className="flex items-center gap-1.5 text-[13px] text-neutral-600">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-primary-500" aria-hidden />}
        <span className="truncate">{label}</span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="numeric font-grotesk text-[26px] leading-tight font-semibold tracking-tight text-neutral-900">
          {value}
        </span>
        {delta}
      </div>
      {hint && <div className="text-xs text-neutral-500">{hint}</div>}
    </div>
  );
}

/**
 * Divided card holding several `Stat`s. Hairlines come from a 1px grid gap over
 * a `neutral-100` backdrop, so dividers stay correct at every breakpoint. Use an
 * even number of Stats (2 columns on phones).
 */
export function StatStrip({
  children,
  cols = 4,
  className,
  style,
}: {
  children: ReactNode;
  cols?: 4 | 6;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        "animate-fade-up grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-neutral-100 bg-neutral-100 shadow-s3 [&>*]:bg-white",
        cols === 4 ? "md:grid-cols-4" : "md:grid-cols-3 xl:grid-cols-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Period picker: a segmented control of plain links (`?range=`), server-rendered. */
export function RangeTabs({
  basePath,
  active,
  tone = "light",
}: {
  basePath: string;
  active: AnalyticsRange;
  tone?: "light" | "dark";
}) {
  return (
    <nav
      aria-label="Reporting period"
      className={cn(
        "inline-flex rounded-full p-1",
        tone === "dark" ? "bg-white/10" : "bg-neutral-50",
      )}
    >
      {ANALYTICS_RANGES.map((range) => {
        const isActive = range === active;
        return (
          <Link
            key={range}
            href={`${basePath}?range=${range}`}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "interactive numeric rounded-full px-3 py-1 text-xs font-medium",
              isActive
                ? "bg-white text-neutral-900 shadow-sm"
                : tone === "dark"
                  ? "text-white/70 hover:text-white"
                  : "text-neutral-600 hover:text-neutral-900",
            )}
          >
            {range}d
          </Link>
        );
      })}
    </nav>
  );
}

/** Legend swatch + label. */
export function LegendItem({
  label,
  className,
  swatchClassName,
}: {
  label: string;
  className?: string;
  swatchClassName: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("h-2.5 w-2.5 rounded-sm", swatchClassName)} aria-hidden />
      {label}
    </span>
  );
}
