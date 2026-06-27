import { NextResponse } from "next/server";
import {
  jsonError,
  requireSchedulerId,
} from "@/components/calendar-admin/require-scheduler";
import { reassignMeeting } from "@/lib/booking/reassign-meeting";
import { createAppDeps } from "@/lib/deps";

type RouteParams = { params: Promise<{ id: string }> };

type ReassignBody = {
  memberId?: string;
};

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  let body: ReassignBody;
  try {
    body = (await request.json()) as ReassignBody;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body.memberId) {
    return jsonError("memberId is required", 400);
  }

  const { id } = await params;
  const deps = createAppDeps();
  const result = await reassignMeeting(deps, {
    meetingId: id,
    schedulerId: auth.schedulerId,
    newMemberId: body.memberId,
  });

  if (!result.ok) {
    if (result.code === "MEMBER_INELIGIBLE") {
      return jsonError("MEMBER_INELIGIBLE", 409);
    }
    if (result.code === "CANCELLED" || result.code === "PAST") {
      return jsonError(result.code, 410);
    }
    if (result.code === "GOOGLE_ERROR") {
      return jsonError(
        result.message ?? "Could not update calendar event",
        502,
      );
    }
    return jsonError("Meeting not found", 404);
  }

  return NextResponse.json({ meeting: result.meeting });
}
