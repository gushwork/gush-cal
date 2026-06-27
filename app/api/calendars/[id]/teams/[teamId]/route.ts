import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  jsonError,
  requireSchedulerId,
} from "@/components/calendar-admin/require-scheduler";
import { getDb } from "@/lib/db/client";
import { calendars } from "@/lib/db/schema";
import { deleteTeam, getTeam, updateTeam } from "@/lib/teams/teams";
import type { UpdateTeamInput } from "@/lib/teams/teams";

type RouteParams = { params: Promise<{ id: string; teamId: string }> };

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

function teamErrorResponse(code: string) {
  switch (code) {
    case "NOT_FOUND":
      return jsonError("Team not found", 404);
    case "INVALID_SLUG":
      return jsonError("Invalid team slug", 400);
    case "SLUG_TAKEN":
      return jsonError("Team slug already exists", 409);
    case "DEFAULT_TEAM":
      return jsonError("Cannot delete the calendar default team", 409);
    default:
      return jsonError("Team operation failed", 400);
  }
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id: calendarId, teamId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  const team = await getTeam(calendarId, teamId);
  if (!team) {
    return jsonError("Team not found", 404);
  }

  return NextResponse.json({ team });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id: calendarId, teamId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  let body: UpdateTeamInput;
  try {
    body = (await request.json()) as UpdateTeamInput;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const result = await updateTeam(calendarId, teamId, body);
  if (!result.ok) {
    return teamErrorResponse(result.code);
  }

  return NextResponse.json({ team: result.team });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id: calendarId, teamId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  const result = await deleteTeam(calendarId, teamId);
  if (!result.ok) {
    return teamErrorResponse(result.code);
  }

  return new NextResponse(null, { status: 204 });
}
