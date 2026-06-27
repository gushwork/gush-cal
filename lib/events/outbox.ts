import { and, eq, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { eventOutbox, webhookEndpoints } from "@/lib/db/schema";
import type { EmitEventInput } from "@/lib/ports/events";
import type { AppEventType } from "@/lib/types/platform";
import { deliverWebhook } from "./deliver-webhook";

const MAX_ATTEMPTS = 10;
const DEFAULT_BATCH_SIZE = 50;

export type OutboxRow = {
  id: string;
  calendarId: string;
  eventType: string;
  payload: Record<string, unknown>;
  attempts: number;
  createdAt: string;
};

export async function insertOutboxEvent(input: EmitEventInput): Promise<void> {
  await getDb().insert(eventOutbox).values({
    calendarId: input.calendarId,
    eventType: input.eventType,
    payload: {
      ...input.payload,
      ...(input.meetingId ? { meetingId: input.meetingId } : {}),
    },
    status: "pending",
    attempts: 0,
  });
}

function backoffMinutes(attempts: number): number {
  return 2 ** attempts;
}

function buildEnvelope(row: OutboxRow) {
  const meetingId =
    typeof row.payload.meetingId === "string" ? row.payload.meetingId : undefined;

  return {
    id: row.id,
    type: row.eventType as AppEventType,
    calendarId: row.calendarId,
    ...(meetingId ? { meetingId } : {}),
    occurredAt: row.createdAt,
    data: row.payload,
  };
}

async function loadWebhookEndpoints(calendarId: string, eventType: string) {
  const rows = await getDb()
    .select({
      url: webhookEndpoints.url,
      secret: webhookEndpoints.secret,
      enabledEvents: webhookEndpoints.enabledEvents,
    })
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.calendarId, calendarId));

  return rows.filter((row) => row.enabledEvents.includes(eventType));
}

async function markDelivered(id: string): Promise<void> {
  await getDb()
    .update(eventOutbox)
    .set({ status: "delivered", nextAttemptAt: null })
    .where(eq(eventOutbox.id, id));
}

async function markFailed(id: string, attempts: number): Promise<void> {
  if (attempts >= MAX_ATTEMPTS) {
    await getDb()
      .update(eventOutbox)
      .set({ status: "failed", attempts, nextAttemptAt: null })
      .where(eq(eventOutbox.id, id));
    return;
  }

  const delayMinutes = backoffMinutes(attempts);
  const nextAttemptAt = new Date(Date.now() + delayMinutes * 60_000).toISOString();

  await getDb()
    .update(eventOutbox)
    .set({ status: "pending", attempts, nextAttemptAt })
    .where(eq(eventOutbox.id, id));
}

async function deliverOutboxRow(row: OutboxRow): Promise<boolean> {
  const endpoints = await loadWebhookEndpoints(row.calendarId, row.eventType);
  if (endpoints.length === 0) {
    return true;
  }

  const envelope = buildEnvelope(row);
  const results = await Promise.all(
    endpoints.map((endpoint) =>
      deliverWebhook(endpoint.url, endpoint.secret, envelope),
    ),
  );

  return results.every(Boolean);
}

export async function processOutboxBatch(
  batchSize = DEFAULT_BATCH_SIZE,
): Promise<number> {
  const now = new Date().toISOString();

  const rows = await getDb()
    .select({
      id: eventOutbox.id,
      calendarId: eventOutbox.calendarId,
      eventType: eventOutbox.eventType,
      payload: eventOutbox.payload,
      attempts: eventOutbox.attempts,
      createdAt: eventOutbox.createdAt,
    })
    .from(eventOutbox)
    .where(
      and(
        eq(eventOutbox.status, "pending"),
        or(
          sql`${eventOutbox.nextAttemptAt} IS NULL`,
          lte(eventOutbox.nextAttemptAt, now),
        ),
      ),
    )
    .orderBy(eventOutbox.createdAt)
    .limit(batchSize);

  let processed = 0;

  for (const row of rows) {
    const ok = await deliverOutboxRow(row);
    if (ok) {
      await markDelivered(row.id);
    } else {
      await markFailed(row.id, row.attempts + 1);
    }
    processed += 1;
  }

  return processed;
}
