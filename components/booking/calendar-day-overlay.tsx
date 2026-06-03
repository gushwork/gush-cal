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
    slotCount > 0 &&
    (state === "available" || state === "selected");

  return (
    <span className="flex flex-col items-center justify-center">
      <span
        className={cn(
          "text-sm font-medium leading-none",
          state === "selected" && "text-white",
          (state === "no-slots" || state === "out-of-window") &&
            "text-ink-muted/40",
          state === "outside-month" && "text-ink-muted/40",
          state === "available" && "text-ink",
        )}
      >
        {day}
      </span>
      {showBadge && (
        <span
          className={cn(
            "mt-0.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
            state === "selected"
              ? "bg-white/20 text-white"
              : "bg-primary text-white",
          )}
        >
          {slotCount}
        </span>
      )}
    </span>
  );
}
