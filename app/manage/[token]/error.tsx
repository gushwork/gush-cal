"use client";

import { RouteError } from "@/components/layout/route-error";

export default function ManageMeetingError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <RouteError
      error={error}
      retry={retry}
      title="We couldn’t load your meeting"
    />
  );
}
