import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { MIN_NOTICE_VIOLATION } from "@/lib/booking/confirm-booking";
import { rescheduleMeeting } from "@/lib/booking/reschedule-meeting";
import { createAppDeps } from "@/lib/deps";
import { getDb } from "@/lib/db/client";
import { loadCalendarBundleByCalendarId } from "@/lib/db/assemble-calendar-bundle";
import { meetings } from "@/lib/db/schema";
import { requireApiKeyAuth } from "@/lib/events/api-key-auth";
import type { ConfirmBookingBody } from "@/lib/types";

type RouteParams = {
  params: Promise<{ calendarId: string; meetingId: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const { calendarId, meetingId } = await params;

  const auth = await requireApiKeyAuth(request, calendarId);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bundle = await loadCalendarBundleByCalendarId(getDb(), calendarId);
  if (!bundle) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }

  const [target] = await getDb()
    .select({ calendarId: meetings.calendarId })
    .from(meetings)
    .where(eq(meetings.id, meetingId))
    .limit(1);
  if (!target || target.calendarId !== calendarId) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  let body: Pick<
    ConfirmBookingBody,
    "startsAt" | "durationMinutes" | "viewerTimezone"
  >;
  try {
    body = await request.json();
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
  const result = await rescheduleMeeting(deps, {
    meetingId,
    startsAt: body.startsAt,
    durationMinutes: body.durationMinutes,
    viewerTimezone: body.viewerTimezone,
  });

  if (!result.ok) {
    if (result.code === "SLOT_UNAVAILABLE") {
      return NextResponse.json({ error: "SLOT_UNAVAILABLE" }, { status: 409 });
    }
    if (result.code === MIN_NOTICE_VIOLATION) {
      return NextResponse.json({ error: MIN_NOTICE_VIOLATION }, { status: 400 });
    }
    if (result.code === "CANCELLED" || result.code === "PAST") {
      return NextResponse.json({ error: result.code }, { status: 410 });
    }
    if (result.code === "GOOGLE_ERROR") {
      return NextResponse.json(
        { error: result.message ?? "Failed to update calendar event" },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  return NextResponse.json({
    meeting: result.meeting,
    manageUrl: result.manageUrl,
  });
}
