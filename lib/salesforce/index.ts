import type { EventsPort } from "@/lib/ports/events";
import type { SalesforcePort } from "@/lib/ports/salesforce";
import { createEventsStub } from "@/lib/stubs/events-stub";
import { createSalesforceClient, type FetchFn } from "./client";
import { lookupLeadOwner as lookupLeadOwnerImpl } from "./lookup-owner";
import { createSyncFieldMapHandler } from "./sync-field-map";

export type SalesforceDeps = {
  fetch?: FetchFn;
  events?: EventsPort;
};

let depsOverride: SalesforceDeps | null = null;

/** @internal test seam */
export function setSalesforceDepsForTest(deps: SalesforceDeps | null): void {
  depsOverride = deps;
}

function resolveDeps(): Required<SalesforceDeps> {
  if (depsOverride) {
    return {
      fetch: depsOverride.fetch ?? fetch,
      events: depsOverride.events ?? createEventsStub(),
    };
  }

  return {
    fetch: fetch,
    events: tryRequireEvents(),
  };
}

function tryRequireEvents(): EventsPort {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@/lib/events") as {
      createEventsPort?: () => EventsPort;
    };
    if (typeof mod.createEventsPort === "function") {
      return mod.createEventsPort();
    }
  } catch {
    // module not present
  }
  return createEventsStub();
}

export function createSalesforcePort(): SalesforcePort {
  const deps = resolveDeps();
  const client = createSalesforceClient({ fetch: deps.fetch });
  const syncFieldMap = createSyncFieldMapHandler(client, deps.events);

  return {
    lookupLeadOwner(calendarId, email) {
      return lookupLeadOwnerImpl(client, calendarId, email);
    },
    syncFieldMap,
  };
}

export { LOOKUP_TIMEOUT_MS } from "./lookup-owner";
