import type { LeadOwnerLookupResult } from "@/lib/ports/salesforce";
import type { SalesforceClient } from "./client";

export const LOOKUP_TIMEOUT_MS = 800;

type OwnerRecord = {
  Id?: string;
  Owner?: { Email?: string };
};

function parseOwnerRecord(
  records: Array<Record<string, unknown>>,
  recordType: "Lead" | "Contact",
): LeadOwnerLookupResult {
  const row = records[0] as OwnerRecord | undefined;
  const recordId = row?.Id;
  const ownerEmail = row?.Owner?.Email;
  if (!recordId || !ownerEmail) {
    return { ok: false, code: "NOT_FOUND" };
  }
  return { ok: true, ownerEmail, recordId, recordType };
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | "TIMEOUT"> {
  return Promise.race([
    promise,
    new Promise<"TIMEOUT">((resolve) => {
      setTimeout(() => resolve("TIMEOUT"), ms);
    }),
  ]);
}

export async function lookupLeadOwner(
  client: SalesforceClient,
  calendarId: string,
  email: string,
): Promise<LeadOwnerLookupResult> {
  const connection = await client.getConnection(calendarId);
  if (!connection) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const lookup = async (): Promise<LeadOwnerLookupResult> => {
    try {
      const leadResult = await client.queryByEmail(connection, "Lead", email);
      if (leadResult.records.length > 0) {
        return parseOwnerRecord(leadResult.records, "Lead");
      }

      const contactResult = await client.queryByEmail(connection, "Contact", email);
      if (contactResult.records.length > 0) {
        return parseOwnerRecord(contactResult.records, "Contact");
      }

      return { ok: false, code: "NOT_FOUND" };
    } catch {
      return { ok: false, code: "ERROR" };
    }
  };

  const result = await withTimeout(lookup(), LOOKUP_TIMEOUT_MS);
  if (result === "TIMEOUT") {
    return { ok: false, code: "TIMEOUT" };
  }
  return result;
}
