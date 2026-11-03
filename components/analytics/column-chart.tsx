import { formatCount, formatDecimal } from "@/lib/analytics/format";
import { cn } from "@/lib/ui/cn";

export type ColumnSeries = {
  key: string;
  label: string;
  /** Background utility for the segment, e.g. `bg-primary-500`. */
  className: string;
};

export type ColumnDatum = {
  key: string;
  label: string;
  weekday?: string;
  values: Record<string, number>;
  /** Optional secondary count shown as a dot under the column (e.g. cancellations). */
  marker?: number;
};

export type ColumnChartProps = {
  data: ColumnDatum[];
  series: ColumnSeries[];
  height?: number;
  markerLabel?: string;
  /** Caption read by screen readers in place of the visual chart. */
  summary: string;
  tone?: "light" | "dark";
  className?: string;
};

/** Smallest "nice" ceiling ≥ max so gridline labels stay round. */
export function niceCeiling(max: number): number {
  if (max <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 2.5, 4, 5, 6, 8, 10]) {
    if (step * magnitude >= max) return step * magnitude;
  }
  return 10 * magnitude;
}

/**
 * Stacked daily columns built from plain DOM (no chart runtime): crisp at every
 * width, server-rendered, with CSS-only hover focus and tooltips.
 */
export function ColumnChart({
  data,
  series,
  height = 168,
  markerLabel,
  summary,
  tone = "light",
  className,
}: ColumnChartProps) {
  const totals = data.map((d) => series.reduce((sum, s) => sum + (d.values[s.key] ?? 0), 0));
  const ceiling = niceCeiling(Math.max(0, ...totals));
  const dense = data.length > 31;
  const showAllLabels = data.length <= 7;
  const labelIndexes = new Set(
    showAllLabels ? data.map((_, i) => i) : [0, Math.floor((data.length - 1) / 2), data.length - 1],
  );
  const hasMarkers = data.some((d) => (d.marker ?? 0) > 0);
  const dark = tone === "dark";

  return (
    <figure className={cn("min-w-0", className)}>
      <figcaption className="sr-only">{summary}</figcaption>
      <div className="flex gap-2" aria-hidden>
        {/* y-axis */}
        <div
          className={cn(
            "numeric relative w-6 shrink-0 text-right text-[11px]",
            dark ? "text-white/50" : "text-neutral-500",
          )}
          style={{ height }}
        >
          <span className="absolute right-0 -top-1.5">{formatCount(ceiling)}</span>
          <span className="absolute right-0 top-1/2 -translate-y-1/2">
            {formatDecimal(ceiling / 2)}
          </span>
          <span className="absolute right-0 -bottom-1.5">0</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height }}>
            {/* gridlines */}
            {[0, 50, 100].map((top) => (
              <div
                key={top}
                className={cn(
                  "absolute inset-x-0 border-t",
                  top === 100 ? "border-solid" : "border-dashed",
                  dark ? "border-white/10" : "border-neutral-100",
                )}
                style={{ top: `${top}%` }}
              />
            ))}
            <div
              className={cn(
                "absolute inset-0 flex items-end [&:hover>div]:opacity-45",
                dense ? "gap-px" : "gap-[3px] sm:gap-1",
              )}
            >
              {data.map((d, index) => {
                const total = totals[index];
                const position =
                  index < data.length * 0.2
                    ? "left-0"
                    : index > data.length * 0.8
                      ? "right-0"
                      : "left-1/2 -translate-x-1/2";
                return (
                  <div
                    key={d.key}
                    className="group relative flex h-full min-w-0 flex-1 flex-col justify-end transition-opacity duration-150 hover:!opacity-100"
                  >
                    {total === 0 ? (
                      <div
                        className={cn(
                          "h-[2px] w-full rounded-full",
                          dark ? "bg-white/10" : "bg-neutral-100",
                        )}
                      />
                    ) : (
                      <div
                        className="flex w-full flex-col-reverse overflow-hidden rounded-t-[3px]"
                        style={{ height: `${(total / ceiling) * 100}%` }}
                      >
                        {series.map((s) => {
                          const value = d.values[s.key] ?? 0;
                          if (value === 0) return null;
                          return (
                            <div
                              key={s.key}
                              className={s.className}
                              style={{ height: `${(value / total) * 100}%` }}
                            />
                          );
                        })}
                      </div>
                    )}
                    {/* tooltip */}
                    <div
                      className={cn(
                        "pointer-events-none invisible absolute bottom-full z-10 mb-2 w-max min-w-32 rounded-lg border border-neutral-100 bg-white px-3 py-2 text-xs text-neutral-900 opacity-0 shadow-s4 transition-opacity duration-100 group-hover:visible group-hover:opacity-100",
                        position,
                      )}
                    >
                      <div className="mb-1 font-medium">
                        {d.weekday ? `${d.weekday}, ` : ""}
                        {d.label}
                      </div>
                      {series.map((s) => (
                        <div key={s.key} className="flex items-center justify-between gap-4">
                          <span className="inline-flex items-center gap-1.5 text-neutral-600">
                            <span className={cn("h-2 w-2 rounded-sm", s.className)} />
                            {s.label}
                          </span>
                          <span className="numeric font-medium">
                            {formatCount(d.values[s.key] ?? 0)}
                          </span>
                        </div>
                      ))}
                      {markerLabel && (
                        <div className="mt-1 flex items-center justify-between gap-4 border-t border-neutral-100 pt-1">
                          <span className="inline-flex items-center gap-1.5 text-neutral-600">
                            <span className="h-2 w-2 rounded-full bg-status-error-500" />
                            {markerLabel}
                          </span>
                          <span className="numeric font-medium">{formatCount(d.marker ?? 0)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {hasMarkers && (
            <div className={cn("mt-1.5 flex h-1.5", dense ? "gap-px" : "gap-[3px] sm:gap-1")}>
              {data.map((d) => (
                <div key={d.key} className="flex min-w-0 flex-1 justify-center">
                  {(d.marker ?? 0) > 0 && (
                    <span className="h-1.5 w-1.5 max-w-full rounded-full bg-status-error-500" />
                  )}
                </div>
              ))}
            </div>
          )}

          <div
            className={cn(
              "relative mt-2 h-4 text-[11px]",
              dark ? "text-white/50" : "text-neutral-500",
            )}
          >
            {showAllLabels ? (
              <div className="flex gap-1">
                {data.map((d) => (
                  <span key={d.key} className="min-w-0 flex-1 truncate text-center">
                    {d.weekday ?? d.label}
                  </span>
                ))}
              </div>
            ) : (
              [...labelIndexes].map((index) => {
                const align =
                  index === 0
                    ? "left-0"
                    : index === data.length - 1
                      ? "right-0"
                      : "left-1/2 -translate-x-1/2";
                return (
                  <span key={index} className={cn("absolute top-0 whitespace-nowrap", align)}>
                    {data[index]?.label}
                  </span>
                );
              })
            )}
          </div>
        </div>
      </div>
    </figure>
  );
}
