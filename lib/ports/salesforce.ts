import type { SalesforceEventType } from "@/lib/types/platform";

export type LeadOwnerLookupResult =
  | {
      ok: true;
      ownerEmail: string;
      recordId: string;
      recordType: "Lead" | "Contact";
    }
  | { ok: false; code: "NOT_FOUND" | "TIMEOUT" | "ERROR" };

export interface SalesforcePort {
  lookupLeadOwner(
    calendarId: string,
    email: string,
  ): Promise<LeadOwnerLookupResult>;
  syncFieldMap(
    calendarId: string,
    eventType: SalesforceEventType,
    payload: Record<string, unknown>,
  ): Promise<{ ok: boolean; error?: string }>;
}
