"use client";

import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/ui/cn";
import type { StepPanelBaseProps } from "./types";

export type BookingDurationPanelProps = StepPanelBaseProps & {
  durations: number[];
  selectedMinutes: number | null;
  onSelectMinutes: (minutes: number) => void;
};

export function BookingDurationPanel({
  durations,
  selectedMinutes,
  onSelectMinutes,
  loading = false,
  className,
}: BookingDurationPanelProps) {
  return (
    <div
      className={cn("flex flex-wrap gap-2", className)}
      role="group"
      aria-label="Duration"
    >
      {durations.map((minutes) => (
        <Chip
          key={minutes}
          shape="control"
          size="md"
          selected={selectedMinutes === minutes}
          disabled={loading}
          onClick={() => onSelectMinutes(minutes)}
        >
          {minutes} min
        </Chip>
      ))}
    </div>
  );
}
