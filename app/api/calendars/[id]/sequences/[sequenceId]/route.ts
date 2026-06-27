import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  jsonError,
  requireSchedulerId,
} from "@/components/calendar-admin/require-scheduler";
import {
  deleteSequence,
  getSequence,
  listSequenceSteps,
  updateSequence,
  type UpdateSequenceInput,
} from "@/lib/email/sequences";
import { getDb } from "@/lib/db/client";
import { calendars } from "@/lib/db/schema";
import type { AppEventType } from "@/lib/types/platform";

type RouteParams = { params: Promise<{ id: string; sequenceId: string }> };

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

  const { id: calendarId, sequenceId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  const sequence = await getSequence(calendarId, sequenceId);
  if (!sequence) {
    return jsonError("Sequence not found", 404);
  }

  const steps = await listSequenceSteps(calendarId, sequenceId);
  return NextResponse.json({ sequence, steps: steps ?? [] });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id: calendarId, sequenceId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  let body: UpdateSequenceInput;
  try {
    body = (await request.json()) as UpdateSequenceInput;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const sequence = await updateSequence(calendarId, sequenceId, {
    ...body,
    ...(body.triggerEvent != null
      ? { triggerEvent: body.triggerEvent as AppEventType }
      : {}),
  });
  if (!sequence) {
    return jsonError("Sequence not found", 404);
  }

  return NextResponse.json({ sequence });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id: calendarId, sequenceId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  const deleted = await deleteSequence(calendarId, sequenceId);
  if (!deleted) {
    return jsonError("Sequence not found", 404);
  }

  return new NextResponse(null, { status: 204 });
}
