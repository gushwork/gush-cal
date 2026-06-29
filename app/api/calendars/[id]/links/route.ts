import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  jsonError,
  requireSchedulerId,
} from "@/components/calendar-admin/require-scheduler";
import {
  BookingLinkSlugTakenError,
  createBookingLink,
  isUniqueViolation,
  listBookingLinks,
  type CreateBookingLinkInput,
} from "@/lib/booking-links/links";
import { getDb } from "@/lib/db/client";
import { calendars } from "@/lib/db/schema";
import type { BookingLinkKind } from "@/lib/types/platform";

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

  const links = await listBookingLinks(calendarId);
  return NextResponse.json({ links });
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

  let body: CreateBookingLinkInput;
  try {
    body = (await request.json()) as CreateBookingLinkInput;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const kind = body.kind as BookingLinkKind;
  if (!kind || !["team", "member", "calendar"].includes(kind)) {
    return jsonError("kind must be team, member, or calendar", 400);
  }
  if (kind === "team" && !body.teamId) {
    return jsonError("teamId is required for team links", 400);
  }
  if (kind === "member" && !body.memberId) {
    return jsonError("memberId is required for member links", 400);
  }
  if (!body.slug && kind !== "member") {
    return jsonError("slug is required", 400);
  }

  try {
    const link = await createBookingLink(calendarId, { ...body, kind });
    return NextResponse.json({ link }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create link";
    // BUG-059: typed conflict or a real PG unique-violation race → 409.
    if (err instanceof BookingLinkSlugTakenError || isUniqueViolation(err)) {
      return jsonError(message, 409);
    }
    if (/not found/i.test(message)) {
      return jsonError(message, 404);
    }
    return jsonError(message, 400);
  }
}
