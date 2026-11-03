import { cn } from "@/lib/ui/cn";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function formatHourShort(hour: number): string {
  const suffix = hour < 12 ? "a" : "p";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}${suffix}`;
}

function cellColor(count: number, max: number): string | undefined {
  if (count === 0 || max === 0) return undefined;
  const strength = Math.round(14 + (count / max) * 86);
  return `color-mix(in oklab, var(--colors-primary-500) ${strength}%, var(--colors-primary-25))`;
}

export type HeatmapProps = {
  /** cells[weekday 0=Mon][hour 0–23] */
  cells: number[][];
  max: number;
  hourStart: number;
  hourEnd: number;
  summary: string;
  className?: string;
};

/** Weekday × hour grid; cell intensity is the share of the busiest cell. */
export function Heatmap({ cells, max, hourStart, hourEnd, summary, className }: HeatmapProps) {
  const hours = Array.from({ length: hourEnd - hourStart + 1 }, (_, i) => hourStart + i);
  const columns = `2.25rem repeat(${hours.length}, minmax(0, 1fr))`;

  return (
    <figure className={cn("min-w-0", className)}>
      <figcaption className="sr-only">{summary}</figcaption>
      <div aria-hidden className="space-y-1">
        {cells.map((row, weekday) => (
          <div key={weekday} className="grid items-center gap-1" style={{ gridTemplateColumns: columns }}>
            <span className="text-[11px] text-neutral-500">{WEEKDAYS[weekday]}</span>
            {hours.map((hour) => {
              const count = row[hour] ?? 0;
              return (
                <div
                  key={hour}
                  title={`${WEEKDAYS[weekday]} ${formatHourShort(hour)} · ${count} meeting${count === 1 ? "" : "s"}`}
                  className={cn(
                    "aspect-square max-h-7 w-full rounded-[4px] transition-transform duration-150 hover:scale-110",
                    count === 0 && "bg-neutral-25 ring-1 ring-inset ring-neutral-100",
                  )}
                  style={{ backgroundColor: cellColor(count, max) }}
                />
              );
            })}
          </div>
        ))}
        <div className="grid gap-1 pt-1" style={{ gridTemplateColumns: columns }}>
          <span />
          {hours.map((hour) => (
            <span key={hour} className="text-center text-[10px] text-neutral-500">
              {hour % 3 === 0 ? formatHourShort(hour) : ""}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-neutral-500" aria-hidden>
        Fewer
        <span className="flex gap-0.5">
          {[0, 0.25, 0.5, 0.75, 1].map((step) => (
            <span
              key={step}
              className={cn("h-2.5 w-2.5 rounded-[3px]", step === 0 && "bg-neutral-25 ring-1 ring-inset ring-neutral-100")}
              style={{ backgroundColor: step === 0 ? undefined : cellColor(step, 1) }}
            />
          ))}
        </span>
        More
      </div>
    </figure>
  );
}

export { WEEKDAYS };
