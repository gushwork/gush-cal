import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  jsonError,
  requireSchedulerId,
} from "@/components/calendar-admin/require-scheduler";
import { getDb } from "@/lib/db/client";
import { calendars } from "@/lib/db/schema";
import { getTeam, getTeamMemberIds, replaceTeamMembers } from "@/lib/teams/teams";

type RouteParams = { params: Promise<{ id: string; teamId: string }> };

type ReplaceTeamMembersBody = { memberIds: string[] };

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

  const { id: calendarId, teamId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  const team = await getTeam(calendarId, teamId);
  if (!team) {
    return jsonError("Team not found", 404);
  }

  const memberIds = await getTeamMemberIds(teamId);
  return NextResponse.json({ memberIds });
}

export async function PUT(request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id: calendarId, teamId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  let body: ReplaceTeamMembersBody;
  try {
    body = (await request.json()) as ReplaceTeamMembersBody;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!Array.isArray(body.memberIds)) {
    return jsonError("memberIds must be an array", 400);
  }

  const result = await replaceTeamMembers(calendarId, teamId, body.memberIds);
  if (!result.ok) {
    if (result.code === "NOT_FOUND") {
      return jsonError("Team not found", 404);
    }
    return jsonError("One or more members are invalid for this calendar", 400);
  }

  return NextResponse.json({ memberIds: result.memberIds });
}
