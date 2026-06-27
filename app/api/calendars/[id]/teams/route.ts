import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  jsonError,
  requireSchedulerId,
} from "@/components/calendar-admin/require-scheduler";
import { getDb } from "@/lib/db/client";
import { calendars } from "@/lib/db/schema";
import { createTeam, listTeams } from "@/lib/teams/teams";
import type { CreateTeamInput } from "@/lib/teams/teams";

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

function teamErrorResponse(code: string) {
  switch (code) {
    case "INVALID_SLUG":
      return jsonError("Invalid team slug", 400);
    case "INVALID_MEMBERS":
      return jsonError("One or more members are invalid for this calendar", 400);
    case "SLUG_TAKEN":
      return jsonError("Team slug already exists", 409);
    default:
      return jsonError("Team operation failed", 400);
  }
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

  const teams = await listTeams(calendarId);
  return NextResponse.json({ teams });
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id: calendarId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  let body: CreateTeamInput;
  try {
    body = (await request.json()) as CreateTeamInput;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body.name?.trim()) {
    return jsonError("Team name is required", 400);
  }
  if (!body.slug?.trim()) {
    return jsonError("Team slug is required", 400);
  }

  const result = await createTeam(calendarId, body);
  if (!result.ok) {
    return teamErrorResponse(result.code);
  }

  return NextResponse.json({ team: result.team }, { status: 201 });
}
