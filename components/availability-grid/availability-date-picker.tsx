"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { toDateKey } from "@/components/booking/group-slots-by-date";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Icon } from "@/components/ui/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  addLocalDays,
  startOfLocalWeek,
} from "./time-utils";
import type { AvailabilityViewMode } from "./availability-url";

export type AvailabilityDatePickerProps = {
  rangeLabel: string;
  anchorDate: Date;
  viewMode: AvailabilityViewMode;
  timeZone: string;
  onSelectDate: (date: Date) => void;
};

function weekDateKeys(anchorDate: Date, timeZone: string): Set<string> {
  const weekStart = startOfLocalWeek(anchorDate, timeZone);
  const keys = new Set<string>();
  for (let index = 0; index < 7; index += 1) {
    keys.add(toDateKey(addLocalDays(weekStart, index, timeZone), timeZone));
  }
  return keys;
}

export function AvailabilityDatePicker({
  rangeLabel,
  anchorDate,
  viewMode,
  timeZone,
  onSelectDate,
}: AvailabilityDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(anchorDate);

  useEffect(() => {
    if (open) {
      setMonth(anchorDate);
    }
  }, [anchorDate, open]);

  const anchorKey = useMemo(
    () => toDateKey(anchorDate, timeZone),
    [anchorDate, timeZone],
  );

  const weekKeys = useMemo(
    () => (viewMode === "week" ? weekDateKeys(anchorDate, timeZone) : null),
    [anchorDate, timeZone, viewMode],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 px-1 font-medium text-ink hover:text-primary"
          aria-label="Choose date"
          data-testid="availability-date-trigger"
        >
          <span>{rangeLabel}</span>
          <Icon icon={ChevronDown} size="sm" className="text-ink-muted" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(100vw-2rem,20rem)]"
        data-testid="availability-date-popover"
      >
        <Calendar
          mode="single"
          month={month}
          onMonthChange={setMonth}
          selected={anchorDate}
          onSelect={(date) => {
            if (!date) {
              return;
            }
            onSelectDate(date);
            setOpen(false);
          }}
          showOutsideDays
          modifiers={{
            weekRange: (date) => {
              if (!weekKeys) {
                return false;
              }
              const key = toDateKey(date, timeZone);
              return weekKeys.has(key) && key !== anchorKey;
            },
          }}
          modifiersClassNames={{
            weekRange:
              "bg-primary-100 text-ink [&>button]:border-transparent [&>button]:bg-transparent",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
