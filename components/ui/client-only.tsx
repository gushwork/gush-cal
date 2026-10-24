"use client";

import { useIsClient } from "@/lib/ui/use-is-client";

export type ClientOnlyProps = {
  children: React.ReactNode;
  /** Rendered on the server and during hydration. */
  fallback: React.ReactNode;
};

/**
 * Renders `children` only after hydration. Use for UI whose first render
 * depends on the viewer's clock, locale, or timezone (date grids, slot
 * pickers, local times); server-rendering it would mismatch and force React
 * to discard the server HTML and re-render on the client.
 */
export function ClientOnly({ children, fallback }: ClientOnlyProps) {
  const isClient = useIsClient();
  return isClient ? children : fallback;
}
