import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import type {
  DuplicateCheckInput,
  DuplicateCheckResult,
  DuplicateGuardPort,
} from "@/lib/ports/duplicate-guard";
import type { EventsPort } from "@/lib/ports/events";
import type { ManageTokenPort } from "@/lib/ports/manage-token";
import { getDb, type AppDatabase } from "@/lib/db/client";
import { calendars, meetings, salesforceConnections } from "@/lib/db/schema";
import { createEventsStub } from "@/lib/stubs/events-stub";
import { createManageTokenStub } from "@/lib/stubs/manage-token-stub";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type DuplicateGuardDeps = {
  db?: AppDatabase;
  manageToken?: ManageTokenPort;
  events?: EventsPort;
  now?: () => Date;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

function tryRequireManageToken(): ManageTokenPort {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@/lib/meeting-tokens") as {
      createManageTokenPort?: () => ManageTokenPort;
    };
    if (typeof mod.createManageTokenPort === "function") {
      return mod.createManageTokenPort();
    }
  } catch {
    // module not present
  }
  return createManageTokenStub();
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

function activeMeetingConditions(normalizedEmail: string, nowIso: string) {
  return [
    sql`lower(trim(${meetings.guestEmail})) = ${normalizedEmail}`,
    isNull(meetings.cancelledAt),
    gt(meetings.startsAt, nowIso),
  ];
}

async function findActiveDuplicate(
  db: AppDatabase,
  input: DuplicateCheckInput,
  normalizedEmail: string,
  nowIso: string,
): Promise<string | null> {
  const conditions = activeMeetingConditions(normalizedEmail, nowIso);

  switch (input.settings.scope) {
    case "calendar": {
      const [row] = await db
        .select({ id: meetings.id })
        .from(meetings)
        .where(and(...conditions, eq(meetings.calendarId, input.calendarId)))
        .limit(1);
      return row?.id ?? null;
    }
    case "scheduler": {
      const [cal] = await db
        .select({ schedulerId: calendars.schedulerId })
        .from(calendars)
        .where(eq(calendars.id, input.calendarId))
        .limit(1);
      if (!cal) {
        return null;
      }
      const [row] = await db
        .select({ id: meetings.id })
        .from(meetings)
        .innerJoin(calendars, eq(meetings.calendarId, calendars.id))
        .where(and(...conditions, eq(calendars.schedulerId, cal.schedulerId)))
        .limit(1);
      return row?.id ?? null;
    }
    case "deployment": {
      const [row] = await db
        .select({ id: meetings.id })
        .from(meetings)
        .where(and(...conditions))
        .limit(1);
      return row?.id ?? null;
    }
    case "salesforce_connection": {
      const connectionCalendarId =
        input.salesforceConnectionId ?? input.calendarId;
      const [conn] = await db
        .select({ instanceUrl: salesforceConnections.instanceUrl })
        .from(salesforceConnections)
        .where(eq(salesforceConnections.calendarId, connectionCalendarId))
        .limit(1);
      if (!conn) {
        return null;
      }
      const linkedCalendars = await db
        .select({ calendarId: salesforceConnections.calendarId })
        .from(salesforceConnections)
        .where(eq(salesforceConnections.instanceUrl, conn.instanceUrl));
      const calendarIds = linkedCalendars.map((row) => row.calendarId);
      if (calendarIds.length === 0) {
        return null;
      }
      const [row] = await db
        .select({ id: meetings.id })
        .from(meetings)
        .where(and(...conditions, inArray(meetings.calendarId, calendarIds)))
        .limit(1);
      return row?.id ?? null;
    }
    default: {
      const _exhaustive: never = input.settings.scope;
      return _exhaustive;
    }
  }
}

export function createDuplicateGuardPort(
  deps?: DuplicateGuardDeps,
): DuplicateGuardPort {
  const db = deps?.db ?? getDb();
  const manageToken = deps?.manageToken ?? tryRequireManageToken();
  const events = deps?.events ?? tryRequireEvents();
  const now = deps?.now ?? (() => new Date());

  return {
    async check(input: DuplicateCheckInput): Promise<DuplicateCheckResult> {
      const normalized = normalizeEmail(input.guestEmail);
      if (!isValidEmail(normalized)) {
        return { ok: false, code: "INVALID_EMAIL" };
      }

      const nowIso = now().toISOString();
      const existingMeetingId = await findActiveDuplicate(
        db,
        input,
        normalized,
        nowIso,
      );

      if (!existingMeetingId) {
        return { ok: true, allowed: true };
      }

      const { manageUrl } = await manageToken.createForMeeting(existingMeetingId);

      await events.emit({
        calendarId: input.calendarId,
        eventType: "booking.duplicate_blocked",
        payload: {
          guestEmail: normalized,
          existingMeetingId,
        },
      });

      return {
        ok: true,
        allowed: false,
        existingMeetingId,
        manageUrl,
        mode: input.settings.uxMode,
      };
    },
  };
}
