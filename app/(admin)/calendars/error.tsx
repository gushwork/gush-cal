"use client";

import { PageContainer } from "@/components/layout/page-container";
import { RouteError } from "@/components/layout/route-error";

export default function CalendarsError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <PageContainer>
      <RouteError error={error} retry={retry} />
    </PageContainer>
  );
}
