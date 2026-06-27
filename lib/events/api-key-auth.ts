import { createHash, createHmac, randomBytes } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { apiKeys } from "@/lib/db/schema";

export function generateApiKey(): string {
  return `gw_${randomBytes(24).toString("base64url")}`;
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function signWebhookPayload(secret: string, rawBody: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export type ApiKeyAuthResult =
  | { ok: true; calendarId: string }
  | { ok: false; code: "UNAUTHORIZED" };

function parseBearerToken(
  headers: { authorization?: string | null },
): string | null {
  const header = headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

export async function authenticateApiKey(
  headers: { authorization?: string | null },
  calendarId: string,
): Promise<ApiKeyAuthResult> {
  const token = parseBearerToken(headers);
  if (!token) {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  const keyHash = hashApiKey(token);
  const [row] = await getDb()
    .select({ calendarId: apiKeys.calendarId, revokedAt: apiKeys.revokedAt })
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.keyHash, keyHash),
        eq(apiKeys.calendarId, calendarId),
        isNull(apiKeys.revokedAt),
      ),
    )
    .limit(1);

  if (!row) {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  void getDb()
    .update(apiKeys)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(apiKeys.keyHash, keyHash));

  return { ok: true, calendarId: row.calendarId };
}

export function requireApiKeyAuth(
  request: Request,
  calendarId: string,
): Promise<ApiKeyAuthResult> {
  return authenticateApiKey(
    { authorization: request.headers.get("authorization") },
    calendarId,
  );
}
