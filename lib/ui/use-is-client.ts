import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * False during server render and the hydration pass, true afterwards. Use it to
 * defer output that depends on the viewer's clock, locale, or timezone so
 * server HTML never mismatches the client.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
