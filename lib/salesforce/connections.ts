import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { salesforceConnections } from "@/lib/db/schema";
import { seedDefaultFieldMaps } from "./field-map";

export type ConnectionStatus = {
  connected: boolean;
  instanceUrl?: string;
  connectedAt?: string;
};

export type SaveConnectionInput = {
  accessToken: string;
  refreshToken: string;
  instanceUrl: string;
};

export async function getConnectionStatus(
  calendarId: string,
): Promise<ConnectionStatus> {
  const [row] = await getDb()
    .select({
      instanceUrl: salesforceConnections.instanceUrl,
      connectedAt: salesforceConnections.connectedAt,
    })
    .from(salesforceConnections)
    .where(eq(salesforceConnections.calendarId, calendarId))
    .limit(1);

  if (!row) {
    return { connected: false };
  }

  return {
    connected: true,
    instanceUrl: row.instanceUrl,
    connectedAt: row.connectedAt,
  };
}

/** Tokens stored as-is; protect DB access (no ENCRYPTION_KEY pattern in repo yet). */
export async function saveConnection(
  calendarId: string,
  input: SaveConnectionInput,
): Promise<ConnectionStatus> {
  await getDb()
    .insert(salesforceConnections)
    .values({
      calendarId,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      instanceUrl: input.instanceUrl,
    })
    .onConflictDoUpdate({
      target: salesforceConnections.calendarId,
      set: {
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        instanceUrl: input.instanceUrl,
        connectedAt: new Date().toISOString(),
      },
    });

  await seedDefaultFieldMaps(calendarId);

  const status = await getConnectionStatus(calendarId);
  return status;
}

export async function disconnectSalesforce(calendarId: string): Promise<boolean> {
  const deleted = await getDb()
    .delete(salesforceConnections)
    .where(eq(salesforceConnections.calendarId, calendarId))
    .returning({ calendarId: salesforceConnections.calendarId });

  return deleted.length > 0;
}

export function buildOAuthAuthorizeUrl(calendarId: string, state: string): string {
  const clientId = process.env.SALESFORCE_CLIENT_ID ?? "";
  const redirectUri = getOAuthCallbackUrl(calendarId);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "api refresh_token",
  });
  const loginHost = process.env.SALESFORCE_LOGIN_URL ?? "https://login.salesforce.com";
  return `${loginHost}/services/oauth2/authorize?${params.toString()}`;
}

export function getOAuthCallbackUrl(calendarId: string): string {
  const base = process.env.APP_URL ?? "http://localhost:4000";
  return `${base}/api/calendars/${calendarId}/salesforce/connect`;
}

export async function exchangeOAuthCode(
  calendarId: string,
  code: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SaveConnectionInput> {
  const clientId = process.env.SALESFORCE_CLIENT_ID ?? "";
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET ?? "";
  const redirectUri = getOAuthCallbackUrl(calendarId);
  const loginHost = process.env.SALESFORCE_LOGIN_URL ?? "https://login.salesforce.com";

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  const res = await fetchImpl(`${loginHost}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth token exchange failed: ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    instance_url: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    instanceUrl: data.instance_url,
  };
}

export function isOAuthConfigured(): boolean {
  return Boolean(
    process.env.SALESFORCE_CLIENT_ID && process.env.SALESFORCE_CLIENT_SECRET,
  );
}

export function stubConnectionInput(): SaveConnectionInput {
  return {
    accessToken: "stub-access-token",
    refreshToken: "stub-refresh-token",
    instanceUrl: "https://stub.my.salesforce.com",
  };
}
