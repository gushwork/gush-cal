import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  jsonError,
  requireSchedulerId,
} from "@/components/calendar-admin/require-scheduler";
import { getDb } from "@/lib/db/client";
import { calendars } from "@/lib/db/schema";
import {
  deleteWebhookEndpoint,
  updateWebhookEndpoint,
  validateWebhookUrl,
  type UpdateWebhookInput,
} from "@/lib/events/webhooks";
import type { AppEventType } from "@/lib/types/platform";

type RouteParams = { params: Promise<{ id: string; endpointId: string }> };

const ALL_EVENT_TYPES = new Set<AppEventType>([
  "meeting.booked",
  "meeting.cancelled",
  "meeting.rescheduled",
  "meeting.reassigned",
  "meeting.before",
  "meeting.after",
  "salesforce.sync_succeeded",
  "salesforce.sync_failed",
  "booking.duplicate_blocked",
  "routing.owner_overflow",
]);

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

function validateEnabledEvents(events: unknown): AppEventType[] | null {
  if (!Array.isArray(events) || events.length === 0) {
    return null;
  }
  for (const event of events) {
    if (typeof event !== "string" || !ALL_EVENT_TYPES.has(event as AppEventType)) {
      return null;
    }
  }
  return events as AppEventType[];
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id: calendarId, endpointId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  let body: UpdateWebhookInput;
  try {
    body = (await request.json()) as UpdateWebhookInput;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (body.enabledEvents != null && !validateEnabledEvents(body.enabledEvents)) {
    return jsonError("enabledEvents must be a non-empty array of event types", 400);
  }

  if (body.url != null) {
    const urlError = validateWebhookUrl(body.url);
    if (urlError) {
      return jsonError(urlError, 400);
    }
  }

  if (body.enabled != null && typeof body.enabled !== "boolean") {
    return jsonError("enabled must be a boolean", 400);
  }

  const endpoint = await updateWebhookEndpoint(calendarId, endpointId, {
    url: body.url,
    enabledEvents: body.enabledEvents,
    enabled: body.enabled,
  });
  if (!endpoint) {
    return jsonError("Webhook endpoint not found", 404);
  }

  return NextResponse.json({ endpoint });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireSchedulerId();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id: calendarId, endpointId } = await params;
  const calendar = await getOwnedCalendar(calendarId, auth.schedulerId);
  if (!calendar) {
    return jsonError("Calendar not found", 404);
  }

  const deleted = await deleteWebhookEndpoint(calendarId, endpointId);
  if (!deleted) {
    return jsonError("Webhook endpoint not found", 404);
  }

  return new NextResponse(null, { status: 204 });
}
