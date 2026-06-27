import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  jsonError,
  requireSchedulerId,
} from "@/components/calendar-admin/require-scheduler";
import {
  createSequence,
  listSequences,
  type CreateSequenceInput,
} from "@/lib/email/sequences";
import { getDb } from "@/lib/db/client";
import { calendars } from "@/lib/db/schema";
import type { AppEventType } from "@/lib/types/platform";

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

  const sequences = await listSequences(calendarId);
  return NextResponse.json({ sequences });
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

  let body: CreateSequenceInput;
  try {
    body = (await request.json()) as CreateSequenceInput;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body.name?.trim()) {
    return jsonError("name is required", 400);
  }
  if (!body.triggerEvent) {
    return jsonError("triggerEvent is required", 400);
  }

  const sequence = await createSequence(calendarId, {
    name: body.name.trim(),
    enabled: body.enabled,
    triggerEvent: body.triggerEvent as AppEventType,
  });

  return NextResponse.json({ sequence }, { status: 201 });
}
