import type { LeadOwnerLookupResult } from "@/lib/ports/salesforce";
import { MemoryLru } from "./memory-lru";

export const SF_OWNER_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 500;

function cacheKey(calendarId: string, email: string): string {
  return `${calendarId}:${email.toLowerCase()}`;
}

const cache = new MemoryLru<LeadOwnerLookupResult>({
  maxSize: MAX_ENTRIES,
  ttlMs: SF_OWNER_CACHE_TTL_MS,
});

export function getCachedLeadOwner(
  calendarId: string,
  email: string,
  lookup: () => Promise<LeadOwnerLookupResult>,
): Promise<LeadOwnerLookupResult> {
  const key = cacheKey(calendarId, email);
  const hit = cache.get(key);
  if (hit !== undefined) {
    return Promise.resolve(hit);
  }
  return lookup().then((result) => {
    cache.set(key, result);
    return result;
  });
}

/** @internal test seam */
export function clearSfOwnerCache(): void {
  cache.clear();
}
