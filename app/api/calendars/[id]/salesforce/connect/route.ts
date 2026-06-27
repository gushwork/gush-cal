import { NextResponse } from "next/server";
import {
  jsonError,
  requireSchedulerId,
} from "@/components/calendar-admin/require-scheduler";
import {
  buildOAuthAuthorizeUrl,
  exchangeOAuthCode,
  isOAuthConfigured,
  saveConnection,
  stubConnectionInput,
} from "@/lib/salesforce/connections";
import { getOwnedCalendar } from "../route";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * OAuth connect flow for per-Calendar Salesforce.
 * GET without `code` starts OAuth (or stub connect when env is missing).
 * GET with `code` + `state` completes OAuth callback and seeds default field maps.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id: calendarId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stub = url.searchParams.get("stub") === "1";

  if (code) {
    try {
      const tokens = isOAuthConfigured()
        ? await exchangeOAuthCode(calendarId, code)
        : stubConnectionInput();
      const status = await saveConnection(calendarId, tokens);
      return NextResponse.redirect(new URL(`/calendars/${calendar.slug}?sf=connected`, url.origin));
    } catch (err) {
      const message = err instanceof Error ? err.message : "OAuth failed";
      return jsonError(message, 400);
    }
  }

  if (stub || !isOAuthConfigured()) {
    const status = await saveConnection(calendarId, stubConnectionInput());
    return NextResponse.json({ ...status, stub: true });
  }

  const state = crypto.randomUUID();
  const authorizeUrl = buildOAuthAuthorizeUrl(calendarId, state);
  return NextResponse.redirect(authorizeUrl);
}
