"use client";

import { RouteError } from "@/components/layout/route-error";
import { PageContainer } from "@/components/layout/page-container";

export default function AppAdminError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <PageContainer variant="booking">
      <RouteError error={error} retry={retry} />
    </PageContainer>
  );
}
