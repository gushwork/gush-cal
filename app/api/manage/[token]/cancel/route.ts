import { NextResponse } from "next/server";
import { cancelMeetingByToken } from "@/lib/booking/cancel-meeting-by-token";
import { createAppDeps } from "@/lib/deps";

type RouteParams = { params: Promise<{ token: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const { token } = await params;
  const deps = createAppDeps();
  const result = await cancelMeetingByToken(deps, { token });

  if (!result.ok) {
    if (result.code === "INVALID_TOKEN") {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
    }
    if (result.code === "NOT_FOUND") {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }
    if (result.code === "CANCELLED") {
      return NextResponse.json({ error: "Already cancelled" }, { status: 410 });
    }
    if (result.code === "PAST") {
      return NextResponse.json({ error: "Meeting has passed" }, { status: 410 });
    }
    return NextResponse.json(
      { error: result.message ?? "Could not cancel calendar event" },
      { status: 502 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
