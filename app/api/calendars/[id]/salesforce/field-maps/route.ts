import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  jsonError,
  requireSchedulerId,
} from "@/components/calendar-admin/require-scheduler";
import {
  createFieldMap,
  listFieldMaps,
  type CreateFieldMapInput,
} from "@/lib/salesforce/field-map";
import { getDb } from "@/lib/db/client";
import { calendars } from "@/lib/db/schema";
import type { SalesforceEventType } from "@/lib/types/platform";

type RouteParams = { params: Promise<{ id: string }> };

async function getOwnedCalendar(calendarId: string, schedulerId: string) {
  const [calendar] = await getDb()
    .select()
    .from(calendars)
    .where(
      and(
        eq(calendars.id, calendarId),
        eq(calendars.schedulerId, schedulerId),
      ),
    )
    .limit(1);
  return calendar ?? null;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id: calendarId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  const fieldMaps = await listFieldMaps(calendarId);
  return NextResponse.json({ fieldMaps });
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id: calendarId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  let body: CreateFieldMapInput;
  try {
    body = (await request.json()) as CreateFieldMapInput;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const eventType = body.eventType as SalesforceEventType;
  if (!eventType || !["book", "cancel", "reschedule", "reassign"].includes(eventType)) {
    return jsonError("eventType must be book, cancel, reschedule, or reassign", 400);
  }
  if (!body.objectApiName) {
    return jsonError("objectApiName is required", 400);
  }
  if (!Array.isArray(body.fieldMappings) || body.fieldMappings.length === 0) {
    return jsonError("fieldMappings is required", 400);
  }

  try {
    const fieldMap = await createFieldMap(calendarId, { ...body, eventType });
    return NextResponse.json({ fieldMap }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create field map";
    return jsonError(message, 400);
  }
}
