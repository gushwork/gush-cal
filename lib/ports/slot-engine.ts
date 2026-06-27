import type {
  CalendarBundle,
  CalendarMember,
  IanaTimezone,
  Slot,
  UtcInstant,
} from "@/lib/types";
import type { CalendarSchedulingSettings } from "@/lib/types/platform";

export type SlotBookingPolicy = "guest" | "admin" | "none";

export type GetSlotsRequest = {
  bundle: CalendarBundle;
  durationMinutes: number;
  rangeStart: UtcInstant;
  rangeEnd: UtcInstant;
  viewerTimezone: IanaTimezone;
  /**
   * - guest: booking window + no past slots (public booking)
   * - admin: same as guest (scheduler availability preview)
   * - none: past cutoff only (tests)
   */
  bookingPolicy?: SlotBookingPolicy;
  teamId?: string;
  memberId?: string;
};

export type AssignMemberRequest = {
  bundle: CalendarBundle;
  startsAt: UtcInstant;
  durationMinutes: number;
  viewerTimezone: IanaTimezone;
  teamId?: string;
  memberId?: string;
  scheduling: CalendarSchedulingSettings;
};

export type AssignMemberResult =
  | { ok: true; member: CalendarMember; eligibleMembers: CalendarMember[] }
  | { ok: false; code: "SLOT_UNAVAILABLE" };

export interface SlotEnginePort {
  getAvailableSlots(req: GetSlotsRequest): Promise<Slot[]>;
  assignMember(req: AssignMemberRequest): Promise<AssignMemberResult>;
}
