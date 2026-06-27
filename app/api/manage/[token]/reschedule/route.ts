import { NextResponse } from "next/server";
import { MIN_NOTICE_VIOLATION } from "@/lib/booking/confirm-booking";
import {
  rescheduleMeeting,
  validateManageToken,
} from "@/lib/booking/reschedule-meeting";
import { toPublicMeeting } from "@/lib/booking/to-public-meeting";
import { createAppDeps } from "@/lib/deps";

type RouteParams = { params: Promise<{ token: string }> };

type RescheduleBody = {
  startsAt: string;
  durationMinutes: number;
  viewerTimezone: string;
};

function tokenErrorResponse(code: "INVALID" | "EXPIRED" | "REVOKED" | "NOT_FOUND") {
  if (code === "NOT_FOUND") {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }
  return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
}

export async function POST(request: Request, { params }: RouteParams) {
  const { token } = await params;
  const deps = createAppDeps();

  const validation = await validateManageToken(deps, token);
  if (!validation.ok) {
    return tokenErrorResponse(validation.code);
  }

  let body: RescheduleBody;
  try {
    body = (await request.json()) as RescheduleBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { bundle } = validation.ctx;
  if (!bundle.durations.includes(body.durationMinutes)) {
    return NextResponse.json(
      { error: "Duration not allowed for this calendar" },
      { status: 400 },
    );
  }

  const result = await rescheduleMeeting(deps, {
    meetingId: validation.ctx.meeting.id,
    startsAt: body.startsAt,
    durationMinutes: body.durationMinutes,
    viewerTimezone: body.viewerTimezone,
  });

  if (!result.ok) {
    if (result.code === "SLOT_UNAVAILABLE") {
      return NextResponse.json({ error: "SLOT_UNAVAILABLE" }, { status: 409 });
    }
    if (result.code === MIN_NOTICE_VIOLATION) {
      return NextResponse.json(
        {
          error: MIN_NOTICE_VIOLATION,
          message:
            "This time is too soon. Choose a slot at least the minimum notice hours from now.",
        },
        { status: 400 },
      );
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
    meeting: toPublicMeeting(result.meeting),
    manageUrl: result.manageUrl,
  });
}
