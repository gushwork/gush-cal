import type { FreeBusyResult } from "@/lib/ports/google-calendar";

const TTL_MS = 30_000;

type CacheEntry = {
  expiresAt: number;
  result: FreeBusyResult;
};

const cache = new Map<string, CacheEntry>();

export function freeBusyCacheKey(parts: Record<string, string>): string {
  return Object.entries(parts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
}

export function getCachedFreeBusy(key: string): FreeBusyResult | null {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

export function setCachedFreeBusy(key: string, result: FreeBusyResult): void {
  cache.set(key, {
    result,
    expiresAt: Date.now() + TTL_MS,
  });
}

/** @internal test helper */
export function clearFreeBusyCache(): void {
  cache.clear();
}
