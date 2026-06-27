import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { apiKeys, schedulers } from "@/lib/db/schema";
import type { apiKeys as apiKeysTable } from "@/lib/db/schema";
import { generateApiKey, hashApiKey } from "./api-key-auth";

export type ApiKeyCreator = {
  id: string;
  name: string;
  email: string;
};

export type ApiKeySummary = {
  id: string;
  calendarId: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdBy: ApiKeyCreator | null;
};

type ApiKeyRow = typeof apiKeysTable.$inferSelect;

function toApiKeySummary(
  row: ApiKeyRow,
  creator: ApiKeyCreator | null,
): ApiKeySummary {
  return {
    id: row.id,
    calendarId: row.calendarId,
    name: row.name,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt ?? null,
    revokedAt: row.revokedAt,
    createdBy: creator,
  };
}

function toCreator(
  id: string | null,
  name: string | null,
  email: string | null,
): ApiKeyCreator | null {
  if (!id || !name || !email) {
    return null;
  }
  return { id, name, email };
}

export async function listApiKeys(calendarId: string): Promise<ApiKeySummary[]> {
  const rows = await getDb()
    .select({
      key: apiKeys,
      creatorId: schedulers.id,
      creatorName: schedulers.name,
      creatorEmail: schedulers.email,
    })
    .from(apiKeys)
    .leftJoin(schedulers, eq(apiKeys.createdBy, schedulers.id))
    .where(eq(apiKeys.calendarId, calendarId));

  return rows.map(({ key, creatorId, creatorName, creatorEmail }) =>
    toApiKeySummary(
      key,
      toCreator(creatorId, creatorName, creatorEmail),
    ),
  );
}

export async function createApiKey(
  calendarId: string,
  name: string,
  createdBy: string,
): Promise<ApiKeySummary & { plaintextKey: string }> {
  const plaintextKey = generateApiKey();
  const [row] = await getDb()
    .insert(apiKeys)
    .values({
      calendarId,
      name,
      keyHash: hashApiKey(plaintextKey),
      createdBy,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create API key");
  }

  const [creator] = await getDb()
    .select({
      id: schedulers.id,
      name: schedulers.name,
      email: schedulers.email,
    })
    .from(schedulers)
    .where(eq(schedulers.id, createdBy))
    .limit(1);

  return {
    ...toApiKeySummary(
      row,
      toCreator(creator?.id ?? null, creator?.name ?? null, creator?.email ?? null),
    ),
    plaintextKey,
  };
}

export async function revokeApiKey(
  calendarId: string,
  keyId: string,
): Promise<ApiKeySummary | null> {
  const now = new Date().toISOString();
  const [row] = await getDb()
    .update(apiKeys)
    .set({ revokedAt: now })
    .where(
      and(
        eq(apiKeys.id, keyId),
        eq(apiKeys.calendarId, calendarId),
        isNull(apiKeys.revokedAt),
      ),
    )
    .returning();

  if (!row) {
    return null;
  }

  const [creator] = row.createdBy
    ? await getDb()
        .select({
          id: schedulers.id,
          name: schedulers.name,
          email: schedulers.email,
        })
        .from(schedulers)
        .where(eq(schedulers.id, row.createdBy))
        .limit(1)
    : [];

  return toApiKeySummary(row, toCreator(creator?.id ?? null, creator?.name ?? null, creator?.email ?? null));
}

export async function deleteApiKey(
  calendarId: string,
  keyId: string,
): Promise<boolean> {
  const deleted = await getDb()
    .delete(apiKeys)
    .where(
      and(
        eq(apiKeys.id, keyId),
        eq(apiKeys.calendarId, calendarId),
      ),
    )
    .returning({ id: apiKeys.id });

  return deleted.length > 0;
}
