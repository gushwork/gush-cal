import type { RoutingPort } from "@/lib/ports/routing";

export function createRoutingStub(): RoutingPort {
  return {
    async resolveBookingTarget() {
      return { ok: false, code: "CALENDAR_NOT_FOUND" };
    },
  };
}
