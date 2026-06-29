import { NextResponse } from "next/server";
import {
  jsonError,
  requireSchedulerId,
} from "@/components/calendar-admin/require-scheduler";
import { getOwnedCalendar } from "@/lib/calendar/get-owned-calendar";
import {
  disconnectSalesforce,
  getConnectionStatus,
} from "@/lib/salesforce/connections";

type RouteParams = { params: Promise<{ id: string }> };

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

  const status = await getConnectionStatus(calendarId);
  return NextResponse.json(status);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id: calendarId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  const disconnected = await disconnectSalesforce(calendarId);
  if (!disconnected) {
    return jsonError("No Salesforce connection", 404);
  }

  return new NextResponse(null, { status: 204 });
}
