import { useCallback, useState } from "react";

/**
 * Tracks one in-flight row action (delete, revoke, toggle…) so its button can
 * show a pending label and sibling actions are disabled until it settles.
 * Keys are free-form, e.g. `delete:${id}`.
 */
export function usePendingAction() {
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const run = useCallback(
    async (key: string, action: () => Promise<void>) => {
      setPendingKey(key);
      try {
        await action();
      } finally {
        setPendingKey(null);
      }
    },
    [],
  );

  return { pendingKey, run };
}
