import { cn } from "@/lib/ui/cn";

export type CalendarDayState =
  | "available"
  | "selected"
  | "no-slots"
  | "out-of-window"
  | "outside-month";

export type CalendarDayOverlayProps = {
  day: number;
  slotCount: number;
  state: CalendarDayState;
};

export function CalendarDayOverlay({
  day,
  slotCount,
  state,
}: CalendarDayOverlayProps) {
  const showBadge =
    slotCount > 0 && (state === "available" || state === "selected");

  return (
    <span className="flex flex-col items-center justify-center">
      <span
        className={cn(
          "text-sm font-medium leading-none",
          state === "selected" && "text-white",
          state === "no-slots" && "text-ink-muted line-through decoration-ink-muted/50",
          state === "out-of-window" && "text-ink-muted/30",
          state === "outside-month" && "text-ink-muted/40",
          state === "available" && "text-ink",
        )}
      >
        {day}
      </span>
      {showBadge ? (
        <span
          className={cn(
            "mt-0.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
            state === "selected"
              ? "bg-white text-primary"
              : "bg-primary text-white",
          )}
        >
          {slotCount}
        </span>
      ) : null}
      {state === "no-slots" && !showBadge ? (
        <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-ink-muted/50">
          —
        </span>
      ) : null}
    </span>
  );
}

export function calendarDayAriaLabel(
  day: number,
  state: CalendarDayState,
  slotCount: number,
): string {
  switch (state) {
    case "available":
      return `${day}, ${slotCount} slot${slotCount === 1 ? "" : "s"} available`;
    case "selected":
      return `${day}, selected, ${slotCount} slot${slotCount === 1 ? "" : "s"}`;
    case "no-slots":
      return `${day}, no slots`;
    case "out-of-window":
      return `${day}, outside booking window`;
    case "outside-month":
      return `${day}, outside month`;
    default:
      return String(day);
  }
}
