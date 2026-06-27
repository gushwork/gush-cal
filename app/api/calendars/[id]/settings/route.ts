import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  jsonError,
  requireSchedulerId,
} from "@/components/calendar-admin/require-scheduler";
import { getDb } from "@/lib/db/client";
import { calendarSettings, calendars } from "@/lib/db/schema";
import {
  clientCalendarSettings,
  mergeCalendarSettings,
  normalizeCalendarSettings,
} from "@/lib/scheduling/normalize-settings";
import type { CalendarSettings } from "@/lib/types/platform";
import { defaultCalendarSettings } from "@/lib/types/platform";

type RouteParams = { params: Promise<{ id: string }> };

async function getOwnedCalendar(calendarId: string, schedulerId: string) {
  const [calendar] = await getDb()
    .select()
    .from(calendars)
    .where(
      and(
        eq(calendars.id, calendarId),
        eq(calendars.schedulerId, schedulerId),
      ),
    )
    .limit(1);
  return calendar ?? null;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id: calendarId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  const [row] = await getDb()
    .select()
    .from(calendarSettings)
    .where(eq(calendarSettings.calendarId, calendarId))
    .limit(1);

  const settings = normalizeCalendarSettings(
    row?.settings ?? defaultCalendarSettings(),
  );

  return NextResponse.json({
    settings: clientCalendarSettings(settings),
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id: calendarId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  let body: Partial<CalendarSettings>;
  try {
    body = (await request.json()) as Partial<CalendarSettings>;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const [existing] = await getDb()
    .select()
    .from(calendarSettings)
    .where(eq(calendarSettings.calendarId, calendarId))
    .limit(1);

  const current = normalizeCalendarSettings(
    existing?.settings ?? defaultCalendarSettings(),
  );
  const merged = mergeCalendarSettings(current, body);

  await getDb()
    .insert(calendarSettings)
    .values({ calendarId, settings: merged })
    .onConflictDoUpdate({
      target: calendarSettings.calendarId,
      set: { settings: merged },
    });

  return NextResponse.json({ settings: clientCalendarSettings(merged) });
}
