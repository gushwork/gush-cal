import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  jsonError,
  requireSchedulerId,
} from "@/components/calendar-admin/require-scheduler";
import {
  BookingLinkSlugTakenError,
  deleteBookingLink,
  isUniqueViolation,
  updateBookingLink,
  type UpdateBookingLinkInput,
} from "@/lib/booking-links/links";
import { getDb } from "@/lib/db/client";
import { calendars } from "@/lib/db/schema";

type RouteParams = { params: Promise<{ id: string; linkId: string }> };

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

  const { id: calendarId, linkId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  let body: UpdateBookingLinkInput;
  try {
    body = (await request.json()) as UpdateBookingLinkInput;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  try {
    const link = await updateBookingLink(calendarId, linkId, body);
    if (!link) {
      return jsonError("Link not found", 404);
    }
    return NextResponse.json({ link });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update link";
    // BUG-059: typed conflict or a real PG unique-violation race → 409.
    if (err instanceof BookingLinkSlugTakenError || isUniqueViolation(err)) {
      return jsonError(message, 409);
    }
    return jsonError(message, 400);
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id: calendarId, linkId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  const deleted = await deleteBookingLink(calendarId, linkId);
  if (!deleted) {
    return jsonError("Link not found", 404);
  }

  return new NextResponse(null, { status: 204 });
}
