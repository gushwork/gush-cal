import type { AppDeps } from "@/lib/deps";
import { createDuplicateGuardStub } from "@/lib/stubs/duplicate-guard-stub";
import { createEmailStub } from "@/lib/stubs/email-stub";
import { createEventsStub } from "@/lib/stubs/events-stub";
import { createManageTokenStub } from "@/lib/stubs/manage-token-stub";
import { createRoutingStub } from "@/lib/stubs/routing-stub";
import { createSalesforceStub } from "@/lib/stubs/salesforce-stub";

export function createPlatformDepsStub(
  overrides?: Partial<
    Pick<
      AppDeps,
      | "routing"
      | "salesforce"
      | "duplicateGuard"
      | "events"
      | "manageToken"
      | "email"
    >
  >,
): Pick<
  AppDeps,
  "routing" | "salesforce" | "duplicateGuard" | "events" | "manageToken" | "email"
> {
  return {
    routing: createRoutingStub(),
    salesforce: createSalesforceStub(),
    duplicateGuard: createDuplicateGuardStub(),
    events: createEventsStub(),
    manageToken: createManageTokenStub(),
    email: createEmailStub(),
    ...overrides,
  };
}
