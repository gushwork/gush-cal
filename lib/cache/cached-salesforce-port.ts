import type { SalesforcePort } from "@/lib/ports/salesforce";
import { getCachedLeadOwner } from "./sf-owner-cache";

export function wrapSalesforceCache(inner: SalesforcePort): SalesforcePort {
  return {
    lookupLeadOwner(calendarId, email) {
      return getCachedLeadOwner(calendarId, email, () =>
        inner.lookupLeadOwner(calendarId, email),
      );
    },
    syncFieldMap(calendarId, eventType, payload) {
      return inner.syncFieldMap(calendarId, eventType, payload);
    },
  };
}
