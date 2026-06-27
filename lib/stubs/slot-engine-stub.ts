import type {
  AssignMemberRequest,
  GetSlotsRequest,
  SlotEnginePort,
} from "@/lib/ports/slot-engine";

/**
 * Deterministic stub for tests and pre-SP-03 development.
 * - Returns one slot at rangeStart if any members exist
 * - assignMember picks first member by sortOrder
 */
export function createSlotEngineStub(): SlotEnginePort {
  return {
    async getAvailableSlots(req: GetSlotsRequest) {
      if (req.bundle.members.length === 0) {
        return [];
      }

      return [
        {
          startsAt: req.rangeStart,
          durationMinutes: req.durationMinutes,
          eligibleMemberCount: req.bundle.members.length,
        },
      ];
    },

    async assignMember(req: AssignMemberRequest) {
      const member = [...req.bundle.members].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      )[0];

      if (!member) {
        return { ok: false, code: "SLOT_UNAVAILABLE" };
      }

      return { ok: true, member, eligibleMembers: req.bundle.members };
    },
  };
}
