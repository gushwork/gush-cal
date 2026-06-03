import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  jsonError,
  requireSchedulerId,
} from "@/components/calendar-admin/require-scheduler";
import {
  DEFAULT_WORKING_HOURS,
  validateDurations,
} from "@/components/calendar-admin/validation";
import {
  validateTimezone,
  validateWorkingHours,
} from "@/lib/working-hours/validate";
import { getDb } from "@/lib/db/client";
import { toCalendar } from "@/lib/db/mappers";
import { generateCalendarSlug } from "@/lib/db/slug";
import { calendars } from "@/lib/db/schema";
import type { CreateCalendarBody } from "@/lib/types/api";

export async function GET() {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const rows = await getDb()
    .select()
    .from(calendars)
    .where(eq(calendars.schedulerId, auth.schedulerId))
    .orderBy(desc(calendars.createdAt));

  return NextResponse.json({ calendars: rows.map(toCalendar) });
}

export async function POST(request: Request) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  let body: CreateCalendarBody;
  try {
    body = (await request.json()) as CreateCalendarBody;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const durationError = validateDurations(body.durations ?? []);
  if (durationError) {
    return jsonError(durationError, 400);
  }

  const timezoneError = validateTimezone(body.timezone ?? "");
  if (timezoneError) {
    return jsonError(timezoneError, 400);
  }

  const defaultWorkingHours =
    body.defaultWorkingHours ?? DEFAULT_WORKING_HOURS;
  const hoursError = validateWorkingHours(defaultWorkingHours);
  if (hoursError) {
    return jsonError(hoursError, 400);
  }

  const [row] = await getDb()
    .insert(calendars)
    .values({
      schedulerId: auth.schedulerId,
      name: body.name,
      slug: generateCalendarSlug(),
      bookingWindowDays: body.bookingWindowDays,
      minNoticeHours: 0,
      defaultMaxPerDay: body.defaultMaxPerDay,
      defaultMaxPerWeek: body.defaultMaxPerWeek,
      defaultWorkingHours,
      timezone: body.timezone,
      durations: body.durations,
    })
    .returning();

  return NextResponse.json({ calendar: toCalendar(row!) }, { status: 201 });
}
