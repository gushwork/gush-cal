import { gridHourLabels } from "./time-utils";

/** Dotted horizontal rules aligned with the time-axis hour labels (7 AM–8 PM). */
export function GridHourLines() {
  const labels = gridHourLabels();
  const steps = Math.max(labels.length - 1, 1);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0"
      data-testid="grid-hour-lines"
      aria-hidden
    >
      {labels.map((label, index) => (
        <div
          key={label}
          className="absolute inset-x-0 border-t border-dotted border-border"
          style={{ top: `${(index / steps) * 100}%` }}
        />
      ))}
    </div>
  );
}
