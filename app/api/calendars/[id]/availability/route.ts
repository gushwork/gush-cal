import { NextResponse } from "next/server";
import { buildMemberBusyBlocks } from "@/components/availability-grid/build-member-busy-blocks";
import { loadCalendarBundle } from "@/components/calendar-admin/load-calendar-bundle";
import {
  jsonError,
  requireSchedulerId,
} from "@/components/calendar-admin/require-scheduler";
import { createAppDeps } from "@/lib/deps";
import {
  globalCalendarConfigMessage,
  isGlobalCalendarConfigError,
} from "@/lib/google/calendar-access-message";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const fromMs = from ? Date.parse(from) : NaN;
  const toMs = to ? Date.parse(to) : NaN;
  if (!from || !to || Number.isNaN(fromMs) || Number.isNaN(toMs) || fromMs >= toMs) {
    return jsonError("Invalid from or to query parameter", 400);
  }

  const bundle = await loadCalendarBundle(id, auth.schedulerId);
  if (!bundle) {
    return jsonError("Calendar not found", 404);
  }

  const deps = createAppDeps();
  const freeBusy = await deps.google.queryFreeBusy({
    memberEmails: bundle.members.map((member) => member.email),
    timeMin: from,
    timeMax: to,
  });

  const members = buildMemberBusyBlocks(bundle.members, freeBusy);
  const errorCodes = members
    .filter((member) => member.status === "inaccessible")
    .map((member) => member.errorCode);
  const warning =
    isGlobalCalendarConfigError(errorCodes) && errorCodes[0]
      ? globalCalendarConfigMessage(errorCodes[0])
      : undefined;

  return NextResponse.json({ members, warning });
}
