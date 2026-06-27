import type { SalesforcePort } from "@/lib/ports/salesforce";

export function createSalesforceStub(): SalesforcePort {
  return {
    async lookupLeadOwner() {
      return { ok: false, code: "NOT_FOUND" };
    },
    async syncFieldMap() {
      return { ok: true };
    },
  };
}
