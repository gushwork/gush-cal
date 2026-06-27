import { eq } from "drizzle-orm";
import type { EventsPort } from "@/lib/ports/events";
import type { SalesforceEventType } from "@/lib/types/platform";
import { defaultCalendarSettings, type SyncMode } from "@/lib/types/platform";
import { getDb } from "@/lib/db/client";
import { calendarSettings } from "@/lib/db/schema";
import type { SalesforceClient } from "./client";
import { applyFieldMappings, getFieldMapForEvent } from "./field-map";
import { LOOKUP_TIMEOUT_MS } from "./lookup-owner";

type SyncFieldMapResult = { ok: boolean; error?: string; recordId?: string };

function syncModeForEvent(
  eventType: SalesforceEventType,
  settings = defaultCalendarSettings(),
): SyncMode {
  switch (eventType) {
    case "book":
      return settings.salesforceSync.onBook;
    case "cancel":
      return settings.salesforceSync.onCancel;
    case "reschedule":
      return settings.salesforceSync.onReschedule;
    case "reassign":
      return settings.salesforceSync.onReassign;
  }
}

async function getCalendarSyncMode(
  calendarId: string,
  eventType: SalesforceEventType,
): Promise<SyncMode> {
  const [row] = await getDb()
    .select({ settings: calendarSettings.settings })
    .from(calendarSettings)
    .where(eq(calendarSettings.calendarId, calendarId))
    .limit(1);

  return syncModeForEvent(eventType, row?.settings ?? defaultCalendarSettings());
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | "TIMEOUT"> {
  return Promise.race([
    promise,
    new Promise<"TIMEOUT">((resolve) => {
      setTimeout(() => resolve("TIMEOUT"), ms);
    }),
  ]);
}

async function executeFieldMap(
  client: SalesforceClient,
  calendarId: string,
  eventType: SalesforceEventType,
  payload: Record<string, unknown>,
): Promise<SyncFieldMapResult> {
  const connection = await client.getConnection(calendarId);
  if (!connection) {
    return { ok: true };
  }

  const fieldMap = await getFieldMapForEvent(calendarId, eventType);
  if (!fieldMap) {
    return { ok: true };
  }

  const guestEmail =
    typeof payload.guestEmail === "string" ? payload.guestEmail : undefined;
  const mappedBody = applyFieldMappings(fieldMap.fieldMappings, payload);
  let recordId: string | undefined;

  try {
    if (fieldMap.lookupByEmail && guestEmail) {
      const leadResult = await client.queryByEmail(connection, "Lead", guestEmail);
      if (leadResult.records[0]?.Id) {
        recordId = String(leadResult.records[0].Id);
      } else {
        const contactResult = await client.queryByEmail(
          connection,
          "Contact",
          guestEmail,
        );
        if (contactResult.records[0]?.Id) {
          recordId = String(contactResult.records[0].Id);
        }
      }
    }

    if (!recordId) {
      if (!fieldMap.createIfMissing) {
        return { ok: true };
      }
      const created = await client.createRecord(
        connection,
        fieldMap.objectApiName,
        mappedBody,
      );
      recordId = created.id;
      return { ok: true, recordId };
    }

    const patchBody = { ...mappedBody };
    if (payload.reassignOwner === true && typeof payload.memberEmail === "string") {
      patchBody.OwnerId = payload.memberEmail;
    }

    await client.patchRecord(connection, fieldMap.objectApiName, recordId, patchBody);
    return { ok: true, recordId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Salesforce sync failed";
    return { ok: false, error: message };
  }
}

export function createSyncFieldMapHandler(
  client: SalesforceClient,
  events: EventsPort,
) {
  async function runSync(
    calendarId: string,
    eventType: SalesforceEventType,
    payload: Record<string, unknown>,
    syncMode: SyncMode,
  ): Promise<SyncFieldMapResult> {
    const meetingId =
      typeof payload.meetingId === "string" ? payload.meetingId : undefined;

    const work = executeFieldMap(client, calendarId, eventType, payload);

    const result =
      syncMode === "sync"
        ? await withTimeout(work, LOOKUP_TIMEOUT_MS)
        : await work;

    if (result === "TIMEOUT") {
      await events.emit({
        calendarId,
        eventType: "salesforce.sync_failed",
        meetingId,
        payload: { meetingId, eventType, error: "TIMEOUT" },
      });
      return { ok: false, error: "TIMEOUT" };
    }

    if (result.ok) {
      await events.emit({
        calendarId,
        eventType: "salesforce.sync_succeeded",
        meetingId,
        payload: { meetingId, eventType, recordId: result.recordId },
      });
      return { ok: true };
    }

    await events.emit({
      calendarId,
      eventType: "salesforce.sync_failed",
      meetingId,
      payload: { meetingId, eventType, error: result.error },
    });
    return result;
  }

  return async function syncFieldMap(
    calendarId: string,
    eventType: SalesforceEventType,
    payload: Record<string, unknown>,
  ): Promise<{ ok: boolean; error?: string }> {
    const syncMode = await getCalendarSyncMode(calendarId, eventType);

    if (syncMode === "async") {
      void runSync(calendarId, eventType, payload, "async");
      return { ok: true };
    }

    const result = await runSync(calendarId, eventType, payload, "sync");
    return { ok: result.ok, ...(result.error ? { error: result.error } : {}) };
  };
}
