import { formatCount, formatPercent } from "@/lib/analytics/format";
import { cn } from "@/lib/ui/cn";
import type { ReactNode } from "react";

export type BarListRow = {
  key: string;
  label: ReactNode;
  sublabel?: ReactNode;
  value: number;
  /** Right-hand text; defaults to the formatted value. */
  display?: ReactNode;
  /** Muted styling for zero/inactive rows. */
  muted?: boolean;
};

/** Ranked rows with a proportional bar drawn behind each label. */
export function BarList({
  rows,
  className,
  barClassName = "bg-primary-25",
  emptyLabel = "Nothing here yet",
}: {
  rows: BarListRow[];
  className?: string;
  barClassName?: string;
  emptyLabel?: string;
}) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-neutral-500">{emptyLabel}</p>;
  }
  return (
    <ul className={cn("space-y-1.5", className)}>
      {rows.map((row) => (
        <li key={row.key} className="relative flex items-center justify-between gap-3 rounded-md px-2.5 py-1.5">
          <span
            aria-hidden
            className={cn("absolute inset-y-0 left-0 rounded-md transition-[width] duration-500", barClassName)}
            style={{ width: max === 0 ? 0 : `${Math.max(2, (row.value / max) * 100)}%` }}
          />
          <span className="relative min-w-0">
            <span
              className={cn(
                "block truncate text-sm",
                row.muted ? "text-neutral-500" : "font-medium text-neutral-900",
              )}
            >
              {row.label}
            </span>
            {row.sublabel && (
              <span className="block truncate text-xs text-neutral-500">{row.sublabel}</span>
            )}
          </span>
          <span
            className={cn(
              "numeric relative shrink-0 text-sm",
              row.muted ? "text-neutral-500" : "font-medium text-neutral-900",
            )}
          >
            {row.display ?? formatCount(row.value)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export type SplitSegment = { key: string; label: string; value: number; className: string };

/** One horizontal bar split into proportional segments, with a counted legend. */
export function SplitBar({
  segments,
  className,
  tone = "light",
}: {
  segments: SplitSegment[];
  className?: string;
  tone?: "light" | "dark";
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const dark = tone === "dark";
  return (
    <div className={cn("min-w-0", className)}>
      <div
        className={cn(
          "flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full",
          dark ? "bg-white/10" : "bg-neutral-50",
        )}
        role="img"
        aria-label={segments
          .map((s) => `${s.label}: ${formatPercent(total ? s.value / total : null)}`)
          .join(", ")}
      >
        {total > 0 &&
          segments.map((s) =>
            s.value === 0 ? null : (
              <span
                key={s.key}
                className={cn("h-full first:rounded-l-full last:rounded-r-full", s.className)}
                style={{ width: `${(s.value / total) * 100}%` }}
              />
            ),
          )}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
        {segments.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", s.className)} aria-hidden />
            <span className={dark ? "text-white/70" : "text-neutral-600"}>{s.label}</span>
            <span className={cn("numeric font-medium", dark ? "text-white" : "text-neutral-900")}>
              {formatCount(s.value)}
            </span>
            <span className={cn("numeric", dark ? "text-white/50" : "text-neutral-500")}>
              {formatPercent(total ? s.value / total : null)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
