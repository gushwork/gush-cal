import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { reassignMeeting } from "@/lib/booking/reassign-meeting";
import { createAppDeps } from "@/lib/deps";
import { getDb } from "@/lib/db/client";
import { loadCalendarBundleByCalendarId } from "@/lib/db/assemble-calendar-bundle";
import { meetings } from "@/lib/db/schema";
import { requireApiKeyAuth } from "@/lib/events/api-key-auth";

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

  let body: { memberId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }

  const deps = createAppDeps();
  const result = await reassignMeeting(deps, {
    meetingId,
    schedulerId: bundle.scheduler.id,
    newMemberId: body.memberId,
  });

  if (!result.ok) {
    if (result.code === "MEMBER_INELIGIBLE") {
      return NextResponse.json({ error: "MEMBER_INELIGIBLE" }, { status: 409 });
    }
    if (result.code === "CANCELLED" || result.code === "PAST") {
      return NextResponse.json({ error: result.code }, { status: 410 });
    }
    if (result.code === "GOOGLE_ERROR") {
      return NextResponse.json(
        { error: result.message ?? "Could not update calendar event" },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  return NextResponse.json({ meeting: result.meeting });
}
