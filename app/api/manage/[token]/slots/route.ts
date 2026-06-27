import { NextResponse } from "next/server";
import { parseSlotsQuery } from "@/lib/booking/parse-slots-query";
import { createAppDeps } from "@/lib/deps";
import { validateManageToken } from "@/lib/booking/reschedule-meeting";

type RouteParams = { params: Promise<{ token: string }> };

function tokenErrorResponse(code: "INVALID" | "EXPIRED" | "REVOKED" | "NOT_FOUND") {
  if (code === "NOT_FOUND") {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }
  return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
}

export async function GET(request: Request, { params }: RouteParams) {
  const { token } = await params;
  const deps = createAppDeps();
  const result = await validateManageToken(deps, token);

  if (!result.ok) {
    return tokenErrorResponse(result.code);
  }

  const { meeting, bundle } = result.ctx;

  if (meeting.cancelledAt) {
    return NextResponse.json({ error: "Meeting cancelled" }, { status: 410 });
  }

  const parsed = parseSlotsQuery(
    new URL(request.url).searchParams,
    bundle.durations,
  );
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const slots = await deps.slots.getAvailableSlots({
    bundle,
    durationMinutes: parsed.params.durationMinutes,
    rangeStart: parsed.params.rangeStart,
    rangeEnd: parsed.params.rangeEnd,
    viewerTimezone: parsed.params.viewerTimezone,
    bookingPolicy: "guest",
    teamId: meeting.teamId ?? undefined,
    memberId: meeting.assignedMemberId,
  });

  return NextResponse.json({ slots });
}
