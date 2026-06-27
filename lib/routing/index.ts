import type { RoutingPort } from "@/lib/ports/routing";
import type { EventsPort } from "@/lib/ports/events";
import type { SalesforcePort } from "@/lib/ports/salesforce";
import { createEventsStub } from "@/lib/stubs/events-stub";
import { createSalesforceStub } from "@/lib/stubs/salesforce-stub";
import { resolveBookingTarget, type RoutingDeps } from "./resolve-target";

export type RoutingPortDeps = Partial<RoutingDeps>;

let depsOverride: RoutingPortDeps | null = null;

/** @internal test seam */
export function setRoutingPortDepsForTest(deps: RoutingPortDeps | null): void {
  depsOverride = deps;
}

function tryRequireSalesforce(): SalesforcePort {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@/lib/salesforce") as {
      createSalesforcePort?: () => SalesforcePort;
    };
    if (typeof mod.createSalesforcePort === "function") {
      return mod.createSalesforcePort();
    }
  } catch {
    // module not present
  }
  return createSalesforceStub();
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

function resolveDeps(overrides?: RoutingPortDeps): RoutingDeps {
  const base = depsOverride ?? overrides ?? {};
  return {
    salesforce: base.salesforce ?? tryRequireSalesforce(),
    events: base.events ?? tryRequireEvents(),
  };
}

export function createRoutingPort(deps?: RoutingPortDeps): RoutingPort {
  const resolved = resolveDeps(deps);
  return {
    resolveBookingTarget(input) {
      return resolveBookingTarget(input, resolved);
    },
  };
}

export { resolveBookingTarget } from "./resolve-target";
export { loadCalendarRoutingSettings } from "./load-settings";
export { parseBookingUrlContext, parseResolveQuery } from "./parse-request-path";
