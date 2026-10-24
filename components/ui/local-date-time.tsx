"use client";

import { useIsClient } from "@/lib/ui/use-is-client";

export type LocalDateTimeProps = {
  value: string | null;
  /** Text when `value` is null. */
  emptyLabel?: string;
  options?: Intl.DateTimeFormatOptions;
};

const DEFAULT_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

/**
 * Formats an instant in the viewer's locale and timezone. Server-rendered
 * markup shows a stable placeholder so hydration never mismatches.
 */
export function LocalDateTime({
  value,
  emptyLabel = "Never",
  options = DEFAULT_OPTIONS,
}: LocalDateTimeProps) {
  const isClient = useIsClient();
  if (!value) {
    return <>{emptyLabel}</>;
  }
  return (
    <time dateTime={value}>
      {isClient
        ? new Intl.DateTimeFormat(undefined, options).format(new Date(value))
        : "…"}
    </time>
  );
}
