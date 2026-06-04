import { calendarAccessMessage } from "@/lib/google/calendar-access-message";
import type { MemberBusyBlock } from "@/lib/types";
import { Badge } from "@/components/ui";
import { GridHourLines } from "./grid-hour-lines";
import {
  blockPositionPercent,
  formatLocalTime,
  GRID_COLUMN_HEADER_HEIGHT_PX,
  GRID_TOTAL_MINUTES,
} from "./time-utils";

type MemberColumnProps = {
  member: MemberBusyBlock;
  displayName: string;
  rangeStart: string;
  timeZone: string;
};

export function MemberColumn({
  member,
  displayName,
  rangeStart,
  timeZone,
}: MemberColumnProps) {
  const inaccessible = member.status === "inaccessible";

  return (
    <div className="relative min-w-0 flex-1 border-l border-border">
      <div
        className="sticky top-0 z-10 box-border flex flex-col justify-center overflow-hidden border-b border-border bg-paper px-2 text-center"
        style={{ height: `${GRID_COLUMN_HEADER_HEIGHT_PX}px` }}
      >
        <div
          className="truncate text-sm font-medium leading-tight text-ink"
          title={displayName}
        >
          {displayName}
        </div>
        {inaccessible ? (
          <Badge
            variant="muted"
            className="mx-auto mt-0.5 max-w-full border border-destructive/50 bg-destructive-soft px-2 py-0.5 text-[10px] font-semibold text-destructive"
            data-testid={`inaccessible-${member.memberId}`}
          >
            {calendarAccessMessage(member.errorCode)}
          </Badge>
        ) : (
          <div
            className="truncate text-[10px] leading-tight text-ink-muted"
            title={member.email}
          >
            {member.email}
          </div>
        )}
      </div>

      <div
        className="relative bg-surface"
        style={{ height: `${GRID_TOTAL_MINUTES}px` }}
        data-testid={`member-column-${member.memberId}`}
      >
        <GridHourLines />
        {inaccessible ? (
          <div
            className="absolute inset-0 flex items-center justify-center bg-destructive-soft/60"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, transparent, transparent 6px, color-mix(in srgb, var(--destructive) 25%, transparent) 6px, color-mix(in srgb, var(--destructive) 25%, transparent) 7px)",
            }}
          >
            <span className="rounded-full border border-destructive/50 bg-destructive-soft px-2 py-0.5 text-xs font-semibold text-destructive">
              Unavailable
            </span>
          </div>
        ) : (
          member.busy.map((block, index) => {
            const position = blockPositionPercent(
              block.start,
              block.end,
              rangeStart,
              timeZone,
            );
            if (!position) {
              return null;
            }

            return (
              <div
                key={`${block.start}-${index}`}
                className="absolute inset-x-1 rounded border border-ink bg-primary-soft px-1 py-0.5 text-[10px] leading-tight text-ink"
                style={{
                  top: `${position.top}%`,
                  height: `${position.height}%`,
                }}
                title={`${formatLocalTime(block.start, timeZone)} – ${formatLocalTime(block.end, timeZone)}`}
                data-testid={`busy-block-${member.memberId}`}
              >
                Busy
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
