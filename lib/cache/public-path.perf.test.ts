import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LeadOwnerLookupResult, SalesforcePort } from "@/lib/ports/salesforce";
import { wrapSalesforceCache } from "./cached-salesforce-port";
import { MemoryLru } from "./memory-lru";
import {
  clearSfOwnerCache,
  getCachedLeadOwner,
  SF_OWNER_CACHE_TTL_MS,
} from "./sf-owner-cache";

/** Public funnel p95 < 3000ms — budgets from contracts.md (SP-14) */
export const PUBLIC_PATH_BUDGETS_MS = {
  calendarBundleLoad: 200,
  sfLeadOwnerLookup: 800,
  duplicateCheck: 50,
  slotGeneration: 1200,
  confirm: 1500,
} as const;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeSlowSfPort(delayMs: number): SalesforcePort {
  const lookup = vi.fn(async (): Promise<LeadOwnerLookupResult> => {
    await delay(delayMs);
    return {
      ok: true,
      ownerEmail: "owner@acme.com",
      recordId: "rec-1",
      recordType: "Lead",
    };
  });
  return {
    lookupLeadOwner: lookup,
    async syncFieldMap() {
      return { ok: true };
    },
  };
}

describe("SP-14 public path performance", () => {
  beforeEach(() => {
    clearSfOwnerCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("documents public funnel step budgets", () => {
    const total =
      PUBLIC_PATH_BUDGETS_MS.calendarBundleLoad +
      PUBLIC_PATH_BUDGETS_MS.sfLeadOwnerLookup +
      PUBLIC_PATH_BUDGETS_MS.duplicateCheck +
      PUBLIC_PATH_BUDGETS_MS.slotGeneration;
    expect(total).toBeLessThan(3000);
    expect(PUBLIC_PATH_BUDGETS_MS.sfLeadOwnerLookup).toBe(800);
  });

  it("cache miss calls inner lookup once; hit skips inner (700ms → <10ms)", async () => {
    const inner = makeSlowSfPort(700);
    const cached = wrapSalesforceCache(inner);

    const firstStart = performance.now();
    await cached.lookupLeadOwner("cal-1", "guest@acme.com");
    const firstElapsed = performance.now() - firstStart;
    expect(firstElapsed).toBeGreaterThanOrEqual(650);
    expect(inner.lookupLeadOwner).toHaveBeenCalledTimes(1);

    const secondStart = performance.now();
    await cached.lookupLeadOwner("cal-1", "guest@acme.com");
    const secondElapsed = performance.now() - secondStart;
    expect(secondElapsed).toBeLessThan(10);
    expect(inner.lookupLeadOwner).toHaveBeenCalledTimes(1);
  });

  it("caches NOT_FOUND and ERROR results", async () => {
    const lookup = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, code: "NOT_FOUND" } satisfies LeadOwnerLookupResult)
      .mockResolvedValueOnce({ ok: false, code: "ERROR" } satisfies LeadOwnerLookupResult);
    const port = wrapSalesforceCache({ lookupLeadOwner: lookup, syncFieldMap: async () => ({ ok: true }) });

    await port.lookupLeadOwner("cal-1", "a@x.com");
    await port.lookupLeadOwner("cal-1", "a@x.com");
    expect(lookup).toHaveBeenCalledTimes(1);

    await port.lookupLeadOwner("cal-1", "b@x.com");
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it("keys cache by calendarId and normalized email", async () => {
    const lookup = vi.fn(async () => ({
      ok: true as const,
      ownerEmail: "o@acme.com",
      recordId: "r1",
      recordType: "Lead" as const,
    }));
    const port = wrapSalesforceCache({ lookupLeadOwner: lookup, syncFieldMap: async () => ({ ok: true }) });

    await port.lookupLeadOwner("cal-a", "Guest@Acme.com");
    await port.lookupLeadOwner("cal-a", "guest@acme.com");
    expect(lookup).toHaveBeenCalledTimes(1);

    await port.lookupLeadOwner("cal-b", "guest@acme.com");
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it("syncFieldMap bypasses cache", async () => {
    const sync = vi.fn(async () => ({ ok: true }));
    const port = wrapSalesforceCache({
      lookupLeadOwner: async () => ({ ok: false, code: "NOT_FOUND" }),
      syncFieldMap: sync,
    });
    await port.syncFieldMap("cal-1", "book", { guestEmail: "g@x.com" });
    await port.syncFieldMap("cal-1", "book", { guestEmail: "g@x.com" });
    expect(sync).toHaveBeenCalledTimes(2);
  });
});

describe("MemoryLru", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("evicts oldest entry when maxSize exceeded", () => {
    const lru = new MemoryLru<string>({ maxSize: 2, ttlMs: 60_000 });
    lru.set("a", "1");
    lru.set("b", "2");
    lru.set("c", "3");
    expect(lru.get("a")).toBeUndefined();
    expect(lru.get("b")).toBe("2");
    expect(lru.get("c")).toBe("3");
  });

  it("expires entries after ttl", () => {
    const lru = new MemoryLru<string>({ maxSize: 10, ttlMs: 1000 });
    lru.set("k", "v");
    expect(lru.get("k")).toBe("v");
    vi.advanceTimersByTime(1001);
    expect(lru.get("k")).toBeUndefined();
  });
});

describe("getCachedLeadOwner TTL", () => {
  beforeEach(() => {
    clearSfOwnerCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refetches after SF_OWNER_CACHE_TTL_MS", async () => {
    const lookup = vi.fn(async () => ({
      ok: true as const,
      ownerEmail: "o@acme.com",
      recordId: "r1",
      recordType: "Lead" as const,
    }));

    await getCachedLeadOwner("cal-1", "g@x.com", lookup);
    expect(lookup).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(SF_OWNER_CACHE_TTL_MS - 1);
    await getCachedLeadOwner("cal-1", "g@x.com", lookup);
    expect(lookup).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2);
    await getCachedLeadOwner("cal-1", "g@x.com", lookup);
    expect(lookup).toHaveBeenCalledTimes(2);
  });
});
