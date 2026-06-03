import { calendarAccessMessage } from "@/lib/google/calendar-access-message";
import type { MemberBusyBlock } from "@/lib/types";
import { Badge } from "@/components/ui";
import {
  blockPositionPercent,
  formatLocalTime,
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
    <div className="relative min-w-[6.5rem] flex-1 border-l border-border">
      <div className="sticky top-0 z-10 border-b border-border bg-paper px-2 py-2 text-center">
        <div className="truncate text-sm font-medium text-ink">{displayName}</div>
        {inaccessible ? (
          <Badge
            variant="muted"
            className="mt-1 max-w-full border border-destructive/50 bg-destructive-soft px-2 py-1 font-semibold text-destructive"
            data-testid={`inaccessible-${member.memberId}`}
          >
            {calendarAccessMessage(member.errorCode)}
          </Badge>
        ) : (
          <div className="mt-1 text-xs text-ink-muted">{member.email}</div>
        )}
      </div>

      <div
        className="relative bg-surface"
        style={{ height: `${GRID_TOTAL_MINUTES}px` }}
        data-testid={`member-column-${member.memberId}`}
      >
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
