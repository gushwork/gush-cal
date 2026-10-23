"use client";

import { RouteError } from "@/components/layout/route-error";

/** Content-pane error: the Calendar header and sidebar stay usable. */
export default function CalendarSectionError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return <RouteError error={error} retry={retry} />;
}
