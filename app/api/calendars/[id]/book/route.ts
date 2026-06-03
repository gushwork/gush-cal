import { NextResponse } from "next/server";
import { loadCalendarBundle } from "@/components/calendar-admin/load-calendar-bundle";
import {
  jsonError,
  requireSchedulerId,
} from "@/components/calendar-admin/require-scheduler";
import { confirmBooking } from "@/lib/booking/confirm-booking";
import { createAppDeps } from "@/lib/deps";
import type { ConfirmBookingBody } from "@/lib/types";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;
  const bundle = await loadCalendarBundle(id, auth.schedulerId);
  if (!bundle) {
    return jsonError("Calendar not found", 404);
  }

  let body: ConfirmBookingBody;
  try {
    body = (await request.json()) as ConfirmBookingBody;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!bundle.durations.includes(body.durationMinutes)) {
    return jsonError("Duration not allowed for this calendar", 400);
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
    return jsonError("Failed to create calendar event", 502);
  }

  return NextResponse.json({ meeting: result.meeting }, { status: 201 });
}
