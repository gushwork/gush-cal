import { cn } from "@/lib/ui/cn";

type LegendKind = "busy" | "free" | "bookable" | "inaccessible";

function LegendSwatch({ kind }: { kind: LegendKind }) {
  const base = "h-3 w-3 shrink-0 rounded-sm";

  if (kind === "inaccessible") {
    return (
      <span
        className={cn(base, "border border-destructive/40 bg-destructive-soft")}
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, transparent, transparent 3px, var(--destructive) 3px, var(--destructive) 4px)",
          opacity: 0.35,
        }}
        aria-hidden
      />
    );
  }

  const styles: Record<Exclude<LegendKind, "inaccessible">, string> = {
    busy: "border border-ink bg-primary-soft",
    free: "border border-border bg-surface",
    bookable: "border-2 border-primary bg-surface",
  };

  return <span className={cn(base, styles[kind])} aria-hidden />;
}

function LegendItem({
  kind,
  label,
  title,
}: {
  kind: LegendKind;
  label: string;
  title?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={title}
    >
      <LegendSwatch kind={kind} />
      <span>{label}</span>
    </span>
  );
}

export function GridLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted",
        className,
      )}
      data-testid="grid-legend"
      role="group"
      aria-labelledby="grid-legend-label"
    >
      <span id="grid-legend-label" className="font-medium text-ink">
        Legend:
      </span>
      <LegendItem kind="busy" label="Busy" />
      <LegendItem kind="free" label="Free" />
      <LegendItem kind="bookable" label="Bookable" />
      <LegendItem
        kind="inaccessible"
        label="Inaccessible"
        title="Member calendar could not be read — busy/free data unavailable for this column"
      />
    </div>
  );
}
