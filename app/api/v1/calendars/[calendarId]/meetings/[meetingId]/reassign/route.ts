import { NextResponse } from "next/server";
import { reassignMeeting } from "@/lib/booking/reassign-meeting";
import { createAppDeps } from "@/lib/deps";
import { getDb } from "@/lib/db/client";
import { loadCalendarBundleByCalendarId } from "@/lib/db/assemble-calendar-bundle";
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

  let body: { memberId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.memberId) {
    return NextResponse.json({ error: "memberId required" }, { status: 400 });
  }

  const deps = createAppDeps();
  const result = await reassignMeeting(deps, {
    meetingId,
    schedulerId: bundle.scheduler.id,
    newMemberId: body.memberId,
  });

  if (!result.ok) {
    const status =
      result.code === "NOT_FOUND"
        ? 404
        : result.code === "GOOGLE_ERROR"
          ? 502
          : 409;
    return NextResponse.json({ error: result.code, message: result.message }, { status });
  }

  return NextResponse.json({ meeting: result.meeting });
}
