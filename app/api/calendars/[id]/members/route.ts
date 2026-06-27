import { and, eq, max } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  jsonError,
  requireSchedulerId,
} from "@/components/calendar-admin/require-scheduler";
import { validateMemberEmail } from "@/components/calendar-admin/validation";
import { getDb } from "@/lib/db/client";
import { toCalendarMember } from "@/lib/db/mappers";
import { calendarMembers, calendars } from "@/lib/db/schema";
import type { CreateMemberBody } from "@/lib/types/api";
import { validateMemberHoursAndTimezone } from "@/lib/working-hours/validate";

function validateAssignmentWeight(value: unknown): string | null {
  if (value === undefined) {
    return null;
  }
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return "Assignment weight must be an integer between 1 and 1000";
  }
  if (value < 1 || value > 1000) {
    return "Assignment weight must be an integer between 1 and 1000";
  }
  return null;
}

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id: calendarId } = await params;

  const [calendar] = await getDb()
    .select()
    .from(calendars)
    .where(
      and(
        eq(calendars.id, calendarId),
        eq(calendars.schedulerId, auth.schedulerId),
      ),
    )
    .limit(1);

  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  let body: CreateMemberBody;
  try {
    body = (await request.json()) as CreateMemberBody;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const emailError = validateMemberEmail(body.email);
  if (emailError) {
    return jsonError(emailError, 400);
  }

  const hoursTzError = validateMemberHoursAndTimezone(
    body.workingHoursOverride,
    body.timezone,
  );
  if (hoursTzError) {
    return jsonError(hoursTzError, 400);
  }

  const weightError = validateAssignmentWeight(body.assignmentWeight);
  if (weightError) {
    return jsonError(weightError, 400);
  }

  const workingHoursOverride =
    body.workingHoursOverride != null && body.workingHoursOverride.length > 0
      ? body.workingHoursOverride
      : null;
  const timezone = workingHoursOverride != null ? (body.timezone ?? null) : null;

  const [maxOrder] = await getDb()
    .select({ value: max(calendarMembers.sortOrder) })
    .from(calendarMembers)
    .where(eq(calendarMembers.calendarId, calendarId));

  const [row] = await getDb()
    .insert(calendarMembers)
    .values({
      calendarId,
      email: body.email.toLowerCase(),
      displayName: body.displayName ?? null,
      maxPerDayOverride: body.maxPerDayOverride ?? null,
      maxPerWeekOverride: body.maxPerWeekOverride ?? null,
      workingHoursOverride,
      timezone,
      assignmentWeight: body.assignmentWeight ?? 100,
      sortOrder: (maxOrder?.value ?? 0) + 1,
    })
    .returning();

  return NextResponse.json({ member: toCalendarMember(row!) }, { status: 201 });
}
