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
  signOAuthState,
  stubConnectionInput,
  verifyOAuthState,
} from "@/lib/salesforce/connections";
import { getOwnedCalendar } from "@/lib/calendar/get-owned-calendar";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * OAuth connect flow for per-Calendar Salesforce.
 * GET `?stub=1` performs an explicit dev stub connect (only mutating path).
 * GET (no code/stub) starts OAuth when configured, else 400.
 * GET with `code` + valid signed `state` completes the callback + seeds field maps.
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

  // OAuth callback: require a valid signed state (BUG-029, CSRF guard).
  if (code) {
    if (!verifyOAuthState(calendarId, url.searchParams.get("state"))) {
      return jsonError("Invalid OAuth state", 400);
    }
    try {
      const tokens = isOAuthConfigured()
        ? await exchangeOAuthCode(calendarId, code)
        : stubConnectionInput();
      await saveConnection(calendarId, tokens);
      return NextResponse.redirect(new URL(`/calendars/${calendar.slug}?sf=connected`, url.origin));
    } catch (err) {
      const message = err instanceof Error ? err.message : "OAuth failed";
      return jsonError(message, 400);
    }
  }

  // BUG-030: stub connect mutates only on explicit ?stub=1, never a bare GET.
  if (stub) {
    const status = await saveConnection(calendarId, stubConnectionInput());
    return NextResponse.json({ ...status, stub: true });
  }

  if (!isOAuthConfigured()) {
    return jsonError("Salesforce OAuth is not configured", 400);
  }

  const authorizeUrl = buildOAuthAuthorizeUrl(calendarId, signOAuthState(calendarId));
  return NextResponse.redirect(authorizeUrl);
}
