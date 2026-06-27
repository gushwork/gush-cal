import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { salesforceFieldMaps } from "@/lib/db/schema";
import type {
  FieldMapping,
  SalesforceEventType,
  SalesforceFieldMap,
} from "@/lib/types/platform";

export type CreateFieldMapInput = {
  eventType: SalesforceEventType;
  objectApiName: string;
  lookupByEmail?: boolean;
  createIfMissing?: boolean;
  fieldMappings: FieldMapping[];
};

export type UpdateFieldMapInput = Partial<CreateFieldMapInput>;

function toFieldMap(row: typeof salesforceFieldMaps.$inferSelect): SalesforceFieldMap {
  return {
    id: row.id,
    calendarId: row.calendarId,
    eventType: row.eventType,
    objectApiName: row.objectApiName,
    lookupByEmail: row.lookupByEmail,
    createIfMissing: row.createIfMissing,
    fieldMappings: row.fieldMappings as FieldMapping[],
  };
}

export function applyFieldMappings(
  fieldMappings: FieldMapping[],
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const mapping of fieldMappings) {
    if (mapping.source === "static") {
      body[mapping.targetFieldApiName] = mapping.staticValue ?? "";
      continue;
    }
    const value = payload[mapping.source];
    if (value !== undefined) {
      body[mapping.targetFieldApiName] = value;
    }
  }
  return body;
}

export async function listFieldMaps(calendarId: string): Promise<SalesforceFieldMap[]> {
  const rows = await getDb()
    .select()
    .from(salesforceFieldMaps)
    .where(eq(salesforceFieldMaps.calendarId, calendarId))
    .orderBy(asc(salesforceFieldMaps.eventType));

  return rows.map(toFieldMap);
}

export async function getFieldMapForEvent(
  calendarId: string,
  eventType: SalesforceEventType,
): Promise<SalesforceFieldMap | null> {
  const [row] = await getDb()
    .select()
    .from(salesforceFieldMaps)
    .where(
      and(
        eq(salesforceFieldMaps.calendarId, calendarId),
        eq(salesforceFieldMaps.eventType, eventType),
      ),
    )
    .limit(1);

  return row ? toFieldMap(row) : null;
}

export async function createFieldMap(
  calendarId: string,
  input: CreateFieldMapInput,
): Promise<SalesforceFieldMap> {
  const [row] = await getDb()
    .insert(salesforceFieldMaps)
    .values({
      calendarId,
      eventType: input.eventType,
      objectApiName: input.objectApiName,
      lookupByEmail: input.lookupByEmail ?? true,
      createIfMissing: input.createIfMissing ?? false,
      fieldMappings: input.fieldMappings,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create field map");
  }
  return toFieldMap(row);
}

export async function updateFieldMap(
  calendarId: string,
  mapId: string,
  input: UpdateFieldMapInput,
): Promise<SalesforceFieldMap | null> {
  const [row] = await getDb()
    .update(salesforceFieldMaps)
    .set({
      ...(input.eventType != null ? { eventType: input.eventType } : {}),
      ...(input.objectApiName != null ? { objectApiName: input.objectApiName } : {}),
      ...(input.lookupByEmail != null ? { lookupByEmail: input.lookupByEmail } : {}),
      ...(input.createIfMissing != null ? { createIfMissing: input.createIfMissing } : {}),
      ...(input.fieldMappings != null ? { fieldMappings: input.fieldMappings } : {}),
    })
    .where(
      and(
        eq(salesforceFieldMaps.id, mapId),
        eq(salesforceFieldMaps.calendarId, calendarId),
      ),
    )
    .returning();

  return row ? toFieldMap(row) : null;
}

export async function deleteFieldMap(
  calendarId: string,
  mapId: string,
): Promise<boolean> {
  const deleted = await getDb()
    .delete(salesforceFieldMaps)
    .where(
      and(
        eq(salesforceFieldMaps.id, mapId),
        eq(salesforceFieldMaps.calendarId, calendarId),
      ),
    )
    .returning({ id: salesforceFieldMaps.id });

  return deleted.length > 0;
}

/** Default templates seeded on first OAuth connect — customize via field map CRUD. */
const DEFAULT_FIELD_MAPS: CreateFieldMapInput[] = [
  {
    eventType: "book",
    objectApiName: "Lead",
    lookupByEmail: true,
    createIfMissing: true,
    fieldMappings: [
      { source: "guestEmail", targetFieldApiName: "Email" },
      { source: "startsAt", targetFieldApiName: "Meeting_Time__c" },
      { source: "memberEmail", targetFieldApiName: "Assigned_To__c" },
    ],
  },
  {
    eventType: "cancel",
    objectApiName: "Lead",
    lookupByEmail: true,
    createIfMissing: false,
    fieldMappings: [
      { source: "guestEmail", targetFieldApiName: "Email" },
      { source: "static", staticValue: "Cancelled", targetFieldApiName: "Status__c" },
    ],
  },
  {
    eventType: "reschedule",
    objectApiName: "Lead",
    lookupByEmail: true,
    createIfMissing: false,
    fieldMappings: [
      { source: "guestEmail", targetFieldApiName: "Email" },
      { source: "startsAt", targetFieldApiName: "Meeting_Time__c" },
    ],
  },
  {
    eventType: "reassign",
    objectApiName: "Lead",
    lookupByEmail: true,
    createIfMissing: false,
    fieldMappings: [
      { source: "guestEmail", targetFieldApiName: "Email" },
      { source: "memberEmail", targetFieldApiName: "Assigned_To__c" },
    ],
  },
];

export async function seedDefaultFieldMaps(calendarId: string): Promise<void> {
  const existing = await listFieldMaps(calendarId);
  if (existing.length > 0) {
    return;
  }

  for (const template of DEFAULT_FIELD_MAPS) {
    await createFieldMap(calendarId, template);
  }
}
