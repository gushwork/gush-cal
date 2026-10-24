"use client";

import { Button, EmptyState } from "@/components/ui";
import { AlertTriangle } from "lucide-react";
import { useEffect, useTransition } from "react";

export type RouteErrorProps = {
  error: unknown;
  retry: () => void;
  title?: string;
  className?: string;
};

/**
 * Shared UI for `error.tsx` boundaries: keeps the surrounding shell mounted
 * and lets the viewer retry the failed segment instead of a blank page.
 */
export function RouteError({
  error,
  retry,
  title = "Something went wrong",
  className,
}: RouteErrorProps) {
  const [retrying, startRetry] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest =
    error instanceof Error && "digest" in error
      ? String((error as Error & { digest?: string }).digest ?? "")
      : "";

  return (
    <div role="alert" className={className}>
      <EmptyState
        icon={AlertTriangle}
        title={title}
        description={`This section could not be loaded. Check your connection and try again.${
          digest ? ` (Reference: ${digest})` : ""
        }`}
        action={
          <Button
            type="button"
            loading={retrying}
            loadingLabel="Retrying…"
            onClick={() => startRetry(() => retry())}
          >
            Try again
          </Button>
        }
      />
    </div>
  );
}
