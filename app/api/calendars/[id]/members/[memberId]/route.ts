import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  jsonError,
  requireSchedulerId,
} from "@/components/calendar-admin/require-scheduler";
import {
  validateAssignmentWeight,
  validateCapOverride,
  validateMemberEmail,
} from "@/components/calendar-admin/validation";
import { getDb } from "@/lib/db/client";
import { toCalendarMember } from "@/lib/db/mappers";
import { calendarMembers, calendars } from "@/lib/db/schema";
import type { UpdateMemberBody } from "@/lib/types/api";
import { validateMemberHoursAndTimezone } from "@/lib/working-hours/validate";

type RouteParams = { params: Promise<{ id: string; memberId: string }> };

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

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id: calendarId, memberId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  let body: UpdateMemberBody;
  try {
    body = (await request.json()) as UpdateMemberBody;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (body.email !== undefined) {
    const emailError = validateMemberEmail(body.email);
    if (emailError) {
      return jsonError(emailError, 400);
    }
  }

  const weightError = validateAssignmentWeight(body.assignmentWeight);
  if (weightError) {
    return jsonError(weightError, 400);
  }

  const dayCapError = validateCapOverride(body.maxPerDayOverride, "Max per day");
  if (dayCapError) {
    return jsonError(dayCapError, 400);
  }

  const weekCapError = validateCapOverride(
    body.maxPerWeekOverride,
    "Max per week",
  );
  if (weekCapError) {
    return jsonError(weekCapError, 400);
  }

  const hoursOrTzTouched =
    body.workingHoursOverride !== undefined || body.timezone !== undefined;

  let workingHoursOverride: typeof body.workingHoursOverride | null = null;
  let timezone: typeof body.timezone | null = null;

  if (hoursOrTzTouched) {
    const [existing] = await getDb()
      .select()
      .from(calendarMembers)
      .where(
        and(
          eq(calendarMembers.id, memberId),
          eq(calendarMembers.calendarId, calendarId),
        ),
      )
      .limit(1);

    if (!existing) {
      return jsonError("Member not found", 404);
    }

    let resolvedOverride =
      body.workingHoursOverride !== undefined
        ? (body.workingHoursOverride ?? null)
        : existing.workingHoursOverride;
    let resolvedTimezone =
      body.timezone !== undefined ? (body.timezone ?? null) : existing.timezone;

    if (
      body.workingHoursOverride !== undefined &&
      (body.workingHoursOverride == null || body.workingHoursOverride.length === 0)
    ) {
      resolvedOverride = null;
      resolvedTimezone = null;
    }

    const hoursTzError = validateMemberHoursAndTimezone(
      resolvedOverride,
      resolvedTimezone,
    );
    if (hoursTzError) {
      return jsonError(hoursTzError, 400);
    }

    const hasOverride =
      resolvedOverride != null && resolvedOverride.length > 0;
    if (!hasOverride) {
      resolvedOverride = null;
      resolvedTimezone = null;
    }

    workingHoursOverride = resolvedOverride;
    timezone = resolvedTimezone;
  }

  const [row] = await getDb()
    .update(calendarMembers)
    .set({
      ...(body.email != null ? { email: body.email.toLowerCase() } : {}),
      ...(body.displayName !== undefined
        ? { displayName: body.displayName ?? null }
        : {}),
      ...(body.maxPerDayOverride !== undefined
        ? { maxPerDayOverride: body.maxPerDayOverride ?? null }
        : {}),
      ...(body.maxPerWeekOverride !== undefined
        ? { maxPerWeekOverride: body.maxPerWeekOverride ?? null }
        : {}),
      ...(body.assignmentWeight !== undefined
        ? { assignmentWeight: body.assignmentWeight }
        : {}),
      ...(hoursOrTzTouched
        ? { workingHoursOverride, timezone }
        : {}),
    })
    .where(
      and(
        eq(calendarMembers.id, memberId),
        eq(calendarMembers.calendarId, calendarId),
      ),
    )
    .returning();

  if (!row) {
    return jsonError("Member not found", 404);
  }

  return NextResponse.json({ member: toCalendarMember(row) });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id: calendarId, memberId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  const deleted = await getDb()
    .delete(calendarMembers)
    .where(
      and(
        eq(calendarMembers.id, memberId),
        eq(calendarMembers.calendarId, calendarId),
      ),
    )
    .returning({ id: calendarMembers.id });

  if (deleted.length === 0) {
    return jsonError("Member not found", 404);
  }

  return new NextResponse(null, { status: 204 });
}
