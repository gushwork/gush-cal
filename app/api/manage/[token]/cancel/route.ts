import { NextResponse } from "next/server";
import { cancelMeetingByToken } from "@/lib/booking/cancel-meeting-by-token";
import { createAppDeps } from "@/lib/deps";

type RouteParams = { params: Promise<{ token: string }> };

/** Body is optional: `{ "reason": "..." }` records why the guest cancelled. */
export async function POST(request: Request, { params }: RouteParams) {
  const { token } = await params;
  let reason: string | null = null;
  const raw = await request.text();
  if (raw.trim()) {
    try {
      const body = JSON.parse(raw) as { reason?: unknown };
      reason = typeof body.reason === "string" ? body.reason : null;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
  }

  const deps = createAppDeps();
  const result = await cancelMeetingByToken(deps, { token, reason });

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
