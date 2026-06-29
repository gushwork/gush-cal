import { randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { webhookEndpoints } from "@/lib/db/schema";
import type { webhookEndpoints as webhookEndpointsTable } from "@/lib/db/schema";
import type { AppEventType } from "@/lib/types/platform";

export type WebhookEndpoint = {
  id: string;
  calendarId: string;
  url: string;
  enabledEvents: AppEventType[];
  enabled: boolean;
};

type WebhookEndpointRow = typeof webhookEndpointsTable.$inferSelect;

export type CreateWebhookInput = {
  url: string;
  enabledEvents: AppEventType[];
};

export type UpdateWebhookInput = {
  url?: string;
  enabledEvents?: AppEventType[];
  enabled?: boolean;
};

// SSRF guard: block non-http(s) schemes and private/loopback/link-local hosts.
// Note: does not defend against DNS-rebinding (public name → private IP); for
// that, resolve + re-check at fetch time. Static host validation is the baseline.
const BLOCKED_WEBHOOK_HOSTS: RegExp[] = [
  /^localhost$/i,
  /\.localhost$/i,
  /^0\./,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./, // link-local incl. cloud metadata 169.254.169.254
  /^::1$/,
  /^::$/,
  /^fc/i,
  /^fd/i,
  /^fe80:/i,
];

export function validateWebhookUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.trim() === "") {
    return "url is required";
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "url must be a valid absolute URL";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return "url must use http or https";
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_WEBHOOK_HOSTS.some((re) => re.test(host))) {
    return "url host is not allowed (private, loopback, or link-local address)";
  }
  return null;
}

function generateWebhookSecret(): string {
  return randomBytes(32).toString("base64url");
}

function toWebhookEndpoint(row: WebhookEndpointRow): WebhookEndpoint {
  return {
    id: row.id,
    calendarId: row.calendarId,
    url: row.url,
    enabledEvents: row.enabledEvents as AppEventType[],
    enabled: row.enabled,
  };
}

export async function listWebhookEndpoints(
  calendarId: string,
): Promise<WebhookEndpoint[]> {
  const rows = await getDb()
    .select()
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.calendarId, calendarId));

  return rows.map(toWebhookEndpoint);
}

export async function createWebhookEndpoint(
  calendarId: string,
  input: CreateWebhookInput,
): Promise<WebhookEndpoint & { secret: string }> {
  const secret = generateWebhookSecret();
  const [row] = await getDb()
    .insert(webhookEndpoints)
    .values({
      calendarId,
      url: input.url,
      secret,
      enabledEvents: input.enabledEvents,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create webhook endpoint");
  }

  return { ...toWebhookEndpoint(row), secret };
}

export async function updateWebhookEndpoint(
  calendarId: string,
  endpointId: string,
  input: UpdateWebhookInput,
): Promise<WebhookEndpoint | null> {
  const [row] = await getDb()
    .update(webhookEndpoints)
    .set({
      ...(input.url != null ? { url: input.url } : {}),
      ...(input.enabledEvents != null ? { enabledEvents: input.enabledEvents } : {}),
      ...(input.enabled != null ? { enabled: input.enabled } : {}),
    })
    .where(
      and(
        eq(webhookEndpoints.id, endpointId),
        eq(webhookEndpoints.calendarId, calendarId),
      ),
    )
    .returning();

  return row ? toWebhookEndpoint(row) : null;
}

export async function deleteWebhookEndpoint(
  calendarId: string,
  endpointId: string,
): Promise<boolean> {
  const deleted = await getDb()
    .delete(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.id, endpointId),
        eq(webhookEndpoints.calendarId, calendarId),
      ),
    )
    .returning({ id: webhookEndpoints.id });

  return deleted.length > 0;
}
