import type { SlotEnginePort } from "@/lib/ports/slot-engine";
import { createAssignMember } from "./assign-member";
import { createGenerateSlots, type SlotEngineDeps } from "./generate-slots";

export type { SlotEngineDeps };

export function createSlotEnginePort(deps: SlotEngineDeps): SlotEnginePort {
  return {
    getAvailableSlots: createGenerateSlots(deps),
    assignMember: createAssignMember(deps),
  };
}

export { effectiveCaps } from "./cap-limits";
export { isWithinWorkingHours, effectiveWorkingHours } from "./working-hours";
