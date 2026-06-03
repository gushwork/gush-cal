import type { Slot } from "@/lib/types";
import { FREEBUSY_CACHE_TTL_MS } from "./constants";

type CacheEntry = {
  expiresAt: number;
  slots: Slot[];
};

const cache = new Map<string, CacheEntry>();

export function slotsCacheKey(parts: Record<string, string | number>): string {
  return Object.entries(parts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
}

export function getCachedSlots(key: string): Slot[] | null {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.slots;
}

export function setCachedSlots(key: string, slots: Slot[]): void {
  cache.set(key, {
    slots,
    expiresAt: Date.now() + FREEBUSY_CACHE_TTL_MS,
  });
}

/** @internal test helper */
export function clearSlotsCache(): void {
  cache.clear();
}

/** Drop cached slot lists for a calendar so cancelled slots reappear immediately. */
export function clearSlotsCacheForCalendar(calendarId: string): void {
  const needle = `calendarId=${calendarId}`;
  for (const key of cache.keys()) {
    if (key.includes(needle)) {
      cache.delete(key);
    }
  }
}
