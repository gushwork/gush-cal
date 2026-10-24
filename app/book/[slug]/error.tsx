"use client";

import { PageContainer } from "@/components/layout/page-container";
import { RouteError } from "@/components/layout/route-error";

export default function PublicBookError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <PageContainer variant="booking">
      <RouteError
        error={error}
        retry={retry}
        title="We couldn’t load this booking page"
      />
    </PageContainer>
  );
}
