import { NextResponse } from "next/server";
import { createAppDeps } from "@/lib/deps";
import { validateManageToken } from "@/lib/booking/reschedule-meeting";
import { toPublicMeeting } from "@/lib/booking/to-public-meeting";

type RouteParams = { params: Promise<{ token: string }> };

function tokenErrorResponse(code: "INVALID" | "EXPIRED" | "REVOKED" | "NOT_FOUND") {
  if (code === "NOT_FOUND") {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }
  return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { token } = await params;
  const deps = createAppDeps();
  const result = await validateManageToken(deps, token);

  if (!result.ok) {
    return tokenErrorResponse(result.code);
  }

  const { meeting, bundle } = result.ctx;
  const member = bundle.members.find((m) => m.id === meeting.assignedMemberId);

  return NextResponse.json({
    meeting: {
      ...toPublicMeeting(meeting),
      memberName: member?.displayName ?? member?.email ?? "Member",
      cancelled: meeting.cancelledAt != null,
    },
    calendar: {
      name: bundle.name,
      durations: bundle.durations,
      bookingWindowDays: bundle.bookingWindowDays,
      minNoticeHours: bundle.minNoticeHours,
    },
  });
}
