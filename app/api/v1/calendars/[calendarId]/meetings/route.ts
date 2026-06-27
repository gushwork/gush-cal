import { NextResponse } from "next/server";
import {
  confirmBooking,
  MIN_NOTICE_VIOLATION,
} from "@/lib/booking/confirm-booking";
import { createAppDeps } from "@/lib/deps";
import { getDb } from "@/lib/db/client";
import { loadCalendarBundleByCalendarId } from "@/lib/db/assemble-calendar-bundle";
import { requireApiKeyAuth } from "@/lib/events/api-key-auth";
import type { ConfirmBookingBody } from "@/lib/types";

type RouteParams = { params: Promise<{ calendarId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { calendarId } = await params;

  const auth = await requireApiKeyAuth(request, calendarId);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bundle = await loadCalendarBundleByCalendarId(getDb(), calendarId);
  if (!bundle) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }

  let body: ConfirmBookingBody;
  try {
    body = (await request.json()) as ConfirmBookingBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!bundle.durations.includes(body.durationMinutes)) {
    return NextResponse.json(
      { error: "Duration not allowed for this calendar" },
      { status: 400 },
    );
  }

  const deps = createAppDeps();
  const result = await confirmBooking(deps, {
    bundle,
    body,
    bookedBy: "scheduler",
  });

  if (!result.ok) {
    if (result.code === "SLOT_UNAVAILABLE") {
      return NextResponse.json({ error: "SLOT_UNAVAILABLE" }, { status: 409 });
    }
    if (result.code === MIN_NOTICE_VIOLATION) {
      return NextResponse.json({ error: MIN_NOTICE_VIOLATION }, { status: 400 });
    }
    if (result.code === "DUPLICATE_MEETING") {
      return NextResponse.json(
        {
          error: "DUPLICATE_MEETING",
          existingMeetingId: result.existingMeetingId,
          manageUrl: result.manageUrl,
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create calendar event" },
      { status: 502 },
    );
  }

  return NextResponse.json({ meeting: result.meeting }, { status: 201 });
}
