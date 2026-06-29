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
      const endsAt =
        new Date(req.startsAt).getTime() + req.durationMinutes * 60_000;
      if (endsAt <= Date.now()) {
        return { ok: false, code: "SLOT_UNAVAILABLE" };
      }

      const members = [...req.bundle.members].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      );
      const member = req.memberId
        ? members.find((m) => m.id === req.memberId)
        : members[0];

      if (!member) {
        return { ok: false, code: "SLOT_UNAVAILABLE" };
      }

      return { ok: true, member, eligibleMembers: members };
    },
  };
}
