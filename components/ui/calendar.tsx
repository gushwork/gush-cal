"use client";

import * as React from "react";
import {
  DayPicker,
  getDefaultClassNames,
  type DayPickerProps,
} from "react-day-picker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

export type CalendarProps = DayPickerProps;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}: CalendarProps) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("w-full", className)}
      classNames={{
        root: cn("w-full", defaults.root),
        months: cn("flex flex-col gap-4", defaults.months),
        month: cn("flex w-full flex-col gap-3", defaults.month),
        month_caption: cn(
          "relative flex items-center justify-center pb-1",
          defaults.month_caption,
        ),
        caption_label: cn(
          "font-display text-lg font-medium text-ink",
          defaults.caption_label,
        ),
        nav: cn(
          "absolute inset-x-0 top-0 flex items-center justify-between",
          defaults.nav,
        ),
        button_previous: cn("size-8 p-0", defaults.button_previous),
        button_next: cn("size-8 p-0", defaults.button_next),
        weekdays: cn("flex", defaults.weekdays),
        weekday: cn(
          "w-full flex-1 text-center text-xs font-medium text-ink-muted",
          defaults.weekday,
        ),
        week: cn("mt-1 flex w-full gap-1", defaults.week),
        day: cn(
          "relative flex-1 p-0 text-center focus-within:z-10",
          defaults.day,
        ),
        day_button: cn(
          "size-auto w-full rounded-lg border border-transparent p-0 font-normal",
          defaults.day_button,
        ),
        outside: cn("opacity-40", defaults.outside),
        disabled: cn("opacity-40", defaults.disabled),
        selected: cn("border-primary bg-primary text-white", defaults.selected),
        today: cn("font-semibold", defaults.today),
        ...classNames,
      }}
      components={{
        Chevron: ({ className: chevronClassName, orientation, ...chevronProps }) => (
          <svg
            {...chevronProps}
            className={cn("size-4 text-ink-muted", chevronClassName)}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            {orientation === "left" ? (
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" fill="none" />
            ) : (
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" fill="none" />
            )}
          </svg>
        ),
        PreviousMonthButton: ({
          className: btnClassName,
          children,
          ...btnProps
        }) => (
          <Button
            variant="ghost"
            size="sm"
            className={cn("size-8 p-0", btnClassName)}
            {...btnProps}
          >
            {children}
          </Button>
        ),
        NextMonthButton: ({
          className: btnClassName,
          children,
          ...btnProps
        }) => (
          <Button
            variant="ghost"
            size="sm"
            className={cn("size-8 p-0", btnClassName)}
            {...btnProps}
          >
            {children}
          </Button>
        ),
        ...components,
      }}
      {...props}
    />
  );
}

export { Calendar };
