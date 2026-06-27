import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { salesforceConnections } from "@/lib/db/schema";

export const SF_API_VERSION = "v59.0";

export type SalesforceConnectionRow = {
  calendarId: string;
  accessToken: string;
  refreshToken: string;
  instanceUrl: string;
  connectedAt: string;
};

export type FetchFn = typeof fetch;

export type SalesforceClientDeps = {
  fetch?: FetchFn;
  clientId?: string;
  clientSecret?: string;
};

function escapeSoql(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function createSalesforceClient(deps: SalesforceClientDeps = {}) {
  const fetchImpl = deps.fetch ?? fetch;
  const clientId = deps.clientId ?? process.env.SALESFORCE_CLIENT_ID ?? "";
  const clientSecret = deps.clientSecret ?? process.env.SALESFORCE_CLIENT_SECRET ?? "";

  async function getConnection(
    calendarId: string,
  ): Promise<SalesforceConnectionRow | null> {
    const [row] = await getDb()
      .select()
      .from(salesforceConnections)
      .where(eq(salesforceConnections.calendarId, calendarId))
      .limit(1);
    return row ?? null;
  }

  async function refreshAccessToken(
    connection: SalesforceConnectionRow,
  ): Promise<SalesforceConnectionRow> {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refreshToken,
    });

    const res = await fetchImpl(`${connection.instanceUrl}/services/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Salesforce token refresh failed: ${text}`);
    }

    const data = (await res.json()) as { access_token: string; instance_url?: string };
    const accessToken = data.access_token;
    const instanceUrl = data.instance_url ?? connection.instanceUrl;

    await getDb()
      .update(salesforceConnections)
      .set({ accessToken, instanceUrl })
      .where(eq(salesforceConnections.calendarId, connection.calendarId));

    return { ...connection, accessToken, instanceUrl };
  }

  async function sfRequest(
    connection: SalesforceConnectionRow,
    path: string,
    init?: RequestInit,
    retried = false,
  ): Promise<Response> {
    const url = path.startsWith("http")
      ? path
      : `${connection.instanceUrl}/services/data/${SF_API_VERSION}${path}`;

    const res = await fetchImpl(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    if (res.status === 401 && !retried) {
      const refreshed = await refreshAccessToken(connection);
      return sfRequest(refreshed, path, init, true);
    }

    return res;
  }

  async function query(
    connection: SalesforceConnectionRow,
    soql: string,
  ): Promise<{ records: Array<Record<string, unknown>> }> {
    const res = await sfRequest(
      connection,
      `/query?q=${encodeURIComponent(soql)}`,
      { method: "GET" },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Salesforce query failed: ${text}`);
    }
    return (await res.json()) as { records: Array<Record<string, unknown>> };
  }

  async function queryByEmail(
    connection: SalesforceConnectionRow,
    objectName: "Lead" | "Contact",
    email: string,
  ): Promise<{ records: Array<Record<string, unknown>> }> {
    const escaped = escapeSoql(email);
    const soql = `SELECT Id, Owner.Email FROM ${objectName} WHERE Email = '${escaped}' LIMIT 1`;
    return query(connection, soql);
  }

  async function createRecord(
    connection: SalesforceConnectionRow,
    objectApiName: string,
    body: Record<string, unknown>,
  ): Promise<{ id: string }> {
    const res = await sfRequest(connection, `/sobjects/${objectApiName}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }
    return (await res.json()) as { id: string };
  }

  async function patchRecord(
    connection: SalesforceConnectionRow,
    objectApiName: string,
    recordId: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    const res = await sfRequest(
      connection,
      `/sobjects/${objectApiName}/${recordId}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }
  }

  return {
    getConnection,
    query,
    queryByEmail,
    createRecord,
    patchRecord,
    sfRequest,
    escapeSoql,
  };
}

export type SalesforceClient = ReturnType<typeof createSalesforceClient>;
