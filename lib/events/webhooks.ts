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
};

type WebhookEndpointRow = typeof webhookEndpointsTable.$inferSelect;

export type CreateWebhookInput = {
  url: string;
  enabledEvents: AppEventType[];
};

export type UpdateWebhookInput = {
  url?: string;
  enabledEvents?: AppEventType[];
};

function generateWebhookSecret(): string {
  return randomBytes(32).toString("base64url");
}

function toWebhookEndpoint(row: WebhookEndpointRow): WebhookEndpoint {
  return {
    id: row.id,
    calendarId: row.calendarId,
    url: row.url,
    enabledEvents: row.enabledEvents as AppEventType[],
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
