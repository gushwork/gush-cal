import type { EventsPort } from "@/lib/ports/events";

export function createEventsStub(): EventsPort {
  return {
    async emit() {},
    async scheduleRelativeTriggers() {},
  };
}
