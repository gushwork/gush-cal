import { NextResponse } from "next/server";
import { loadCalendarBundle } from "@/components/calendar-admin/load-calendar-bundle";
import {
  jsonError,
  requireSchedulerId,
} from "@/components/calendar-admin/require-scheduler";
import { listMeetingsForCalendar } from "@/lib/booking/list-meetings";
import type { UtcInstant } from "@/lib/types";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;
  const searchParams = new URL(request.url).searchParams;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  if (from && Number.isNaN(Date.parse(from))) {
    return jsonError("Invalid from date", 400);
  }
  if (to && Number.isNaN(Date.parse(to))) {
    return jsonError("Invalid to date", 400);
  }

  const meetings = await listMeetingsForCalendar(
    id,
    auth.schedulerId,
    from as UtcInstant | undefined,
    to as UtcInstant | undefined,
  );

  if (!meetings) {
    return jsonError("Calendar not found", 404);
  }

  return NextResponse.json({ meetings });
}
