import type { DuplicateGuardPort } from "@/lib/ports/duplicate-guard";
import type { EmailPort } from "@/lib/ports/email";
import type { EventsPort } from "@/lib/ports/events";
import type { ManageTokenPort } from "@/lib/ports/manage-token";
import type { RoutingPort } from "@/lib/ports/routing";
import type { SalesforcePort } from "@/lib/ports/salesforce";
import { createMeetingCounter } from "@/lib/db/meeting-counter";
import { createManageTokenPort } from "@/lib/meeting-tokens";
import { createRoutingPort } from "@/lib/routing";
import type { DbMeetingCounter } from "@/lib/ports/meeting-counter";
import type { GoogleCalendarPort } from "@/lib/ports/google-calendar";
import type { SlotEnginePort } from "@/lib/ports/slot-engine";
import { createDuplicateGuardStub } from "@/lib/stubs/duplicate-guard-stub";
import { createEmailStub } from "@/lib/stubs/email-stub";
import { createEventsStub } from "@/lib/stubs/events-stub";
import { createGoogleCalendarStub } from "@/lib/stubs/google-calendar-stub";
import { createManageTokenStub } from "@/lib/stubs/manage-token-stub";
import { createRoutingStub } from "@/lib/stubs/routing-stub";
import { createSalesforceStub } from "@/lib/stubs/salesforce-stub";
import { createSlotEngineStub } from "@/lib/stubs/slot-engine-stub";

export type AppDeps = {
  google: GoogleCalendarPort;
  slots: SlotEnginePort;
  db: DbMeetingCounter;
  routing: RoutingPort;
  salesforce: SalesforcePort;
  duplicateGuard: DuplicateGuardPort;
  events: EventsPort;
  manageToken: ManageTokenPort;
  email: EmailPort;
};

let cached: AppDeps | null = null;

function shouldUseStubs(): boolean {
  return process.env.USE_STUBS === "1";
}

function tryRequire<T>(path: string, factory: string): T | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(path) as Record<string, unknown>;
    const fn = mod[factory];
    if (typeof fn === "function") {
      return (fn as () => T)();
    }
  } catch {
    // module not present
  }
  return null;
}

function resolveGooglePort(): GoogleCalendarPort {
  if (shouldUseStubs()) {
    return createGoogleCalendarStub();
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { tryParseServiceAccountJson } = require("@/lib/google/calendar-client") as {
        tryParseServiceAccountJson: () => unknown;
      };
      if (!tryParseServiceAccountJson()) {
        return createGoogleCalendarStub();
      }
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createGoogleCalendarPort } = require("@/lib/google") as {
        createGoogleCalendarPort: () => GoogleCalendarPort;
      };
      return createGoogleCalendarPort();
    } catch {
      // Module not present yet
    }
  }

  return createGoogleCalendarStub();
}

function resolveSlotPort(
  google: GoogleCalendarPort,
  db: DbMeetingCounter,
): SlotEnginePort {
  if (shouldUseStubs()) {
    return createSlotEngineStub();
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createSlotEnginePort } = require("@/lib/slots") as {
      createSlotEnginePort: (deps: {
        google: GoogleCalendarPort;
        db: DbMeetingCounter;
      }) => SlotEnginePort;
    };
    return createSlotEnginePort({ google, db });
  } catch {
    return createSlotEngineStub();
  }
}

function resolveRoutingPort(): RoutingPort {
  if (shouldUseStubs() && !process.env.DATABASE_URL) {
    return createRoutingStub();
  }
  return createRoutingPort();
}

function resolveSalesforcePort(): SalesforcePort {
  if (shouldUseStubs()) {
    return createSalesforceStub();
  }
  let inner =
    tryRequire<SalesforcePort>("@/lib/salesforce", "createSalesforcePort") ??
    createSalesforceStub();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { wrapSalesforceCache } = require("@/lib/cache/cached-salesforce-port") as {
      wrapSalesforceCache: (p: SalesforcePort) => SalesforcePort;
    };
    inner = wrapSalesforceCache(inner);
  } catch {
    // cache module not present
  }
  return inner;
}

function resolveDuplicateGuardPort(): DuplicateGuardPort {
  if (shouldUseStubs()) {
    return createDuplicateGuardStub();
  }
  return (
    tryRequire<DuplicateGuardPort>(
      "@/lib/booking/duplicate-guard",
      "createDuplicateGuardPort",
    ) ?? createDuplicateGuardStub()
  );
}

function resolveEventsPort(): EventsPort {
  if (shouldUseStubs()) {
    return createEventsStub();
  }
  return tryRequire<EventsPort>("@/lib/events", "createEventsPort") ?? createEventsStub();
}

function resolveManageTokenPort(): ManageTokenPort {
  if (shouldUseStubs() && !process.env.DATABASE_URL) {
    return createManageTokenStub();
  }
  return createManageTokenPort();
}

function resolveEmailPort(): EmailPort {
  if (shouldUseStubs()) {
    return createEmailStub();
  }
  return tryRequire<EmailPort>("@/lib/email", "createEmailPort") ?? createEmailStub();
}

function createDbMeetingCounterOrStub(): DbMeetingCounter {
  if (!process.env.DATABASE_URL) {
    return {
      async countMeetingsForMember() {
        return 0;
      },
      async countMeetingsForMemberOnDay() {
        return 0;
      },
      async listMeetingStartsForMembers(memberIds) {
        return new Map(memberIds.map((memberId) => [memberId, []]));
      },
    };
  }
  return createMeetingCounter();
}

/** Real impls when env set; stubs otherwise. Respects USE_STUBS=1 for CI. */
export function createAppDeps(): AppDeps {
  if (cached) {
    return cached;
  }

  const db = createDbMeetingCounterOrStub();
  const google = resolveGooglePort();
  const slots = resolveSlotPort(google, db);

  cached = {
    google,
    slots,
    db,
    routing: resolveRoutingPort(),
    salesforce: resolveSalesforcePort(),
    duplicateGuard: resolveDuplicateGuardPort(),
    events: resolveEventsPort(),
    manageToken: resolveManageTokenPort(),
    email: resolveEmailPort(),
  };
  return cached;
}

/** Reset cached deps — for tests only */
export function resetAppDepsForTests(): void {
  cached = null;
}
