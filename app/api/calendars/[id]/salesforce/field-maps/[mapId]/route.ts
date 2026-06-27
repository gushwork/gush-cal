import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  jsonError,
  requireSchedulerId,
} from "@/components/calendar-admin/require-scheduler";
import {
  deleteFieldMap,
  updateFieldMap,
  type UpdateFieldMapInput,
} from "@/lib/salesforce/field-map";
import { getDb } from "@/lib/db/client";
import { calendars } from "@/lib/db/schema";

type RouteParams = { params: Promise<{ id: string; mapId: string }> };

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

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id: calendarId, mapId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  let body: UpdateFieldMapInput;
  try {
    body = (await request.json()) as UpdateFieldMapInput;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const fieldMap = await updateFieldMap(calendarId, mapId, body);
  if (!fieldMap) {
    return jsonError("Field map not found", 404);
  }

  return NextResponse.json({ fieldMap });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id: calendarId, mapId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  const deleted = await deleteFieldMap(calendarId, mapId);
  if (!deleted) {
    return jsonError("Field map not found", 404);
  }

  return new NextResponse(null, { status: 204 });
}
