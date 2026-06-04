import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { loadCalendarBundle } from "@/components/calendar-admin/load-calendar-bundle";
import {
  jsonError,
  requireSchedulerId,
} from "@/components/calendar-admin/require-scheduler";
import { validateDurations } from "@/components/calendar-admin/validation";
import { clearSlotsCacheForCalendar } from "@/lib/booking/slots-cache";
import { validateMinNoticeHours } from "@/lib/calendar/validate-min-notice-hours";
import { getDb } from "@/lib/db/client";
import { toCalendar } from "@/lib/db/mappers";
import {
  generateCalendarSlug,
  normalizeCalendarSlug,
  validateCalendarSlug,
} from "@/lib/db/slug";
import { calendars } from "@/lib/db/schema";
import type { UpdateCalendarBody } from "@/lib/types/api";
import {
  validateTimezone,
  validateWorkingHours,
} from "@/lib/working-hours/validate";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;
  const bundle = await loadCalendarBundle(id, auth.schedulerId);
  if (!bundle) {
    return jsonError("Calendar not found", 404);
  }

  return NextResponse.json({ calendar: bundle });
}

async function resolveSlugUpdate(
  calendarId: string,
  schedulerId: string,
  body: UpdateCalendarBody,
): Promise<
  | { ok: true; slug?: string }
  | { ok: false; response: NextResponse }
> {
  const hasSlug = body.slug !== undefined;
  const hasRandomize = body.randomizeSlug === true;

  if (!hasSlug && !hasRandomize) {
    return { ok: true };
  }

  if (hasSlug && hasRandomize) {
    return {
      ok: false,
      response: jsonError("Provide slug or randomizeSlug, not both", 400),
    };
  }

  const db = getDb();
  const [current] = await db
    .select({ id: calendars.id, slug: calendars.slug })
    .from(calendars)
    .where(
      and(
        eq(calendars.id, calendarId),
        eq(calendars.schedulerId, schedulerId),
      ),
    )
    .limit(1);

  if (!current) {
    return { ok: false, response: jsonError("Calendar not found", 404) };
  }

  let nextSlug: string;

  if (hasRandomize) {
    nextSlug = generateCalendarSlug();
  } else {
    nextSlug = normalizeCalendarSlug(body.slug!);
    const slugError = validateCalendarSlug(nextSlug);
    if (slugError) {
      return { ok: false, response: jsonError(slugError, 400) };
    }
  }

  if (nextSlug === current.slug) {
    return { ok: true };
  }

  const [conflict] = await db
    .select({ id: calendars.id })
    .from(calendars)
    .where(and(eq(calendars.slug, nextSlug), ne(calendars.id, calendarId)))
    .limit(1);

  if (conflict) {
    return {
      ok: false,
      response: jsonError("Slug already in use", 409),
    };
  }

  return { ok: true, slug: nextSlug };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;
  let body: UpdateCalendarBody;
  try {
    body = (await request.json()) as UpdateCalendarBody;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (body.durations) {
    const durationError = validateDurations(body.durations);
    if (durationError) {
      return jsonError(durationError, 400);
    }
  }

  if (body.timezone !== undefined) {
    const timezoneError = validateTimezone(body.timezone);
    if (timezoneError) {
      return jsonError(timezoneError, 400);
    }
  }

  if (body.defaultWorkingHours !== undefined) {
    const hoursError = validateWorkingHours(body.defaultWorkingHours);
    if (hoursError) {
      return jsonError(hoursError, 400);
    }
  }

  if (body.minNoticeHours !== undefined) {
    const noticeError = validateMinNoticeHours(body.minNoticeHours);
    if (noticeError) {
      return jsonError(noticeError, 400);
    }
  }

  const slugResult = await resolveSlugUpdate(id, auth.schedulerId, body);
  if (!slugResult.ok) {
    return slugResult.response;
  }

  const [row] = await getDb()
    .update(calendars)
    .set({
      ...(body.name != null ? { name: body.name } : {}),
      ...(body.bookingWindowDays != null
        ? { bookingWindowDays: body.bookingWindowDays }
        : {}),
      ...(body.minNoticeHours != null
        ? { minNoticeHours: body.minNoticeHours }
        : {}),
      ...(body.defaultMaxPerDay != null
        ? { defaultMaxPerDay: body.defaultMaxPerDay }
        : {}),
      ...(body.defaultMaxPerWeek != null
        ? { defaultMaxPerWeek: body.defaultMaxPerWeek }
        : {}),
      ...(body.defaultWorkingHours != null
        ? { defaultWorkingHours: body.defaultWorkingHours }
        : {}),
      ...(body.timezone != null ? { timezone: body.timezone } : {}),
      ...(body.durations != null ? { durations: body.durations } : {}),
      ...(slugResult.slug != null ? { slug: slugResult.slug } : {}),
    })
    .where(
      and(eq(calendars.id, id), eq(calendars.schedulerId, auth.schedulerId)),
    )
    .returning();

  if (!row) {
    return jsonError("Calendar not found", 404);
  }

  if (body.minNoticeHours != null) {
    clearSlotsCacheForCalendar(id);
  }

  return NextResponse.json({ calendar: toCalendar(row) });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;

  const deleted = await getDb()
    .delete(calendars)
    .where(
      and(eq(calendars.id, id), eq(calendars.schedulerId, auth.schedulerId)),
    )
    .returning({ id: calendars.id });

  if (deleted.length === 0) {
    return jsonError("Calendar not found", 404);
  }

  return new NextResponse(null, { status: 204 });
}
