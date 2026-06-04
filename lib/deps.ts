import { createMeetingCounter } from "@/lib/db/meeting-counter";
import type { DbMeetingCounter } from "@/lib/ports/meeting-counter";
import type { GoogleCalendarPort } from "@/lib/ports/google-calendar";
import type { SlotEnginePort } from "@/lib/ports/slot-engine";
import { createGoogleCalendarStub } from "@/lib/stubs/google-calendar-stub";
import { createSlotEngineStub } from "@/lib/stubs/slot-engine-stub";

export type AppDeps = {
  google: GoogleCalendarPort;
  slots: SlotEnginePort;
  db: DbMeetingCounter;
};

let cached: AppDeps | null = null;

function shouldUseStubs(): boolean {
  return process.env.USE_STUBS === "1";
}

function resolveGooglePort(): GoogleCalendarPort {
  if (shouldUseStubs()) {
    return createGoogleCalendarStub();
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      // SP-02 adds lib/google — picked up automatically when merged
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
    // SP-03 adds lib/slots — picked up automatically when merged
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

  cached = { google, slots, db };
  return cached;
}

/** Reset cached deps — for tests only */
export function resetAppDepsForTests(): void {
  cached = null;
}
