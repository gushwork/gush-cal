import Link from "next/link";
import type { Slot } from "@/lib/types";
import { toDateKey } from "@/components/booking/group-slots-by-date";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import { GridHourLines } from "./grid-hour-lines";
import {
  blockPositionPercent,
  formatLocalTime,
  GRID_COLUMN_HEADER_HEIGHT_PX,
  GRID_TOTAL_MINUTES,
} from "./time-utils";

type BookableOverlayProps = {
  calendarId: string;
  slots: Slot[];
  rangeStart: string;
  timeZone: string;
  /** Week columns: slot count only, no "Bookable" title */
  compact?: boolean;
};

function bookDeepLink(
  calendarId: string,
  slot: Slot,
  timeZone: string,
): string {
  const date = toDateKey(new Date(slot.startsAt), timeZone);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(slot.startsAt));
  const params = new URLSearchParams({
    date,
    time,
    duration: String(slot.durationMinutes),
  });
  return `/calendars/${calendarId}/book?${params.toString()}`;
}

export function BookableOverlay({
  calendarId,
  slots,
  rangeStart,
  timeZone,
  compact = false,
}: BookableOverlayProps) {
  return (
    <div
      className={cn(
        "relative border-l border-border bg-primary-soft/30",
        compact ? "w-full min-w-0 flex-1" : "min-w-0 flex-1",
      )}
      data-testid="bookable-overlay"
    >
      <div
        className={cn(
          "sticky top-0 z-10 box-border flex flex-col items-center justify-center overflow-hidden border-b border-border bg-paper px-2 text-center",
          !compact && "gap-0.5",
        )}
        style={
          compact ? undefined : { height: `${GRID_COLUMN_HEADER_HEIGHT_PX}px` }
        }
      >
        {compact ? (
          <Badge variant="count">{slots.length}</Badge>
        ) : (
          <>
            <div className="text-sm font-medium leading-tight text-ink">
              Bookable
            </div>
            <Badge variant="count" className="py-0">
              {slots.length}
            </Badge>
          </>
        )}
      </div>

      <div className="relative" style={{ height: `${GRID_TOTAL_MINUTES}px` }}>
        <GridHourLines />
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

          const href = bookDeepLink(calendarId, slot, timeZone);
          const label = formatLocalTime(slot.startsAt, timeZone);

          return (
            <Link
              key={slot.startsAt}
              href={href}
              className="interactive absolute inset-x-1 rounded border-2 border-primary bg-surface/90 px-1 py-0.5 text-[10px] leading-tight text-ink hover:bg-primary-soft/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
              style={{
                top: `${position.top}%`,
                height: `${Math.max(position.height, 2)}%`,
              }}
              title={`Book ${label} (${slot.durationMinutes}m, ${slot.eligibleMemberCount} eligible)`}
              data-testid="bookable-slot"
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
