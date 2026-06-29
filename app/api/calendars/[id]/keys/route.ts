import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  jsonError,
  requireSchedulerId,
} from "@/components/calendar-admin/require-scheduler";
import { getDb } from "@/lib/db/client";
import { calendars } from "@/lib/db/schema";
import { createApiKey, listApiKeys } from "@/lib/events/api-keys";

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

  const keys = await listApiKeys(calendarId);
  return NextResponse.json({ keys });
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

  let body: { name?: string };
  try {
    body = (await request.json()) as { name?: string };
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return jsonError("name is required", 400);
  }

  const key = await createApiKey(calendarId, name, auth.schedulerId);
  return NextResponse.json({ key }, { status: 201 });
}
