import { NextResponse } from "next/server";
import { confirmBooking } from "@/lib/booking/confirm-booking";
import { loadCalendarBundleBySlug } from "@/lib/booking/load-calendar-by-slug";
import { toPublicMeeting } from "@/lib/booking/to-public-meeting";
import { createAppDeps } from "@/lib/deps";
import type { ConfirmBookingBody } from "@/lib/types";

type RouteParams = { params: Promise<{ slug: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { slug } = await params;
  const bundle = await loadCalendarBundleBySlug(slug);

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
    bookedBy: "guest",
  });

  if (!result.ok) {
    if (result.code === "SLOT_UNAVAILABLE") {
      return NextResponse.json({ error: "SLOT_UNAVAILABLE" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Failed to create calendar event" },
      { status: 502 },
    );
  }

  return NextResponse.json(
    { meeting: toPublicMeeting(result.meeting) },
    { status: 201 },
  );
}
