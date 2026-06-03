import type { Slot } from "@/lib/types";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import {
  blockPositionPercent,
  formatLocalTime,
  GRID_TOTAL_MINUTES,
} from "./time-utils";

type BookableOverlayProps = {
  slots: Slot[];
  rangeStart: string;
  timeZone: string;
  /** Week columns: slot count only, no "Bookable" title */
  compact?: boolean;
};

export function BookableOverlay({
  slots,
  rangeStart,
  timeZone,
  compact = false,
}: BookableOverlayProps) {
  return (
    <div
      className={cn(
        "relative border-l border-border bg-primary-soft/30",
        compact ? "w-full" : "min-w-[7rem] shrink-0",
      )}
      data-testid="bookable-overlay"
    >
      <div className="sticky top-0 z-10 border-b border-border bg-paper px-2 py-2 text-center">
        {compact ? (
          <Badge variant="count">{slots.length}</Badge>
        ) : (
          <>
            <div className="text-sm font-medium text-ink">Bookable</div>
            <Badge variant="count" className="mt-1">
              {slots.length}
            </Badge>
          </>
        )}
      </div>

      <div className="relative" style={{ height: `${GRID_TOTAL_MINUTES}px` }}>
        {slots.map((slot) => {
          const end = new Date(
            new Date(slot.startsAt).getTime() + slot.durationMinutes * 60_000,
          ).toISOString();
          const position = blockPositionPercent(
            slot.startsAt,
            end,
            rangeStart,
            timeZone,
          );
          if (!position) {
            return null;
          }

          return (
            <div
              key={slot.startsAt}
              className="absolute inset-x-1 rounded border-2 border-primary bg-surface/90 px-1 py-0.5 text-[10px] leading-tight text-ink"
              style={{
                top: `${position.top}%`,
                height: `${Math.max(position.height, 2)}%`,
              }}
              title={`${formatLocalTime(slot.startsAt, timeZone)} (${slot.durationMinutes}m, ${slot.eligibleMemberCount} eligible)`}
              data-testid="bookable-slot"
            >
              {formatLocalTime(slot.startsAt, timeZone)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
