import { NextResponse } from "next/server";
import { loadCalendarBundle } from "@/components/calendar-admin/load-calendar-bundle";
import {
  jsonError,
  requireSchedulerId,
} from "@/components/calendar-admin/require-scheduler";
import { createAppDeps } from "@/lib/deps";
import { getAvailableSlotsForCalendar } from "@/lib/booking/get-slots";
import { parseSlotsQuery } from "@/lib/booking/parse-slots-query";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;
  const bundle = await loadCalendarBundle(id, auth.schedulerId);
  if (!bundle) {
    return jsonError("Calendar not found", 404);
  }

  const parsed = parseSlotsQuery(
    new URL(request.url).searchParams,
    bundle.durations,
  );
  if (!parsed.ok) {
    return jsonError(parsed.error, 400);
  }

  const deps = createAppDeps();
  const slots = await getAvailableSlotsForCalendar(
    deps,
    bundle,
    parsed.params,
    "admin",
  );

  return NextResponse.json({ slots });
}
