import { NextResponse } from "next/server";
import {
  jsonError,
  requireSchedulerId,
} from "@/components/calendar-admin/require-scheduler";
import { cancelMeeting } from "@/lib/booking/cancel-meeting";
import { createAppDeps } from "@/lib/deps";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;
  const deps = createAppDeps();
  const result = await cancelMeeting(deps, id, auth.schedulerId);

  if (!result.ok) {
    if (result.code === "GOOGLE_ERROR") {
      return jsonError(
        result.message ?? "Could not cancel calendar event",
        502,
      );
    }
    return jsonError("Meeting not found", 404);
  }

  return new NextResponse(null, { status: 204 });
}
